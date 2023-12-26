import {
  ElementNodeMap,
  Flow,
  IConnectionNodeComponent,
  INodeComponent,
  NodeType,
} from '@devhelpr/visual-programming-system';
import { NodeInfo } from '../types/node-info';

export const cleanupNodeInfoForSerializing = (
  nodeInfo: NodeInfo | undefined
) => {
  const nodeInfoCopy: any = {};
  if (nodeInfo) {
    for (const key in nodeInfo) {
      if (
        typeof (nodeInfo as any)[key] !== 'function' &&
        key !== 'formElements' &&
        key !== 'canvasAppInstance' &&
        key !== 'stateMachine'
      ) {
        let value = (nodeInfo as any)[key];
        if (key === 'decorators' && value) {
          const decorators: any[] = [];
          for (const decorator of value) {
            decorators.push({
              taskType: decorator.taskType,
              formValues: decorator.formValues,
              executeOrder: decorator.executeOrder,
            });
          }
          value = decorators;
        }
        nodeInfoCopy[key] = value;
      }
    }
  }
  return nodeInfoCopy;
};

export const serializeElementsMap = (elements: ElementNodeMap<NodeInfo>) => {
  const filteredElements = Array.from(elements).filter((entry) => {
    const obj = entry[1] as INodeComponent<NodeInfo>;
    if (obj.nodeType === NodeType.Connection) {
      const connection = obj as unknown as IConnectionNodeComponent<NodeInfo>;
      if (!connection.isAnnotationConnection) {
        return true;
      } else {
        return false;
      }
    }
    return true;
  });
  const nodesList = Array.from(filteredElements, function (entry) {
    const obj = entry[1] as INodeComponent<NodeInfo>;
    if (obj.nodeType === NodeType.Connection) {
      const connection = obj as unknown as IConnectionNodeComponent<NodeInfo>;
      return {
        id: connection.id,
        x: connection.x,
        y: connection.y,
        endX: connection.endX,
        endY: connection.endY,
        startNodeId: connection.startNode?.id,
        endNodeId: connection.endNode?.id,
        startThumbName: connection.startNodeThumb?.thumbName,
        endThumbName: connection.endNodeThumb?.thumbName,
        lineType: connection.lineType,
        nodeType: obj.nodeType,
        layer: connection.layer ?? 1,
        nodeInfo: cleanupNodeInfoForSerializing(connection.nodeInfo),
      };
    }

    let elements: any = undefined;
    if (obj.nodeInfo && obj.nodeInfo.canvasAppInstance) {
      elements = serializeElementsMap(obj.nodeInfo.canvasAppInstance.elements);

      console.log('SUB ELEMENTS FOUND ', elements);
    }
    return {
      id: obj.id,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      nodeType: obj.nodeType,
      elements,
      nodeInfo: cleanupNodeInfoForSerializing(obj.nodeInfo),
    };
  });
  return nodesList;
};

export const exportFlowToJson = (
  id: string,
  nodesList: ReturnType<typeof serializeElementsMap>
) => {
  const flow: Flow<NodeInfo> = {
    schemaType: 'flow',
    schemaVersion: '0.0.1',
    id: id,
    flows: {
      flow: {
        flowType: 'flow',
        nodes: nodesList,
      },
    },
  };
  return JSON.stringify(flow, null, 2);
};
