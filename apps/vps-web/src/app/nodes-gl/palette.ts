import {
  CanvasAppInstance,
  IRectNodeComponent,
  ThumbConnectionType,
  ThumbType,
} from '@devhelpr/visual-programming-system';
import { NodeInfo } from '../types/node-info';
import { RunNodeResult } from '../simple-flow-engine/simple-flow-engine';
import {
  InitialValues,
  NodeTask,
  NodeTaskFactory,
} from '../node-task-registry';
import { visualNodeFactory } from '../node-task-registry/createRectNode';

const fieldName = 'palette';
const labelName = 'Palette';
const nodeName = 'palette';
const familyName = 'flow-canvas';
const thumbConstraint = 'value';
const thumbs = [
  {
    thumbType: ThumbType.StartConnectorCenter,
    thumbIndex: 0,
    connectionType: ThumbConnectionType.start,
    color: 'white',
    label: ' ',
    thumbConstraint: 'vec3',
    maxConnections: -1,
  },
  {
    thumbType: ThumbType.EndConnectorCenter,
    thumbIndex: 0,
    connectionType: ThumbConnectionType.end,
    color: 'white',
    label: ' ',

    name: 'index',
    thumbConstraint: thumbConstraint,
    prefixLabel: 'index',
  },
];

export const getPaletteNode: NodeTaskFactory<any> = (
  updated: () => void
): NodeTask<any> => {
  let node: IRectNodeComponent<any>;
  let contextInstance: CanvasAppInstance<any> | undefined = undefined;
  const initializeCompute = () => {
    return;
  };
  const compute = (
    input: string,
    pathExecution?: RunNodeResult<NodeInfo>[],
    loopIndex?: number,
    payload?: any
  ) => {
    const value = payload?.['index'];
    return {
      result: `chooseColor2(${value})`,
      output: input,
      followPath: undefined,
    };
  };

  return visualNodeFactory(
    nodeName,
    labelName,
    familyName,
    fieldName,
    compute,
    initializeCompute,
    false,
    200,
    100,
    thumbs,
    (values?: InitialValues) => {
      return [];
    },
    (nodeInstance) => {
      contextInstance = nodeInstance.contextInstance;
      node = nodeInstance.node;
    },
    {
      hasTitlebar: false,
    }
  );
};
