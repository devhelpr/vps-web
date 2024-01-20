import {
  Camera,
  getCamera,
  setCamera,
  transformCameraSpaceToWorldSpace,
} from '../camera';
import { LineConnection } from '../components/line-connection';
import { NodeTransformer } from '../components/node-transformer';
import { QuadraticBezierConnection } from '../components/quadratic-bezier-connection';
import { CubicBezierConnection } from '../components/qubic-bezier-connection';
import { Rect } from '../components/rect';
import { RectThumb } from '../components/rect-thumb';
import { CLICK_MOVEMENT_THRESHOLD } from '../constants';
import {
  InteractionEvent,
  InteractionState,
  InteractionStateMachine,
  createInteractionStateMachine,
} from '../interaction-state-machine';
import { INodeComponent, IRectNodeComponent, IThumb } from '../interfaces';
import { setSelectNode } from '../reactivity';
import { NodeType } from '../types';
import { createElement, createElementMap, createNSElement } from '../utils';
import { CommandHandler } from '../interfaces/command-handler';
import {
  SetNodeStatedHandler,
  GetNodeStatedHandler,
} from '../interfaces/node-state-handlers';

export const createCanvasApp = <T>(
  rootElement: HTMLElement,
  disableInteraction?: boolean,
  disableZoom?: boolean,
  backgroundColor?: string,
  interactionStateMachineInstance?: InteractionStateMachine<T>
) => {
  const interactionStateMachine =
    interactionStateMachineInstance ?? createInteractionStateMachine<T>();
  const elements = createElementMap<T>();

  const variables: Record<
    string,
    {
      id: string;
      getData: (parameter?: any, scopeId?: string) => any;
      setData: (data: any, scopeId?: string) => void;
      initializeDataStructure?: (structureInfo: any, scopeId?: string) => void;
      removeScope: (scopeId: string) => void;
    }
  > = {};
  const variableObservers: Map<
    string,
    Map<string, (data: any) => void>
  > = new Map();

  const commandHandlers: Record<string, CommandHandler> = {};
  const nodeSetStateHandlers: Record<string, SetNodeStatedHandler> = {};
  const nodeGetStateHandlers: Record<string, GetNodeStatedHandler> = {};

  const tempVariables: Record<string, any> = {};

  const isMacOs =
    typeof navigator !== 'undefined' &&
    navigator?.userAgent?.indexOf('Mac') >= 0;

  let scaleCamera = 1;
  let xCamera = 0;
  let yCamera = 0;
  let isClicking = false;
  let isMoving = false;
  let wasMoved = false;
  let startTime = 0;

  let startDragX = 0;
  let startDragY = 0;

  let startClientDragX = 0;
  let startClientDragY = 0;
  let onClickCanvas: ((x: number, y: number) => void) | undefined = undefined;
  let onCanvasUpdated: (() => void) | undefined = undefined;
  let onCameraChanged: ((camera: Camera) => void) | undefined = undefined;
  let onWheelEvent:
    | ((x: number, y: number, scale: number) => void)
    | undefined = undefined;

  let onDragCanvasEvent: ((x: number, y: number) => void) | undefined =
    undefined;

  const canvas = createElement<T>(
    'div',
    {
      id: 'canvas',
      class: `w-full h-full origin-top-left ${
        backgroundColor ?? 'bg-slate-800'
      } flex-auto relative z-10 transition-none transform-gpu`,
    },
    rootElement
  );

  const nodeTransformer = new NodeTransformer(
    canvas.domElement,
    interactionStateMachine
  );

  const setCameraPosition = (x: number, y: number) => {
    if (canvas.domElement) {
      const diffX = x - startClientDragX;
      const diffY = y - startClientDragY;

      xCamera = startDragX + diffX;
      yCamera = startDragY + diffY;

      setCamera(xCamera, yCamera, scaleCamera);
      nodeTransformer.updateCamera();
      if (onCameraChanged) {
        onCameraChanged({ x: xCamera, y: yCamera, scale: scaleCamera });
      }

      (canvas.domElement as unknown as HTMLElement).style.transform =
        'translate(' +
        xCamera +
        'px,' +
        yCamera +
        'px) ' +
        'scale(' +
        scaleCamera +
        ',' +
        scaleCamera +
        ') ';
    }
  };

  rootElement.addEventListener(
    'contextmenu',
    function (event) {
      //event.preventDefault();
      console.log('contextmenu canvas', event.target, canvas.domElement);
      interactionStateMachine.reset();
      //return false;
    },
    false
  );

  rootElement.addEventListener('pointerdown', (event: PointerEvent) => {
    console.log('pointerdown canvas', event.target, canvas.domElement);
    if (disableInteraction) {
      return;
    }

    if (
      ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].indexOf(
        (event.target as HTMLElement)?.tagName
      ) >= 0 ||
      (event.target !== rootElement && event.target !== canvas.domElement)
    ) {
      if (
        !(event.target as unknown as any).closest ||
        !(event.target as unknown as any).closest('#canvas')
      ) {
        isClicking = false;
        isMoving = false;
        wasMoved = false;
        return;
      }
    }

    isClicking = true;
    isMoving = false;
    wasMoved = false;
    startTime = Date.now();
  });

  if (!disableInteraction) {
    rootElement.addEventListener('pointermove', (event: PointerEvent) => {
      if (disableInteraction) {
        return;
      }
      //const canvasRect = canvas.domElement.getBoundingClientRect();
      if (
        ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].indexOf(
          (event.target as HTMLElement)?.tagName
        ) >= 0 ||
        (event.target !== rootElement && event.target !== canvas.domElement)
      ) {
        if (
          !(event.target as unknown as any).closest ||
          !(event.target as unknown as any).closest('#canvas')
        ) {
          return;
        }
      }

      if (isClicking) {
        isMoving = true;
        wasMoved = true;
      }
      if (Date.now() - startTime < CLICK_MOVEMENT_THRESHOLD) {
        //return;
      }
      let currentState = interactionStateMachine.getCurrentInteractionState();

      if (
        currentState.state === InteractionState.Idle &&
        isClicking &&
        !disableZoom
      ) {
        startClientDragX = event.clientX;
        startClientDragY = event.clientY;
        startDragX = xCamera;
        startDragY = yCamera;
        console.log('dragging canvas', canvas.id, event.target);
        interactionStateMachine.interactionEventState(
          InteractionEvent.PointerDown,
          {
            id: canvas.id,
            type: 'Canvas',
            interactionInfo: {
              xOffsetWithinElementOnFirstClick: 0,
              yOffsetWithinElementOnFirstClick: 0,
            },
          },
          canvas as unknown as INodeComponent<T>
        );
        currentState = interactionStateMachine.getCurrentInteractionState();
      }
      if (
        currentState.state === InteractionState.Moving &&
        currentState.element &&
        currentState.target
      ) {
        const interactionState = interactionStateMachine.interactionEventState(
          InteractionEvent.PointerMove,
          currentState.target,
          currentState.element
        );

        if (interactionState) {
          if (interactionState.target?.id === canvas.id) {
            setCameraPosition(event.clientX, event.clientY);
            if (onDragCanvasEvent) {
              onDragCanvasEvent(xCamera, yCamera);
            }
          } else {
            const { x, y } = transformCameraSpaceToWorldSpace(
              event.clientX,
              event.clientY
            );

            currentState.target.pointerMove &&
              currentState.target.pointerMove<T>(
                x,
                y,
                currentState.element,
                canvas,
                currentState.target.interactionInfo,
                interactionStateMachine
              );

            if (onCameraChanged) {
              onCameraChanged(getCamera());
            }
          }
        }
      }
    });
    rootElement.addEventListener('pointerup', (event: PointerEvent) => {
      if (disableInteraction) {
        return;
      }
      const currentState = interactionStateMachine.getCurrentInteractionState();
      if (
        currentState.state === InteractionState.Moving &&
        currentState.element &&
        currentState.target
      ) {
        const interactionState = interactionStateMachine.interactionEventState(
          InteractionEvent.PointerUp,
          currentState.target,
          currentState.element,
          true
        );
        if (interactionState) {
          if (currentState.target?.id === canvas.id) {
            setCameraPosition(event.clientX, event.clientY);

            interactionStateMachine.interactionEventState(
              InteractionEvent.PointerUp,
              currentState.target,
              currentState.element
            );
            console.log('pointerup canvas', isMoving, wasMoved);
            if (!wasMoved) {
              setSelectNode(undefined);
            }
          } else {
            const { x, y } = transformCameraSpaceToWorldSpace(
              event.clientX,
              event.clientY
            );

            currentState.target.pointerUp &&
              currentState.target.pointerUp<T>(
                x,
                y,
                currentState.element,
                canvas,
                currentState.target.interactionInfo,
                interactionStateMachine
              );
          }
        }
      } else {
        if (
          !isMoving &&
          isClicking
          // ||
          // (isClicking &&
          //   isMoving &&
          //   Date.now() - startTime < CLICK_MOVEMENT_THRESHOLD)
        ) {
          console.log(
            'click canvas',
            event.target,
            isMoving,
            Date.now() - startTime
          );

          // comment this to keep the selected id after clicking in the menu .. side effects?
          //setSelectNode(undefined);

          // if (onClickCanvas) {
          //   const mousePointTo = {
          //     x: event.clientX / scaleCamera - xCamera / scaleCamera,
          //     y: event.clientY / scaleCamera - yCamera / scaleCamera,
          //   };
          //   onClickCanvas(mousePointTo.x, mousePointTo.y);
          // }
        }
      }
      isMoving = false;
      isClicking = false;
    });
    rootElement.addEventListener('pointerleave', (event: PointerEvent) => {
      if (disableInteraction) {
        return;
      }

      isMoving = false;
      isClicking = false;
      wasMoved = false;

      const currentState = interactionStateMachine.getCurrentInteractionState();
      console.log('pointerleave canvas', event, currentState, canvas.id);
      if (currentState?.canvasNode?.id === undefined || !event.target) {
        console.log('pointerleave reset');
        interactionStateMachine.reset();
      } else if (currentState.canvasNode?.id !== canvas.id) {
        return;
      }
      if (
        currentState.state === InteractionState.Moving &&
        currentState.element &&
        currentState.target
      ) {
        const interactionState = interactionStateMachine.interactionEventState(
          InteractionEvent.PointerLeave,
          currentState.target,
          currentState.element
        );

        if (interactionState) {
          if (currentState.target?.id === canvas.id) {
            //
          } else if (
            currentState.element?.parent?.containerNode?.domElement ===
            event.target
          ) {
            //
          } else {
            const canvasRect = (
              canvas.domElement as unknown as HTMLElement | SVGElement
            ).getBoundingClientRect();
            const { x, y } = transformCameraSpaceToWorldSpace(
              event.clientX - canvasRect.x,
              event.clientY - canvasRect.y
            );
            console.log(
              'POINTER LEAVE CANVAS',
              event,
              currentState.target,
              currentState.element,
              'Ids',
              currentState.element?.parent?.containerNode?.id,
              currentState.target?.id
            );

            currentState.target.pointerUp &&
              currentState.target.pointerUp<T>(
                x,
                y,
                currentState.element,
                canvas,
                currentState.target.interactionInfo,
                interactionStateMachine
              );
          }
        }
      }
    });

    let wheelTime = -1;
    if (!disableZoom) {
      rootElement.addEventListener('wheel', (event: WheelEvent) => {
        if (disableInteraction) {
          return;
        }
        event.preventDefault();

        if (wheelTime === -1) {
          wheelTime = event.timeStamp;
        }
        let timeDiff = event.timeStamp - wheelTime;
        if (event.shiftKey) {
          timeDiff = timeDiff * 16;
        }
        //isMacOs

        // const delta = Math.max(
        //   -1,
        //   Math.min(1, (event as unknown as any).wheelDelta || -event.detail)
        // );

        const factor = event.ctrlKey
          ? isMacOs
            ? 350
            : 50
          : isMacOs
          ? 150
          : 20;

        const delta =
          -event.deltaY *
          (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) *
          factor;

        // Determine the scale factor for the zoom
        const scaleFactor = 1 + delta * 0.05;

        const scaleBy = scaleFactor;

        if (canvas.domElement) {
          const mousePointTo = {
            x: event.clientX / scaleCamera - xCamera / scaleCamera,
            y: event.clientY / scaleCamera - yCamera / scaleCamera,
          };

          let newScale = scaleCamera * scaleBy;
          if (newScale < 0.05) {
            newScale = 0.05;
          } else if (newScale > 5) {
            newScale = 5;
          }

          const newPos = {
            x: -(mousePointTo.x - event.clientX / newScale) * newScale,
            y: -(mousePointTo.y - event.clientY / newScale) * newScale,
          };

          // scaleCamera = scaleCamera * scaleBy;
          // if (scaleCamera < 0.05) {
          //   scaleCamera = 0.05;
          // } else if (scaleCamera > 5) {
          //   scaleCamera = 5;
          // }

          // const newPos = {
          //   x: -(mousePointTo.x - event.clientX / scaleCamera) * scaleCamera,
          //   y: -(mousePointTo.y - event.clientY / scaleCamera) * scaleCamera,
          // };

          // xCamera = newPos.x;
          // yCamera = newPos.y;

          // setCamera(xCamera, yCamera, scaleCamera);
          // nodeTransformer.updateCamera();
          // if (onCameraChanged) {
          //   onCameraChanged({ x: xCamera, y: yCamera, scale: scaleCamera });
          // }

          // (canvas.domElement as unknown as HTMLElement).style.transform =
          //   'translate(' +
          //   xCamera +
          //   'px,' +
          //   yCamera +
          //   'px) ' +
          //   'scale(' +
          //   scaleCamera +
          //   ',' +
          //   scaleCamera +
          //   ') ';

          // if (onWheelEvent) {
          //   onWheelEvent(xCamera, yCamera, scaleCamera);
          // }

          if (onWheelEvent) {
            onWheelEvent(newPos.x, newPos.y, newScale);
          }
        }
        return false;
      });
    }

    rootElement.addEventListener('click', (event: MouseEvent) => {
      console.log(
        'click canvas (click event)',
        wasMoved,
        isMoving,
        event.target
      );
      if (disableInteraction) {
        return false;
      }
      const tagName = (event.target as HTMLElement)?.tagName;

      if (
        !wasMoved &&
        onClickCanvas &&
        ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].indexOf(tagName) < 0
      ) {
        if (
          // isClicking
          (!wasMoved && event.target === rootElement) ||
          event.target === canvas.domElement
        ) {
          console.log('rootElement click', event.target, tagName);
          event.preventDefault();
          const mousePointTo = {
            x: event.clientX / scaleCamera - xCamera / scaleCamera,
            y: event.clientY / scaleCamera - yCamera / scaleCamera,
          };
          onClickCanvas(mousePointTo.x, mousePointTo.y);
          nodeTransformer.detachNode();

          return false;
        }
      }

      return true;
    });
  }

  const hiddenSVG = createNSElement(
    'svg',
    {
      width: 0,
      height: 0,
      style: {
        visibility: 'hidden',
        position: 'absolute',
      },
    },
    canvas.domElement
  );

  const pathHiddenElement = createNSElement<T>(
    'path',
    {
      class: 'pointer-events-auto',
    },
    hiddenSVG.domElement
  );

  // const getCurrentScope = () => {
  //   return scopeStack.length > 0 ? scopeStack[scopeStack.length - 1] : '';
  // };
  return {
    elements,
    canvas,
    rootElement,
    interactionStateMachine,
    nodeTransformer,
    getOnCanvasUpdated: () => {
      return onCanvasUpdated;
    },
    setOnCanvasUpdated: (onCanvasUpdatedHandler: () => void) => {
      onCanvasUpdated = onCanvasUpdatedHandler;
    },
    setOnCanvasClick: (
      onClickCanvasHandler: (x: number, y: number) => void
    ) => {
      onClickCanvas = onClickCanvasHandler;
    },
    resetNodeTransform: () => {
      nodeTransformer.detachNode();
    },
    setOnCameraChanged: (
      onCameraChangedHandler: (camera: {
        x: number;
        y: number;
        scale: number;
      }) => void
    ) => {
      onCameraChanged = onCameraChangedHandler;
    },
    getCamera: () => {
      return {
        x: xCamera,
        y: yCamera,
        scale: scaleCamera,
      };
    },
    setCamera: (x: number, y: number, scale: number) => {
      xCamera = x;
      yCamera = y;
      scaleCamera = scale;

      setCamera(xCamera, yCamera, scaleCamera);
      nodeTransformer.updateCamera();

      if (onCameraChanged) {
        onCameraChanged({ x: xCamera, y: yCamera, scale: scaleCamera });
      }

      (canvas.domElement as unknown as HTMLElement).style.transform =
        'translate(' +
        xCamera +
        'px,' +
        yCamera +
        'px) ' +
        'scale(' +
        scaleCamera +
        ',' +
        scaleCamera +
        ') ';
    },
    transformCameraSpaceToWorldSpace: (x: number, y: number) => {
      return transformCameraSpaceToWorldSpace(x, y);
    },
    centerCamera: () => {
      console.log('centerCamera');
      let minX: number | undefined = undefined;
      let minY: number | undefined = undefined;
      let maxX: number | undefined = undefined;
      let maxY: number | undefined = undefined;
      elements.forEach((element) => {
        const elementHelper = element as unknown as INodeComponent<T>;
        if (
          elementHelper.nodeType === NodeType.Shape &&
          elementHelper.width !== undefined &&
          elementHelper.height !== undefined
        ) {
          //console.log('element', element);
          if (minX === undefined || elementHelper.x < minX) {
            minX = elementHelper.x;
          }
          if (minY === undefined || elementHelper.y < minY) {
            minY = elementHelper.y;
          }
          if (
            maxX === undefined ||
            elementHelper.x + elementHelper.width > maxX
          ) {
            maxX = elementHelper.x + elementHelper.width;
          }
          if (
            maxY === undefined ||
            elementHelper.y + elementHelper.height > maxY
          ) {
            maxY = elementHelper.y + elementHelper.height;
          }
        }
      });

      if (
        minX !== undefined &&
        minY !== undefined &&
        maxX !== undefined &&
        maxY !== undefined
      ) {
        const rootWidth = rootElement.clientWidth;
        const rootHeight = rootElement.clientHeight;

        const helperWidth = maxX - minX;
        const helperScale = rootWidth / helperWidth;

        const width = maxX - minX + 120 / helperScale;
        const height = maxY - minY;
        const scale = rootWidth / width;

        console.log(
          'centerCamera x',
          minX,
          maxX,
          'width',
          width,
          'rootWidth',
          rootWidth
        );

        console.log(
          'centerCamera y',
          minY,
          maxY,
          'height',
          height,
          'rootHeight',
          rootHeight
        );
        xCamera =
          rootWidth / 2 -
          (scale * width) / 2 -
          scale * (minX - 60 / helperScale);
        yCamera = rootHeight / 2 - (scale * height) / 2 - scale * minY;
        scaleCamera = scale;

        console.log('centerCamera', xCamera, yCamera, scaleCamera);
      }

      setCamera(xCamera, yCamera, scaleCamera);
      nodeTransformer.updateCamera();
      if (onCameraChanged) {
        onCameraChanged({ x: xCamera, y: yCamera, scale: scaleCamera });
      }

      (canvas.domElement as unknown as HTMLElement).style.transform =
        'translate(' +
        xCamera +
        'px,' +
        yCamera +
        'px) ' +
        'scale(' +
        scaleCamera +
        ',' +
        scaleCamera +
        ') ';

      if (onWheelEvent) {
        onWheelEvent(xCamera, yCamera, scaleCamera);
      }
    },
    selectNode: (nodeComponent: IRectNodeComponent<T>) => {
      if (!nodeComponent) {
        return;
      }
      setSelectNode({
        id: nodeComponent.id,
        containerNode:
          nodeComponent.containerNode as unknown as IRectNodeComponent<unknown>,
      });
      nodeTransformer.attachNode(nodeComponent);
    },
    deselectNode: () => {
      setSelectNode(undefined);
      nodeTransformer.detachNode();
    },
    createRect: (
      x: number,
      y: number,
      width: number,
      height: number,
      text?: string,
      thumbs?: IThumb[],
      markup?: string | INodeComponent<T>,
      layoutProperties?: {
        classNames?: string;
      },
      hasStaticWidthHeight?: boolean,
      disableInteraction?: boolean,
      disableManualResize?: boolean,
      id?: string,
      nodeInfo?: T,
      containerNode?: IRectNodeComponent<T>,
      isStaticPosition?: boolean
    ) => {
      const rectInstance = new Rect<T>(
        canvas as unknown as INodeComponent<T>,
        interactionStateMachine,
        nodeTransformer as unknown as NodeTransformer<T>,
        pathHiddenElement,
        elements,
        x,
        y,
        width,
        height,
        text,
        thumbs,
        markup,
        layoutProperties,
        hasStaticWidthHeight,
        disableInteraction,
        disableManualResize,
        onCanvasUpdated,
        id,
        containerNode,
        isStaticPosition
      );
      if (!rectInstance || !rectInstance.nodeComponent) {
        throw new Error('rectInstance is undefined');
      }
      rectInstance.nodeComponent.nodeInfo = nodeInfo;
      if (onCanvasUpdated) {
        onCanvasUpdated();
      }
      return rectInstance;
    },
    createRectThumb: (
      x: number,
      y: number,
      width: number,
      height: number,
      text?: string,
      thumbs?: IThumb[],
      markup?: string | INodeComponent<T>,
      layoutProperties?: {
        classNames?: string;
      },
      hasStaticWidthHeight?: boolean,
      disableInteraction?: boolean,
      disableManualResize?: boolean,
      id?: string,
      nodeInfo?: T,
      containerNode?: IRectNodeComponent<T>,
      isStaticPosition?: boolean,
      isCircle?: boolean,
      createStraightLineConnection?: boolean
    ) => {
      const rectInstance = new RectThumb<T>(
        canvas as unknown as INodeComponent<T>,
        interactionStateMachine,
        nodeTransformer as unknown as NodeTransformer<T>,
        pathHiddenElement,
        elements,
        x,
        y,
        width,
        height,
        text,
        thumbs,
        markup,
        layoutProperties,
        hasStaticWidthHeight,
        disableInteraction,
        disableManualResize,
        onCanvasUpdated,
        id,
        containerNode,
        isStaticPosition,
        isCircle,
        createStraightLineConnection
      );
      if (!rectInstance || !rectInstance.nodeComponent) {
        throw new Error('rectInstance is undefined');
      }
      rectInstance.nodeComponent.nodeInfo = nodeInfo;
      if (onCanvasUpdated) {
        onCanvasUpdated();
      }
      return rectInstance;
    },
    createCubicBezier: (
      startX?: number,
      startY?: number,
      endX?: number,
      endY?: number,
      controlPointX1?: number,
      controlPointY1?: number,
      controlPointX2?: number,
      controlPointY2?: number,
      isControlled?: boolean,
      isDashed = false,
      id?: string,
      containerNode?: IRectNodeComponent<T>
    ) => {
      const curve = new CubicBezierConnection<T>(
        canvas as unknown as INodeComponent<T>,
        interactionStateMachine,
        pathHiddenElement,
        elements,
        startX ?? 0,
        startY ?? 0,
        endX ?? 0,
        endY ?? 0,
        controlPointX1 ?? 0,
        controlPointY1 ?? 0,
        controlPointX2 ?? 0,
        controlPointY2 ?? 0,
        isControlled,
        isDashed,
        onCanvasUpdated,
        id,
        containerNode
      );
      if (onCanvasUpdated) {
        onCanvasUpdated();
      }
      return curve;
    },
    createQuadraticBezier: (
      startX?: number,
      startY?: number,
      endX?: number,
      endY?: number,
      controlPointX?: number,
      controlPointY?: number,
      isControlled?: boolean,
      isDashed = false,
      id?: string,
      containerNode?: IRectNodeComponent<T>
    ) => {
      const curve = new QuadraticBezierConnection<T>(
        canvas as unknown as INodeComponent<T>,
        interactionStateMachine,
        pathHiddenElement,
        elements,
        startX ?? 0,
        startY ?? 0,
        endX ?? 0,
        endY ?? 0,
        controlPointX ?? 0,
        controlPointY ?? 0,
        isControlled,
        isDashed,
        onCanvasUpdated,
        id,
        containerNode
      );
      if (onCanvasUpdated) {
        onCanvasUpdated();
      }
      return curve;
    },
    createLine: (
      startX?: number,
      startY?: number,
      endX?: number,
      endY?: number,
      isControlled?: boolean,
      isDashed = false,
      id?: string,
      containerNode?: IRectNodeComponent<T>
    ) => {
      const line = new LineConnection<T>(
        canvas as unknown as INodeComponent<T>,
        interactionStateMachine,
        pathHiddenElement,
        elements,
        startX ?? 0,
        startY ?? 0,
        endX ?? 0,
        endY ?? 0,
        0,
        0,
        isControlled,
        isDashed,
        onCanvasUpdated,
        id,
        containerNode
      );
      if (onCanvasUpdated) {
        onCanvasUpdated();
      }
      return line;
    },
    deleteElementFromNode: (
      element: INodeComponent<T>,
      child: INodeComponent<T>,
      noCanvasUpdated = false
    ) => {
      if (element && child) {
        element.elements.delete(child.id);
        element.domElement.removeChild(child.domElement);

        if (onCanvasUpdated && !noCanvasUpdated) {
          onCanvasUpdated();
        }
      }
    },
    setOnWheelEvent: (
      onWheelEventHandler: (x: number, y: number, scale: number) => void
    ) => {
      onWheelEvent = onWheelEventHandler;
    },
    setonDragCanvasEvent: (
      onDragCanvasEventHandler: (x: number, y: number) => void
    ) => {
      onDragCanvasEvent = onDragCanvasEventHandler;
    },
    registerVariable: (
      variableName: string,
      variable: {
        id: string;
        getData: () => any;
        setData: (data: any) => void;
        initializeDataStructure?: (structureInfo: any) => void;
        removeScope: (scopeId: string) => void;
      }
    ) => {
      if (variableName && variable.id) {
        variables[variableName] = variable;
      }
    },
    registerTempVariable: (
      variableName: string,
      data: any,
      scopeId: string
    ) => {
      if (!tempVariables[scopeId]) {
        tempVariables[scopeId] = {};
      }
      tempVariables[scopeId][variableName] = data;
    },
    unregisterVariable: (variableName: string, id: string) => {
      if (
        id &&
        variableName &&
        variables[variableName] &&
        variables[variableName].id === id
      ) {
        delete variables[variableName];
      }
    },
    getVariable: (variableName: string, parameter?: any, scopeId?: string) => {
      if (
        variableName &&
        scopeId &&
        tempVariables[scopeId] &&
        tempVariables[scopeId][variableName]
      ) {
        return tempVariables[scopeId][variableName];
      }
      if (variableName && variables[variableName]) {
        return variables[variableName].getData(parameter, scopeId);
      }
      return false;
    },
    getVariableInfo: (variableName: string, scopeId?: string) => {
      if (scopeId && tempVariables[scopeId][variableName]) {
        return {
          [variableName]: {
            id: variableName,
          },
          data: tempVariables[scopeId][variableName],
        };
      }

      if (variableName && variables[variableName]) {
        return {
          ...variables[variableName],
          data: variables[variableName].getData(undefined, scopeId),
        };
      }
      return false;
    },
    setVariable: (variableName: string, data: any, scopeId?: string) => {
      if (scopeId && tempVariables[scopeId][variableName]) {
        tempVariables[scopeId][variableName] = data;
      } else if (variableName && variables[variableName]) {
        variables[variableName].setData(data, scopeId);

        const map = variableObservers.get(`${variableName}`);
        if (map) {
          map.forEach((observer) => {
            observer(data);
          });
        }
      }
    },
    getVariables: (scopeId?: string) => {
      const result: Record<string, any> = {};
      Object.entries(variables).forEach(([key, value]) => {
        if (key) {
          result[key] = value.getData(undefined, scopeId);
        }
      });
      return result;
    },
    getVariableNames: (scopeId?: string) => {
      if (scopeId) {
        return [
          ...Object.keys(variables),
          ...Object.keys(tempVariables[scopeId] ?? {}),
        ];
      }
      return Object.keys(variables);
    },
    initializeVariableDataStructure: (
      variableName: string,
      structureInfo: any,
      scopeId?: string
    ) => {
      if (variableName && variables[variableName]) {
        const variable = variables[variableName];
        if (variable.initializeDataStructure) {
          variable.initializeDataStructure(structureInfo, scopeId);
        }
      }
    },
    observeVariable: (
      nodeId: string,
      variableName: string,
      updated: (data: any) => void
    ) => {
      let map = variableObservers.get(`${variableName}`);
      if (!map) {
        map = new Map();
        variableObservers.set(`${variableName}`, map);
      }
      map.set(`${nodeId}`, updated);
    },
    removeObserveVariable: (nodeId: string, variableName: string) => {
      const map = variableObservers.get(`${variableName}`);
      if (map) {
        map.delete(`${nodeId}`);
      }
    },
    removeScope: (scopeId: string) => {
      if (scopeId) {
        const keys = Object.keys(variables);
        keys.forEach((key) => {
          const variable = variables[key];
          variable.removeScope(scopeId);
        });

        if (tempVariables[scopeId]) {
          delete tempVariables[scopeId];
        }
      }
    },
    registerCommandHandler: (name: string, handler: CommandHandler) => {
      commandHandlers[name] = handler;
    },
    unregisterCommandHandler: (name: string) => {
      delete commandHandlers[name];
    },
    registeGetNodeStateHandler: (
      name: string,
      handler: GetNodeStatedHandler
    ) => {
      nodeGetStateHandlers[name] = handler;
    },
    unRegisteGetNodeStateHandler: (name: string) => {
      delete nodeGetStateHandlers[name];
    },
    registeSetNodeStateHandler: (
      name: string,
      handler: SetNodeStatedHandler
    ) => {
      nodeSetStateHandlers[name] = handler;
    },
    unRegisteSetNodeStateHandler: (name: string) => {
      delete nodeSetStateHandlers[name];
    },
    getNodeStates: () => {
      const result: Map<string, any> = new Map();
      Object.entries(nodeGetStateHandlers).forEach(([key, getHandler]) => {
        if (key) {
          const nodeState = getHandler();
          result.set(nodeState.id, nodeState.data);
        }
      });
      return result;
    },
    setNodeStates: (nodeStates: Map<string, any>) => {
      nodeStates.forEach((data, id) => {
        const setHandler = nodeSetStateHandlers[id];
        if (setHandler) {
          setHandler(id, data);
        }
      });
    },

    executeCommandOnCommandHandler: (
      name: string,
      commandName: string,
      data: any
    ) => {
      if (commandHandlers[name]) {
        commandHandlers[name].execute(commandName, data);
      }
    },
  };
};
