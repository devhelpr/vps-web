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
import {
  createElementFromTemplate,
  createTemplate,
} from '@devhelpr/dom-components';

const fieldName = 'time';
const labelName = 'Time';
const nodeName = 'time-node';
const familyName = 'flow-canvas';
const thumbConstraint = 'value';
const thumbs = [
  {
    thumbType: ThumbType.StartConnectorCenter,
    thumbIndex: 0,
    connectionType: ThumbConnectionType.start,
    color: 'white',
    label: ' ',
    thumbConstraint: thumbConstraint,
    maxConnections: -1,
  },
];

export const getTimeNode: NodeTaskFactory<any> = (
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
    return {
      result: `u_time`,
      output: input,
      followPath: undefined,
    };
  };

  const element = createElementFromTemplate(
    createTemplate(`<div class="loader"></div>`)
  );

  return visualNodeFactory(
    nodeName,
    labelName,
    familyName,
    fieldName,
    compute,
    initializeCompute,
    false,
    100,
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
      additionalClassNames: 'flex-wrap flex-col',
      childNodeWrapperClass: 'w-full block text-center',
    },
    element
  );
};
