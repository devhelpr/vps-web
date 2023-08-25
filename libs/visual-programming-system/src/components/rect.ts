/* eslint-disable @typescript-eslint/no-unused-vars */
import { compileMarkup } from '@devhelpr/markup-compiler';
import { getCamera, transformCameraSpaceToWorldSpace } from '../camera';
import { InteractionStateMachine } from '../interaction-state-machine';
import {
  DOMElementNode,
  ElementNodeMap,
  IConnectionNodeComponent,
  IElementNode,
  INodeComponent,
  IRectNodeComponent,
  IThumb,
  IThumbNodeComponent,
  ThumbConnectionType,
} from '../interfaces/element';
import { setSelectNode } from '../reactivity';
import { ConnectionControllerType, ThumbType } from '../types';
import { createASTNodeElement, createElement } from '../utils';
import { pointerDown } from './events/pointer-events';
import { ThumbNode } from './thumb';
import {
  calculateConnectorX,
  calculateConnectorY,
  thumbPosition,
} from './utils/calculate-connector-thumbs';
import { setPosition } from './utils/set-position';
import { NodeType } from '../types/node-type';
import { thumbHeight, thumbWidth } from '../constants/measures';

export class Rect<T> {
  public nodeComponent?: IRectNodeComponent<T>;
  public isStaticPosition?: boolean;

  protected rectInfo: ReturnType<typeof this.createRectElement>;

  protected canvas: INodeComponent<T> | undefined;
  protected canvasElements?: ElementNodeMap<T>;
  protected pathHiddenElement?: IElementNode<T>;
  protected canvasUpdated?: () => void;
  protected interactionStateMachine: InteractionStateMachine<T>;
  protected hasStaticWidthHeight?: boolean;
  protected containerNode?: INodeComponent<T>;
  protected updateEventListeners: ((
    target?: INodeComponent<T>,
    x?: number,
    y?: number,
    initiator?: INodeComponent<T>
  ) => void)[] = [];
  protected points = {
    beginX: 0,
    beginY: 0,
    width: 0,
    height: 0,
  };

  constructor(
    canvas: INodeComponent<T>,
    interactionStateMachine: InteractionStateMachine<T>,
    pathHiddenElement: IElementNode<T>,
    elements: ElementNodeMap<T>,
    startX: number,
    startY: number,
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
    canvasUpdated?: () => void,
    id?: string,
    containerNode?: IRectNodeComponent<T>,
    isStaticPosition?: boolean
  ) {
    this.canvas = canvas;
    this.canvasElements = elements;
    this.canvasUpdated = canvasUpdated;
    this.interactionStateMachine = interactionStateMachine;
    this.hasStaticWidthHeight = hasStaticWidthHeight;
    let widthHelper = width;
    let heightHelper = height;
    this.containerNode = containerNode;
    this.isStaticPosition = isStaticPosition;
    this.pathHiddenElement = pathHiddenElement;

    this.rectInfo = this.createRectElement(
      canvas.domElement,
      elements,
      startX,
      startY,
      widthHelper,
      heightHelper,
      pathHiddenElement,
      text,
      (thumbType: ThumbType, index?: number) => {
        return thumbPosition<T>(this.nodeComponent!, thumbType, index);
      },
      markup,
      layoutProperties,
      hasStaticWidthHeight,
      disableInteraction,
      canvasUpdated,
      id
    );
    this.nodeComponent = this.rectInfo.nodeComponent;
    this.nodeComponent.isStaticPosition = isStaticPosition ?? false;
    this.nodeComponent.containerNode = containerNode;

    // this.nodeComponent.domElement?.addEventListener('pointerup', this.onPointerUp);
    // this.nodeComponent.domElement?.addEventListener(
    //   'pointerover',
    //   this.onPointerOver
    // );

    // this.nodeComponent.domElement?.addEventListener(
    //   'pointerleave',
    //   this.onPointerLeave
    // );

    this.nodeComponent.update = this.onUpdate(
      this.rectInfo.astElement,
      (thumbType: ThumbType, index?: number) => {
        if (!this.nodeComponent) {
          throw new Error('this.nodeComponent is undefined');
        }
        return thumbPosition<T>(this.nodeComponent, thumbType, index);
      }
    );

    this.nodeComponent.updateEnd = () => {
      if (canvasUpdated) {
        canvasUpdated();
      }
    };

    this.nodeComponent.x = startX;
    this.nodeComponent.y = startY;
    this.nodeComponent.width = width;
    this.nodeComponent.height = height;
    this.oldWidth = width;
    this.oldHeight = height;

    if (!hasStaticWidthHeight) {
      const astElementSize = (
        this.rectInfo.astElement?.domElement as unknown as HTMLElement
      ).getBoundingClientRect();

      const { scale } = getCamera();
      this.nodeComponent.width = astElementSize.width / scale;
      this.nodeComponent.height = astElementSize.height / scale; // - 20;
      this.points.width = astElementSize.width / scale;
      this.points.height = astElementSize.height / scale; // - 20;
    }

    widthHelper = this.nodeComponent.width ?? 0;
    heightHelper = this.nodeComponent.height ?? 0;

    const thumbConnectors: IThumbNodeComponent<T>[] = [];

    if (thumbs) {
      thumbs.forEach((thumb, index) => {
        if (!this.nodeComponent) {
          return;
        }
        const { x, y } = thumbPosition(
          this.nodeComponent,
          thumb.thumbType,
          thumb.thumbIndex ?? 0
        );
        console.log('thumb', x, y);

        const thumbNode = new ThumbNode<T>(
          this.nodeComponent.domElement,
          this.interactionStateMachine,
          this.nodeComponent.elements,
          thumb.name ??
            (thumb.connectionType === ThumbConnectionType.start
              ? 'output'
              : 'input'),
          thumb.thumbType,
          thumb.connectionType,
          thumb.color ?? '#008080',
          x,
          y,
          undefined,
          NodeType.Connector,
          `top-0 left-0 origin-center ${
            thumb.hidden ? 'invisible pointer-events-none' : ''
          }`,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          thumb.thumbIndex ?? 0,
          true,
          canvas,
          elements,
          this.nodeComponent,
          pathHiddenElement,
          disableInteraction,
          thumb.label,
          thumb.thumbShape ?? 'circle',
          canvasUpdated,
          containerNode
        );

        if (!thumbNode.nodeComponent) {
          throw new Error('ThumbNode.nodeComponent is undefined');
        }
        thumbNode.nodeComponent.pathName = thumb.pathName;
        thumbNode.nodeComponent.isControlled = true;
        thumbNode.nodeComponent.isConnectPoint = true;
        thumbNode.nodeComponent.thumbConnectionType = thumb.connectionType;
        thumbNode.nodeComponent.thumbControlPointDistance =
          thumb.controlPointDistance;
        thumbNode.nodeComponent.thumbLinkedToNode = this.nodeComponent;
        thumbNode.nodeComponent.thumbConstraint = thumb.thumbConstraint;
        thumbNode.nodeComponent.isDataPort = thumb.isDataPort;

        if (!disableInteraction) {
          thumbNode.nodeComponent.onCanReceiveDroppedComponent =
            this.onCanReceiveDroppedComponent;
          thumbNode.nodeComponent.onReceiveDraggedConnection =
            this.onReceiveDraggedConnection(this.nodeComponent);
        }
        thumbNode.nodeComponent.update = this.onEndThumbConnectorElementupdate;

        thumbConnectors.push(thumbNode.nodeComponent);
      });
    }
    this.nodeComponent.thumbConnectors = thumbConnectors;

    this.nodeComponent.update(
      this.nodeComponent,
      startX,
      startY,
      this.nodeComponent
    );

    this.nodeComponent.onClick = () => {
      if (!this.nodeComponent) {
        return;
      }
      console.log('CLICKED ON RECT', this.nodeComponent.id);
      setSelectNode(this.nodeComponent.id);
    };
    this.nodeComponent.connections = [];
  }

  public resize(width?: number) {
    if (this.hasStaticWidthHeight || !this.nodeComponent) {
      return;
    }

    const astElementHtmlElement = this.rectInfo.astElement
      ?.domElement as unknown as HTMLElement;
    if (astElementHtmlElement) {
      astElementHtmlElement.style.width = width ? `${width}px` : 'auto';
      astElementHtmlElement.style.height = 'auto';
    }

    const rectContainerDOMElement = this.nodeComponent
      .domElement as unknown as HTMLElement;
    rectContainerDOMElement.style.width = width ? `${width}px` : 'auto';
    rectContainerDOMElement.style.height = `auto`;

    const astElementSize = astElementHtmlElement.getBoundingClientRect();

    const { scale } = getCamera();
    this.nodeComponent.width = astElementSize.width / scale;
    this.nodeComponent.height = astElementSize.height / scale;
    this.points.width = astElementSize.width / scale;
    this.points.height = astElementSize.height / scale;

    rectContainerDOMElement.style.width = `${this.nodeComponent.width}px`;
    rectContainerDOMElement.style.height = `${this.nodeComponent.height}px`;

    if (this.nodeComponent.update) {
      this.nodeComponent.update(
        this.nodeComponent,
        this.nodeComponent.x,
        this.nodeComponent.y,
        this.nodeComponent
      );
    }
  }

  public addUpdateEventListener = (
    onUpdate: (
      target?: INodeComponent<T>,
      x?: number,
      y?: number,
      initiator?: INodeComponent<T>
    ) => void
  ) => {
    this.updateEventListeners.push(onUpdate);
  };

  protected onReceiveDraggedConnection =
    (rectNode: IRectNodeComponent<T>) =>
    (thumbNode: IThumbNodeComponent<T>, component: INodeComponent<T>) => {
      // component is not the path itself but it is the drag-handle of a path (the parent of that handle is the path node-component)
      if (!rectNode) {
        return;
      }
      console.log(
        'DROPPED ON RIGHT THUMB',
        thumbNode,
        component.id,
        component.parent,
        component.connectionControllerType,
        rectNode.x,
        rectNode.y,
        rectNode.id
      );

      // check for 'begin' or 'end' connectionControllerType which are the drag handlers of the connection/path
      // (not to be confused with the resize handlers)
      if (
        (component &&
          component.parent &&
          thumbNode.thumbConnectionType === ThumbConnectionType.end &&
          component.connectionControllerType ===
            ConnectionControllerType.end) ||
        (component &&
          component.parent &&
          thumbNode.thumbConnectionType === ThumbConnectionType.start &&
          component.connectionControllerType === ConnectionControllerType.begin)
      ) {
        const draggedConnection =
          component.parent as unknown as IConnectionNodeComponent<T>;
        let nodeReference = rectNode;
        if (
          component.connectionControllerType === ConnectionControllerType.begin
        ) {
          // remove connection from current start node
          const previousConnectionId = draggedConnection.id;
          if (previousConnectionId && draggedConnection.startNode) {
            draggedConnection.startNode.connections =
              draggedConnection.startNode.connections.filter((connection) => {
                return connection.id !== previousConnectionId;
              });
          }
          draggedConnection.startNode = this.nodeComponent;
          draggedConnection.startNodeThumb = thumbNode;
        } else {
          // remove connection from current end node
          const previousConnectionId = draggedConnection.id;
          if (draggedConnection.endNode) {
            draggedConnection.endNode.connections =
              draggedConnection.endNode.connections.filter((connection) => {
                return connection.id !== previousConnectionId;
              });
          }
          draggedConnection.endNode = this.nodeComponent;
          draggedConnection.endNodeThumb = thumbNode;
          if (draggedConnection.startNode) {
            // use start node as reference for the curve's begin point
            nodeReference = draggedConnection.startNode;
          }
        }
        component.parent.isControlled = true;

        rectNode.connections?.push(draggedConnection);

        // Update both sides of the connection to get a correct curve
        if (component.parent.update) {
          component.parent.update(
            component.parent,
            nodeReference.x,
            nodeReference.y,
            this.nodeComponent
          );
          if (
            component.connectionControllerType ===
            ConnectionControllerType.begin
          ) {
            if (draggedConnection.endNode) {
              component.parent.update(
                component.parent,
                nodeReference.x,
                nodeReference.y,
                draggedConnection.endNode
              );
            }
          } else {
            if (draggedConnection.startNode) {
              component.parent.update(
                component.parent,
                nodeReference.x,
                nodeReference.y,
                draggedConnection.startNode
              );
            }
          }
        }

        (this.canvas?.domElement as unknown as HTMLElement | SVGElement).append(
          draggedConnection.startNode?.domElement as unknown as HTMLElement
        );

        if (this.canvasUpdated) {
          this.canvasUpdated();
        }
      }
    };

  private onCanReceiveDroppedComponent(
    thumbNode: IThumbNodeComponent<T>,
    component: INodeComponent<T>,
    receivingThumbNode: IThumbNodeComponent<T>
  ) {
    // check for 'begin' or 'end' connectionControllerType which are the drag handlers of the connection/path
    // (not to be confused with the resize handlers)

    if (
      component &&
      component.parent &&
      thumbNode.thumbConnectionType === ThumbConnectionType.end &&
      component.connectionControllerType === ConnectionControllerType.end
    ) {
      // thumbNode is the thumb that is being dropped on
      // component.parent.startNodeThumb is the thumb that is being dragged from

      console.log(
        'DROPPED ON RIGHT THUMB',
        thumbNode.thumbConstraint,
        (component.parent as unknown as IConnectionNodeComponent<T>)
          .startNodeThumb?.thumbConstraint
      );
      if (
        thumbNode.thumbConstraint !==
        (component.parent as unknown as IConnectionNodeComponent<T>)
          .startNodeThumb?.thumbConstraint
      ) {
        return false;
      }
      return true;
    } else if (
      component &&
      component.parent &&
      thumbNode.thumbConnectionType === ThumbConnectionType.start &&
      component.connectionControllerType === ConnectionControllerType.begin
    ) {
      // thumbNode is the thumb that is being dropped on
      // component.parent.endNodeThumb is the thumb that is being dragged from

      console.log(
        'DROPPED ON LEFT THUMB',
        thumbNode.thumbConstraint,
        (component.parent as unknown as IConnectionNodeComponent<T>)
          .endNodeThumb?.thumbConstraint
      );
      if (
        (component.parent as unknown as IConnectionNodeComponent<T>)
          .endNodeThumb?.thumbConstraint !== undefined &&
        thumbNode.thumbConstraint !==
          (component.parent as unknown as IConnectionNodeComponent<T>)
            .endNodeThumb?.thumbConstraint
      ) {
        return false;
      }
      return true;
    }
    return false;
  }
  oldWidth = -1;
  oldHeight = -1;
  onEndThumbConnectorElementupdate = (
    target?: INodeComponent<T>,
    x?: number,
    y?: number,
    initiator?: INodeComponent<T>
  ) => {
    if (!target || x === undefined || y === undefined || !initiator) {
      return false;
    }
    if (
      this.oldWidth === -1 ||
      this.oldHeight === -1 ||
      this.oldWidth !== this.nodeComponent?.width ||
      this.oldHeight !== this.nodeComponent?.height
    ) {
      this.oldWidth = this.nodeComponent?.width ?? -1;
      this.oldHeight = this.nodeComponent?.height ?? -1;
      this.nodeComponent?.thumbConnectors?.forEach((thumbConnector) => {
        if (thumbConnector.domElement && this.nodeComponent) {
          const { x, y } = thumbPosition(
            this.nodeComponent,
            thumbConnector.thumbType ?? ThumbType.None,
            thumbConnector.thumbIndex ?? 0
          );

          (
            thumbConnector.domElement as HTMLElement
          ).style.left = `calc(${x}px - ${thumbWidth / 2}px)`;
          (
            thumbConnector.domElement as HTMLElement
          ).style.top = `calc(${y}px - ${thumbHeight / 2}px)`;
        }
      });
    }
    setPosition(target, x, y, initiator?.nodeType !== NodeType.Shape, false);
    return true;
  };

  protected createRectElement = (
    canvasElement: DOMElementNode,
    elements: ElementNodeMap<T>,
    startX: number,
    startY: number,
    width: number,
    height: number,
    pathHiddenElement: IElementNode<T>,
    text?: string,

    getThumbPosition?: (
      thumbType: ThumbType,
      index?: number,
      offsetY?: number
    ) => { x: number; y: number },
    markup?: string | INodeComponent<T>,
    layoutProperties?: {
      classNames?: string;
    },
    hasStaticWidthHeight?: boolean,
    disableInteraction?: boolean,
    canvasUpdated?: () => void,
    id?: string
  ) => {
    /*
      draw svg path based on bbox of the hidden path
        
        - add padding to the bbox x and y and width and height
  
        - subtract bbox x and y from the path points
        - set transform of svg to the bbox x and y
        - set the width and height of the svg to the bbox width and height   
    */

    this.points = {
      beginX: startX,
      beginY: startY,
      width: width,
      height: height,
    };

    const pathPoints = {
      beginX: this.points.beginX,
      beginY: this.points.beginY,
      width: this.points.width,
      height: this.points.height,
    };

    const rectContainerElement = createElement(
      'div',
      {
        class: 'absolute top-0 left-0 select-none ', //will-change-transform
      },
      canvasElement,
      undefined,
      id
    ) as unknown as IRectNodeComponent<T> | undefined;

    if (!rectContainerElement)
      throw new Error('rectContainerElement is undefined');

    rectContainerElement.nodeType = NodeType.Shape;

    let astElement: any;

    const hasPointerEvents = !disableInteraction;

    if (markup !== undefined && typeof markup === 'string') {
      const compiledMarkup = compileMarkup(
        `<div class="${layoutProperties?.classNames ?? ''} overflow-hidden">
          ${markup ?? ''}
        </div>`
      );
      if (!compiledMarkup) {
        throw new Error('Invalid markup');
      }

      if (
        compiledMarkup &&
        rectContainerElement &&
        rectContainerElement.domElement
      ) {
        astElement = createASTNodeElement(
          compiledMarkup.body,
          rectContainerElement.domElement,
          rectContainerElement.elements
        );
      }
    } else if (markup !== undefined) {
      astElement = markup as unknown as INodeComponent<T>;
      rectContainerElement.domElement.appendChild(astElement.domElement);
      rectContainerElement.elements.set(astElement.id, astElement);
    } else {
      throw new Error('No markup or INodeComponent');
    }

    if (astElement && hasPointerEvents) {
      astElement.domElement.addEventListener(
        'pointerdown',
        this.astElementOnPointerDown
      );
    }

    if (!rectContainerElement) throw new Error('nodeComponent is undefined');

    const bbox = this.getBBoxPath(pathPoints);

    const divDomElement =
      rectContainerElement.domElement as unknown as HTMLElement;
    divDomElement.style.width = `${bbox.width}px`;
    divDomElement.style.height = `${bbox.height}px`;
    divDomElement.style.transform = `translate(${bbox.x}px, ${bbox.y}px)`;

    elements.set(rectContainerElement.id, rectContainerElement);

    return {
      nodeComponent: rectContainerElement,
      astElement,
    };
  };

  protected onPointerDown = (e: PointerEvent) => {
    return false;
  };

  private astElementOnPointerDown = (event: PointerEvent) => {
    if (
      ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].indexOf(
        (event.target as HTMLElement)?.tagName
      ) >= 0
    )
      return;

    event.stopPropagation();

    if (this.onPointerDown(event)) {
      return;
    }

    if (this.nodeComponent && this.canvas) {
      const elementRect = (
        this.nodeComponent.domElement as unknown as HTMLElement | SVGElement
      ).getBoundingClientRect();

      const { x, y } = transformCameraSpaceToWorldSpace(
        event.clientX,
        event.clientY
      );
      const rect = transformCameraSpaceToWorldSpace(
        elementRect.x,
        elementRect.y
      );
      const bbox = this.getBBoxPath(this.points);

      let parentX = 0;
      let parentY = 0;
      if (this.containerNode) {
        parentX = this.containerNode.x;
        parentY = this.containerNode.y;
      }

      const interactionInfoResult = pointerDown(
        x - rect.x + parentX - (this.points.beginX - bbox.x),
        y - rect.y + parentY - (this.points.beginY - bbox.y),
        this.nodeComponent,
        this.canvas.domElement,
        this.interactionStateMachine
      );

      if (interactionInfoResult) {
        (this.canvas?.domElement as unknown as HTMLElement | SVGElement).append(
          this.nodeComponent.domElement
        );
      }
    }
  };

  protected getBBoxPath(pathPoints: {
    beginX: number;
    beginY: number;
    width: number;
    height: number;
  }) {
    return {
      x: pathPoints.beginX,
      y: pathPoints.beginY,
      width: pathPoints.width,
      height: pathPoints.height,
    };
  }

  protected onUpdate =
    (
      astElement: INodeComponent<T>,
      getThumbPosition?: (
        thumbType: ThumbType,
        index?: number,
        offsetY?: number
      ) => { x: number; y: number }
    ) =>
    (
      target?: INodeComponent<T>,
      x?: number,
      y?: number,
      initiator?: INodeComponent<T>
    ) => {
      if (!target || x === undefined || y === undefined || !initiator) {
        return false;
      }

      if (
        this.nodeComponent &&
        target.nodeType === NodeType.Shape &&
        initiator.nodeType === NodeType.Shape
      ) {
        this.points.beginX = x;
        this.points.beginY = y;

        if (
          initiator.containerNode &&
          initiator.containerNode.id === target.id
        ) {
          // a node within this container was updated
          if (
            initiator.x > 0 &&
            (initiator.width ?? 0) + initiator.x > this.points.width
          ) {
            this.points.width = (initiator.width ?? 0) + initiator.x;
          }
          if (
            initiator.y > 0 &&
            (initiator.height ?? 0) + initiator.y > this.points.height
          ) {
            this.points.height = (initiator.height ?? 0) + initiator.y;
          }
          let updateInitiator = false;
          let newX = initiator.x;
          let newY = initiator.y;
          if (initiator.x < 0) {
            this.points.beginX = this.points.beginX + initiator.x;
            this.points.width = this.points.width - initiator.x;

            updateInitiator = true;
            newX = 0;
          }
          if (initiator.y < 0) {
            this.points.beginY = this.points.beginY + initiator.y;
            this.points.height = this.points.height - initiator.y;
            updateInitiator = true;
            newY = 0;
          }
          if (updateInitiator && initiator.update) {
            const state =
              this.interactionStateMachine.getCurrentInteractionState();
            if (state && state.target && state.target.interactionInfo) {
              if (newX === 0) {
                state.target.interactionInfo.xOffsetWithinElementOnFirstClick +=
                  initiator.x;
              }
              if (newY === 0) {
                state.target.interactionInfo.yOffsetWithinElementOnFirstClick +=
                  initiator.y;
              }
            }

            initiator.update(initiator, newX, newY, this.nodeComponent);
          }
          // TODO : update inner thumbs which are rectNodes
          // TODO : update all other child rectNodes and connections
          // TODO : store container width and height
        }

        this.nodeComponent.x = this.points.beginX;
        this.nodeComponent.y = this.points.beginY;

        if (getThumbPosition) {
          target?.thumbConnectors?.forEach(
            (connector: IThumbNodeComponent<T>) => {
              if (connector && connector.update && connector.thumbType) {
                const position = getThumbPosition(
                  connector.thumbType,
                  connector.thumbIndex ?? 0
                );
                connector.update(connector, position.x, position.y, initiator);
              }
            }
          );
        }

        const pathPoints = {
          beginX: this.points.beginX,
          beginY: this.points.beginY,
          width: this.points.width,
          height: this.points.height,
        };

        const bbox = this.getBBoxPath(pathPoints);

        const divDomElement = this.nodeComponent
          .domElement as unknown as HTMLElement;
        divDomElement.style.width = `${bbox.width}px`;
        divDomElement.style.height = `${bbox.height}px`;
        divDomElement.style.transform = `translate(${bbox.x}px, ${bbox.y}px)`;

        this.nodeComponent.x = this.points.beginX;
        this.nodeComponent.y = this.points.beginY;
        this.nodeComponent.width = this.points.width;
        this.nodeComponent.height = this.points.height;

        const astDomElement = astElement.domElement as unknown as HTMLElement;
        astDomElement.style.width = `${bbox.width}px`;
        astDomElement.style.height = `${bbox.height}px`;
      } else if (
        this.nodeComponent &&
        target.nodeType === NodeType.Shape &&
        initiator.nodeType === NodeType.Connection &&
        !this.isStaticPosition
      ) {
        const startThumb = (initiator as unknown as IConnectionNodeComponent<T>)
          .startNodeThumb;
        const startNode = (initiator as unknown as IConnectionNodeComponent<T>)
          .startNode;

        const endThumb = (initiator as unknown as IConnectionNodeComponent<T>)
          .endNodeThumb;
        const endNode = (initiator as unknown as IConnectionNodeComponent<T>)
          .endNode;

        if (startThumb && startNode && startNode.id === target.id) {
          const tx = calculateConnectorX(
            startThumb?.thumbType ?? ThumbType.None,
            startNode?.width ?? 0,
            startNode?.height ?? 0,
            startThumb?.thumbIndex ?? 0
          );
          const ty = calculateConnectorY(
            startThumb?.thumbType ?? ThumbType.None,
            startNode?.width ?? 0,
            startNode?.height ?? 0,
            startThumb?.thumbIndex ?? 0
          );

          this.points.beginX = x - tx;
          this.points.beginY = y - ty;
        }
        if (endThumb && endNode && endNode.id === target.id) {
          const tx = calculateConnectorX(
            endThumb?.thumbType ?? ThumbType.None,
            endNode?.width ?? 0,
            endNode?.height ?? 0,
            endThumb?.thumbIndex ?? 0
          );
          const ty = calculateConnectorY(
            endThumb?.thumbType ?? ThumbType.None,
            endNode?.width ?? 0,
            endNode?.height ?? 0,
            endThumb?.thumbIndex ?? 0
          );
          this.points.beginX = x - tx;
          this.points.beginY = y - ty;
        }

        if (this.nodeComponent) {
          this.nodeComponent.x = this.points.beginX;
          this.nodeComponent.y = this.points.beginY;
        }

        const pathPoints = {
          beginX: this.points.beginX,
          beginY: this.points.beginY,
          width: this.points.width,
          height: this.points.height,
        };

        const bbox = this.getBBoxPath(pathPoints);

        const divDomElement = this.nodeComponent
          .domElement as unknown as HTMLElement;
        divDomElement.style.width = `${bbox.width}px`;
        divDomElement.style.height = `${bbox.height}px`;
        divDomElement.style.transform = `translate(${bbox.x}px, ${bbox.y}px)`;

        this.nodeComponent.x = this.points.beginX;
        this.nodeComponent.y = this.points.beginY;
        this.nodeComponent.width = this.points.width;
        this.nodeComponent.height = this.points.height;

        const astDomElement = astElement.domElement as unknown as HTMLElement;
        astDomElement.style.width = `${bbox.width}px`;
        astDomElement.style.height = `${bbox.height}px`;
      }

      if (this.nodeComponent) {
        // get all connections that have this node as start or end
        this.nodeComponent.connections?.forEach((connection) => {
          if (
            initiator?.nodeType === NodeType.Connection &&
            connection.id === initiator.id
          ) {
            return;
          }
          if (connection.nodeType === NodeType.Connection) {
            const start =
              connection.startNode === this.nodeComponent && connection;
            const end = connection.endNode === this.nodeComponent && connection;
            if (start && connection && connection.update) {
              connection.update(
                connection,
                this.points.beginX,
                this.points.beginY,
                this.nodeComponent
              );
              if (connection.endNode) {
                connection.update(
                  connection,
                  this.points.beginX,
                  this.points.beginY,
                  connection.endNode
                );
              }
            }
            if (end && connection && connection.update && this.nodeComponent) {
              connection.update(
                connection,
                this.points.beginX,
                this.points.beginY,
                this.nodeComponent
              );
              if (connection.startNode) {
                connection.update(
                  connection,
                  this.points.beginX,
                  this.points.beginY,
                  connection.startNode
                );
              }
            }
          }
        });

        if (
          this.containerNode &&
          this.containerNode.update &&
          initiator &&
          initiator.id !== this.containerNode.id
        ) {
          this.containerNode.update(
            this.containerNode,
            this.containerNode.x,
            this.containerNode.y,
            this.nodeComponent
          );
        }
      }

      this.updateEventListeners.forEach((onUpdate) => {
        onUpdate(this.nodeComponent, x, y, initiator);
      });

      return true;
    };
}
