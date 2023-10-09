/* eslint-disable @typescript-eslint/no-unused-vars */
import { thumbHalfWidth, thumbHalfHeight } from '../constants/measures';
import { InteractionStateMachine } from '../interaction-state-machine';
import {
  ElementNodeMap,
  IConnectionNodeComponent,
  IElementNode,
  INodeComponent,
  IRectNodeComponent,
  IThumbNodeComponent,
} from '../interfaces/element';
import {
  createEffect,
  getVisbility,
  getSelectedNode,
  setSelectNode,
} from '../reactivity';
import { ConnectionControllerType, NodeType, ThumbType } from '../types';
import { LineType } from '../types/line-type';
import { Connection } from './connection';
import { ThumbNode } from './thumb';
import { onQuadraticCalculateControlPoints } from './utils/calculate-quadratic-control-points';
import { pointOnRect } from './utils/intersect-line';
import { intersectionCircleLine } from './utils/vector-math';

export class LineConnection<T> extends Connection<T> {
  startPointElement: IThumbNodeComponent<T> | undefined;
  endPointElement: IThumbNodeComponent<T> | undefined;

  constructor(
    canvas: INodeComponent<T>,
    interactionStateMachine: InteractionStateMachine<T>,
    pathHiddenElement: IElementNode<T>,
    elements: ElementNodeMap<T>,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    controlPoint1X: number,
    controlPoint1Y: number,
    isControlled = false,
    isDashed = false,
    canvasUpdated?: () => void,
    id?: string,
    containerNode?: IRectNodeComponent<T>
  ) {
    super(
      canvas,
      interactionStateMachine,
      elements,
      startX,
      startY,
      endX,
      endY,
      controlPoint1X,
      controlPoint1Y,
      0,
      0,
      pathHiddenElement,
      isDashed,
      onQuadraticCalculateControlPoints,
      canvasUpdated,
      id,
      containerNode
    );
    if (!this.nodeComponent) {
      throw new Error('nodeComponent is undefined');
    }
    this.nodeComponent.lineType = LineType.Straight;
    this.nodeComponent.isControlled = isControlled;
    this.nodeComponent.onClick = () => {
      if (!this.nodeComponent || this.nodeComponent?.isControlled) {
        return;
      }
      console.log('connection click', this.nodeComponent.id);
      setSelectNode({
        id: this.nodeComponent.id,
        containerNode: this.nodeComponent
          .containerNode as unknown as INodeComponent<unknown>,
      });
    };

    function setPosition(
      element: INodeComponent<T>,
      x: number,
      y: number,
      updateConnection = true
    ) {
      (
        element.domElement as unknown as HTMLElement | SVGElement
      ).style.transform = `translate(${x}px, ${y}px)`;

      if (!updateConnection) {
        return;
      }

      // update the connection of this thumb
      if (element.parent && element.parent.update) {
        element.parent.update(
          element.parent,
          x + thumbHalfWidth,
          y + thumbHalfHeight,
          element
        );
      }
    }
    const startPointNode = new ThumbNode<T>(
      canvas.domElement,
      canvas,
      interactionStateMachine,
      this.nodeComponent.elements,
      'start',
      ThumbType.Start,
      undefined,
      '#ff000080',
      startX,
      startY,
      ConnectionControllerType.begin,
      NodeType.ConnectionController,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      false // disableInteraction
    );
    if (!startPointNode.nodeComponent) {
      throw new Error('startPointNode.nodeComponent is undefined');
    }
    startPointNode.nodeComponent.parent = this.nodeComponent;
    startPointNode.nodeComponent.isControlled = isControlled;
    startPointNode.nodeComponent.update = (
      target?: INodeComponent<T>,
      x?: number,
      y?: number,
      initiator?: INodeComponent<T>
    ) => {
      if (!target || x === undefined || y === undefined || !initiator) {
        return false;
      }
      if (this.nodeComponent?.startNode) {
        startPointNode.setDisableInteraction();
      }

      setPosition(target, x, y, initiator?.nodeType !== NodeType.Connection);
      return true;
    };
    this.svgParent?.domElement.after(startPointNode.nodeComponent.domElement);

    const endPointNode = new ThumbNode<T>(
      canvas.domElement,
      canvas,
      interactionStateMachine,
      this.nodeComponent.elements,
      'end',
      ThumbType.End,
      undefined,
      '#ff000080',
      endX,
      endY,
      ConnectionControllerType.end,
      NodeType.ConnectionController,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
    if (!endPointNode.nodeComponent) {
      throw new Error('endPointNode.nodeComponent is undefined');
    }
    endPointNode.nodeComponent.parent = this.nodeComponent;
    endPointNode.nodeComponent.isControlled = isControlled;
    endPointNode.nodeComponent.update = (
      target?: INodeComponent<T>,
      x?: number,
      y?: number,
      initiator?: INodeComponent<T>
    ) => {
      if (!target || x === undefined || y === undefined || !initiator) {
        return false;
      }

      if (this.nodeComponent?.endNode) {
        endPointNode.setDisableInteraction();
      }
      setPosition(target, x, y, initiator?.nodeType !== NodeType.Connection);
      return true;
    };
    this.svgParent?.domElement.after(endPointNode.nodeComponent.domElement);

    this.nodeComponent.connectionStartNodeThumb = startPointNode.nodeComponent;
    this.nodeComponent.connectionEndNodeThumb = endPointNode.nodeComponent;

    createEffect(() => {
      const visibility = getVisbility(); //&& selectedNode && selectedNode === connection.id;
      if (!startPointNode.nodeComponent || !endPointNode.nodeComponent) {
        return;
      }
      (
        startPointNode.nodeComponent.domElement as unknown as SVGElement
      ).style.display = visibility ? 'block' : 'none';
      (
        endPointNode.nodeComponent.domElement as unknown as SVGElement
      ).style.display = visibility ? 'block' : 'none';
    });

    this.startPointElement = startPointNode.nodeComponent;
    this.endPointElement = endPointNode.nodeComponent;
  }

  getLinePath(
    bbox: { x: number; y: number },
    startOffsetX: number,
    startOffsetY: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    const isCircleStart = this.nodeComponent?.startNode?.isCircle ?? false;
    const isCircleEnd = this.nodeComponent?.endNode?.isCircle ?? false;

    const spacingAABB = 10;
    const circlePadding = 10;

    let newX1 = x1;
    let newY1 = y1;
    let newX2 = x2;
    let newY2 = y2;

    if (isCircleStart) {
      const circleRadius =
        (this.nodeComponent?.startNode?.width ?? 100) / 2 + circlePadding;
      const intersection = intersectionCircleLine(
        {
          center: { x: x1, y: y1 },
          radius: circleRadius,
        },
        { p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } }
      );
      if (intersection.length > 0) {
        newX1 = intersection[0].x;
        newY1 = intersection[0].y;
      }
    } else if (this.nodeComponent?.startNode) {
      const xleft =
        this.nodeComponent.startNode.x - bbox.x + startOffsetX - spacingAABB;
      const yleft =
        this.nodeComponent.startNode.y - bbox.y + startOffsetY - spacingAABB;
      const width = (this.nodeComponent.startNode.width ?? 0) + spacingAABB * 2;
      const height =
        (this.nodeComponent.startNode.height ?? 0) + spacingAABB * 2;

      const start = pointOnRect(
        x2,
        y2,
        xleft,
        yleft,
        xleft + width,
        yleft + height,
        false
      );
      if (start) {
        newX1 = start.x;
        newY1 = start.y;
      }
    }

    if (isCircleEnd) {
      const circleRadius =
        (this.nodeComponent?.endNode?.width ?? 100) / 2 + circlePadding;
      const intersection = intersectionCircleLine(
        {
          center: { x: x2, y: y2 },
          radius: circleRadius,
        },
        { p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } }
      );
      if (intersection.length > 0) {
        newX2 = intersection[0].x;
        newY2 = intersection[0].y;
      }
    } else {
      if (this.nodeComponent?.endNode) {
        const xleft =
          this.nodeComponent.endNode.x - bbox.x + startOffsetX - spacingAABB;
        const yleft =
          this.nodeComponent.endNode.y - bbox.y + startOffsetY - spacingAABB;
        const width = (this.nodeComponent.endNode.width ?? 0) + spacingAABB * 2;
        const height =
          (this.nodeComponent.endNode.height ?? 0) + spacingAABB * 2;

        const end = pointOnRect(
          x1,
          y1,
          xleft,
          yleft,
          xleft + width,
          yleft + height,
          false
        );
        if (end) {
          newX2 = end.x;
          newY2 = end.y;
        }
      }
    }

    return `M${newX1} ${newY1} ${newX2} ${newY2}`;
  }

  protected override initializeControlPoints() {
    return [{ x: 0, y: 0 }];
  }

  protected override setControlPoints(): { x: number; y: number }[] {
    return [{ x: this.points.cx1, y: this.points.cy1 }];
  }

  protected override updateControlPoints(): void {
    if (
      this.nodeComponent &&
      this.nodeComponent.controlPoints &&
      this.nodeComponent.controlPoints.length === 1
    ) {
      this.nodeComponent.controlPoints[0].x = this.points.cx1;
      this.nodeComponent.controlPoints[0].y = this.points.cy1;
    }
  }

  protected override getPath(
    bbox: { x: number; y: number; width: number; height: number },
    startOffsetX: number,
    startOffsetY: number,
    endOffsetX: number,
    endOffsetY: number
  ): string {
    return `M${this.points.beginX - bbox.x + startOffsetX} ${
      this.points.beginY - bbox.y + startOffsetY
    } ${this.points.endX - bbox.x + endOffsetX} ${
      this.points.endY - bbox.y + endOffsetY
    }`;
  }

  protected override setHiddenPath(
    startOffsetX: number,
    startOffsetY: number,
    endOffsetX: number,
    endOffsetY: number
  ): void {
    if (this.pathHiddenElement) {
      const x1 = this.points.beginX + startOffsetX;
      const y1 = this.points.beginY + startOffsetY;
      const x2 = this.points.endX + endOffsetX;
      const y2 = this.points.endY + endOffsetY;

      const path = this.getLinePath(
        { x: 0, y: 0 },
        startOffsetX,
        startOffsetY,
        x1,
        y1,
        x2,
        y2
      );

      (this.pathHiddenElement.domElement as HTMLElement).setAttribute(
        'd',
        path
      );
    }
  }

  protected override setPath(
    bbox: { x: number; y: number; width: number; height: number },
    startOffsetX: number,
    startOffsetY: number,
    endOffsetX: number,
    endOffsetY: number
  ): void {
    const x1 = this.points.beginX - bbox.x + startOffsetX;
    const y1 = this.points.beginY - bbox.y + startOffsetY;
    const x2 = this.points.endX - bbox.x + endOffsetX;
    const y2 = this.points.endY - bbox.y + endOffsetY;
    const path = this.getLinePath(
      bbox,
      startOffsetX,
      startOffsetY,
      x1,
      y1,
      x2,
      y2
    );

    (this.pathElement?.domElement as HTMLElement).setAttribute('d', path);
    (this.pathTransparentElement?.domElement as HTMLElement).setAttribute(
      'd',
      path
    );
  }
}
