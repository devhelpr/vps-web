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
  thumbInitialPosition,
  thumbOffsetX,
  thumbOffsetY,
  thumbPosition,
} from './utils/calculate-connector-thumbs';
import { getPoint } from './utils/get-point';
import { setPosition } from './utils/set-position';
import { NodeType } from '../types/node-type';
import { paddingRect, totalPaddingRect } from '../constants/measures';

export class Rect<T> {
  public nodeComponent?: IRectNodeComponent<T>;
  public isStaticPosition?: boolean;

  protected rectNode: IRectNodeComponent<T> | undefined;
  protected rectInfo: ReturnType<typeof this.createRectElement>;

  protected canvas: INodeComponent<T> | undefined;
  protected canvasElements?: ElementNodeMap<T>;
  protected pathHiddenElement?: IElementNode<T>;
  protected canvasUpdated?: () => void;
  protected interactionStateMachine: InteractionStateMachine<T>;
  protected hasStaticWidthHeight?: boolean;
  protected containerNode?: INodeComponent<T>;

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
    containerNode?: INodeComponent<T>,
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
      thumbOffsetX,
      thumbOffsetY,
      (thumbType: ThumbType, index?: number, offsetY?: number) => {
        return thumbPosition<T>(this.rectNode!, thumbType, index, offsetY);
      },
      markup,
      layoutProperties,
      hasStaticWidthHeight,
      disableInteraction,
      canvasUpdated,
      id
    );
    this.rectNode = this.rectInfo.nodeComponent;
    this.rectNode.isStaticPosition = isStaticPosition ?? false;

    // this.rectNode.domElement?.addEventListener('pointerup', this.onPointerUp);
    // this.rectNode.domElement?.addEventListener(
    //   'pointerover',
    //   this.onPointerOver
    // );

    // this.rectNode.domElement?.addEventListener(
    //   'pointerleave',
    //   this.onPointerLeave
    // );

    this.rectNode.update = this.onUpdate(
      this.rectNode,
      this.rectInfo.astElement,
      (thumbType: ThumbType, index?: number, offsetY?: number) => {
        if (!this.rectNode) {
          throw new Error('this.rectNode is undefined');
        }
        return thumbPosition<T>(this.rectNode, thumbType, index, offsetY);
      }
    );

    this.rectNode.updateEnd = () => {
      if (canvasUpdated) {
        canvasUpdated();
      }
    };

    this.rectNode.x = startX;
    this.rectNode.y = startY;
    this.rectNode.width = width;
    this.rectNode.height = height;

    if (!hasStaticWidthHeight) {
      const astElementSize = (
        this.rectInfo.astElement?.domElement as unknown as HTMLElement
      ).getBoundingClientRect();

      const { scale } = getCamera();
      this.rectNode.width = astElementSize.width / scale;
      this.rectNode.height = astElementSize.height / scale - 20;
      this.points.width = astElementSize.width / scale;
      this.points.height = astElementSize.height / scale - 20;
    }
    this.rectNode.update(this.rectNode, startX, startY, this.rectNode);

    widthHelper = this.rectNode.width ?? 0;
    heightHelper = this.rectNode.height ?? 0;

    const thumbConnectors: IThumbNodeComponent<T>[] = [];

    if (thumbs) {
      thumbs.forEach((thumb, index) => {
        if (!this.rectNode) {
          return;
        }
        const { x, y } = thumbInitialPosition(
          this.rectNode,
          thumb.thumbType,
          thumb.thumbIndex ?? 0,
          thumb.offsetY ?? 0
        );

        const thumbNode = new ThumbNode<T>(
          this.rectNode.domElement,
          this.interactionStateMachine,
          this.rectNode.elements,
          thumb.name ??
            (thumb.connectionType === ThumbConnectionType.start
              ? 'output'
              : 'input'),
          thumb.thumbType,
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
          this.rectNode,
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
        thumbNode.nodeComponent.thumbOffsetY = thumb.offsetY ?? 0;
        thumbNode.nodeComponent.thumbControlPointDistance =
          thumb.controlPointDistance;
        thumbNode.nodeComponent.thumbLinkedToNode = this.rectNode;
        thumbNode.nodeComponent.thumbConstraint = thumb.thumbConstraint;

        if (!disableInteraction) {
          thumbNode.nodeComponent.onCanReceiveDroppedComponent =
            this.onCanReceiveDroppedComponent;
          thumbNode.nodeComponent.onReceiveDraggedConnection =
            this.onReceiveDraggedConnection(this.rectNode);
        }
        thumbNode.nodeComponent.update = this.onEndThumbConnectorElementupdate;

        thumbConnectors.push(thumbNode.nodeComponent);
      });
    }
    this.rectNode.thumbConnectors = thumbConnectors;

    this.rectNode.onClick = () => {
      if (!this.rectNode) {
        return;
      }
      console.log('CLICKED ON RECT', this.rectNode.id);
      setSelectNode(this.rectNode.id);
    };
    this.rectNode.connections = [];
    this.nodeComponent = this.rectNode;
  }

  public resize(width?: number) {
    if (this.hasStaticWidthHeight || !this.rectNode) {
      return;
    }

    const astElementHtmlElement = this.rectInfo.astElement
      ?.domElement as unknown as HTMLElement;
    if (astElementHtmlElement) {
      astElementHtmlElement.style.width = width ? `${width}px` : 'auto';
      astElementHtmlElement.style.height = 'auto';
    }

    const rectContainerDOMElement = this.rectNode
      .domElement as unknown as HTMLElement;
    rectContainerDOMElement.style.width = width ? `${width}px` : 'auto';
    rectContainerDOMElement.style.height = `auto`;

    const astElementSize = astElementHtmlElement.getBoundingClientRect();

    const { scale } = getCamera();
    this.rectNode.width = astElementSize.width / scale - 20;
    this.rectNode.height = astElementSize.height / scale - 20;
    this.points.width = astElementSize.width / scale - 20;
    this.points.height = astElementSize.height / scale - 20;

    rectContainerDOMElement.style.width = `${this.rectNode.width}px`;
    rectContainerDOMElement.style.height = `${this.rectNode.height}px`;

    if (this.rectNode.update) {
      this.rectNode.update(
        this.rectNode,
        this.rectNode.x,
        this.rectNode.y,
        this.rectNode
      );
    }
  }

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
          draggedConnection.startNode = this.rectNode;
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
          draggedConnection.endNode = this.rectNode;
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
            this.rectNode
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

  onEndThumbConnectorElementupdate(
    target?: INodeComponent<T>,
    x?: number,
    y?: number,
    initiator?: INodeComponent<T>
  ) {
    if (!target || x === undefined || y === undefined || !initiator) {
      return false;
    }

    setPosition(target, x, y, initiator?.nodeType !== NodeType.Shape, false);
    return true;
  }

  protected createRectElement = (
    canvasElement: DOMElementNode,
    elements: ElementNodeMap<T>,
    startX: number,
    startY: number,
    width: number,
    height: number,
    pathHiddenElement: IElementNode<T>,
    text?: string,
    thumbOffsetX?: number,
    thumbOffsetY?: number,
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
    const begin = getPoint(this.points.beginX, this.points.beginY);

    const pathPoints = {
      beginX: begin.x,
      beginY: begin.y,
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
        this.astElementOnPointerDown(rectContainerElement, pathPoints)
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

  private astElementOnPointerDown =
    (
      rectContainerElement: IRectNodeComponent<T>,
      pathPoints: {
        beginX: number;
        beginY: number;
        width: number;
        height: number;
      }
    ) =>
    (event: PointerEvent) => {
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

      if (rectContainerElement && this.canvas) {
        const elementRect = (
          rectContainerElement.domElement as unknown as HTMLElement | SVGElement
        ).getBoundingClientRect();

        const { x, y } = transformCameraSpaceToWorldSpace(
          event.clientX,
          event.clientY
        );
        const rect = transformCameraSpaceToWorldSpace(
          elementRect.x,
          elementRect.y
        );
        const bbox = this.getBBoxPath(pathPoints);

        let parentX = 0;
        let parentY = 0;
        if (this.containerNode) {
          parentX = this.containerNode.x - paddingRect;
          parentY = this.containerNode.y - paddingRect;
        }

        const interactionInfoResult = pointerDown(
          x - rect.x + parentX - (pathPoints.beginX - bbox.x),
          y - rect.y + parentY - (pathPoints.beginY - bbox.y),
          rectContainerElement,
          this.canvas.domElement,
          this.interactionStateMachine
        );
        if (interactionInfoResult) {
          (
            this.canvas?.domElement as unknown as HTMLElement | SVGElement
          ).append(rectContainerElement.domElement);
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
      x: pathPoints.beginX - paddingRect,
      y: pathPoints.beginY - paddingRect,
      width: pathPoints.width + totalPaddingRect,
      height: pathPoints.height + totalPaddingRect,
    };
  }

  protected onUpdate =
    (
      rectContainerElement: IRectNodeComponent<T>,
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
        target.nodeType === NodeType.Shape &&
        initiator.nodeType === NodeType.Shape
      ) {
        this.points.beginX = x;
        this.points.beginY = y;
        if (rectContainerElement) {
          rectContainerElement.x = this.points.beginX;
          rectContainerElement.y = this.points.beginY;
        }

        if (getThumbPosition) {
          target?.thumbConnectors?.forEach(
            (connector: IThumbNodeComponent<T>) => {
              if (connector && connector.update && connector.thumbType) {
                const position = getThumbPosition(
                  connector.thumbType,
                  connector.thumbIndex ?? 0,
                  connector.thumbOffsetY ?? 0
                );
                connector.update(connector, position.x, position.y, initiator);
              }
            }
          );
        }

        const begin = getPoint(this.points.beginX, this.points.beginY);

        const pathPoints = {
          beginX: begin.x,
          beginY: begin.y,
          width: this.points.width,
          height: this.points.height,
        };

        const bbox = this.getBBoxPath(pathPoints);

        const divDomElement =
          rectContainerElement.domElement as unknown as HTMLElement;
        divDomElement.style.width = `${bbox.width}px`;
        divDomElement.style.height = `${bbox.height}px`;
        divDomElement.style.transform = `translate(${bbox.x}px, ${bbox.y}px)`;

        if (rectContainerElement) {
          rectContainerElement.x = this.points.beginX;
          rectContainerElement.y = this.points.beginY;
          rectContainerElement.width = this.points.width;
          rectContainerElement.height = this.points.height;
        }

        const astDomElement = astElement.domElement as unknown as HTMLElement;
        astDomElement.style.width = `${bbox.width}px`;
        astDomElement.style.height = `${bbox.height}px`;
      } else if (
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

        /*
            regarding below "magic numbers"...
            for 2 connected expression-nodes this works
            for others not
            when a connection of 2 nodes gets clicked.. the start node gets moved...
            .. expression nodes have a width of 200px


          given:
          - x,y coordinates of rect-nodes are top-left
        
          possible solutions
          - use the connection coordinates (x,y,endX,endY)
          => do negative transform from startThumb/endThumb to rect-node
            .. works almost 
            .. still a weird 30 offset
            .. and if-condition are not correct
            .. thumb-type Center is better.. but when clicking on the nodes.. it's not correct
          */
        if (startThumb && startNode && startNode.id === target.id) {
          const tx = calculateConnectorX(
            startThumb?.thumbType ?? ThumbType.TopLeft,
            startNode?.width ?? 0,
            startNode?.height ?? 0,
            startThumb?.thumbIndex ?? 0
          );
          const ty = calculateConnectorY(
            startThumb?.thumbType ?? ThumbType.TopLeft,
            startNode?.width ?? 0,
            startNode?.height ?? 0,
            startThumb?.thumbIndex ?? 0
          );

          this.points.beginX = x - tx; // - 30; // - (startNode?.width ?? 0) + 20 + 50; // where does "150" come from?
          this.points.beginY = y - ty;
        }
        if (endThumb && endNode && endNode.id === target.id) {
          const tx = endThumb.x;
          const ty = endThumb.y;
          this.points.beginX = x - tx; // + 30; // where do "20" and "50" come from?
          this.points.beginY = y - ty;
        }

        if (rectContainerElement) {
          rectContainerElement.x = this.points.beginX;
          rectContainerElement.y = this.points.beginY;
        }

        const begin = getPoint(this.points.beginX, this.points.beginY);

        const pathPoints = {
          beginX: begin.x,
          beginY: begin.y,
          width: this.points.width,
          height: this.points.height,
        };

        const bbox = this.getBBoxPath(pathPoints);

        const divDomElement =
          rectContainerElement.domElement as unknown as HTMLElement;
        divDomElement.style.width = `${bbox.width}px`;
        divDomElement.style.height = `${bbox.height}px`;
        divDomElement.style.transform = `translate(${bbox.x}px, ${bbox.y}px)`;

        if (rectContainerElement) {
          rectContainerElement.x = this.points.beginX;
          rectContainerElement.y = this.points.beginY;
          rectContainerElement.width = this.points.width;
          rectContainerElement.height = this.points.height;
        }

        const astDomElement = astElement.domElement as unknown as HTMLElement;
        astDomElement.style.width = `${bbox.width}px`;
        astDomElement.style.height = `${bbox.height}px`;
      }

      if (rectContainerElement) {
        // get all connections that have this node as start or end
        rectContainerElement.connections?.forEach((connection) => {
          if (
            initiator?.nodeType === NodeType.Connection &&
            connection.id === initiator.id
          ) {
            return;
          }
          if (connection.nodeType === NodeType.Connection) {
            const start =
              connection.startNode === rectContainerElement && connection;
            const end =
              connection.endNode === rectContainerElement && connection;
            if (
              start &&
              connection &&
              connection.update &&
              rectContainerElement
            ) {
              connection.update(
                connection,
                this.points.beginX,
                this.points.beginY,
                rectContainerElement
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
            if (
              end &&
              connection &&
              connection.update &&
              rectContainerElement
            ) {
              connection.update(
                connection,
                this.points.beginX,
                this.points.beginY,
                rectContainerElement
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
      }

      return true;
    };
}
