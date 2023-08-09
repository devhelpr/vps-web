import {
  createElement,
  INodeComponent,
  ThumbConnectionType,
  ThumbType,
} from '@devhelpr/visual-programming-system';
import { RunNodeResult } from '../simple-flow-engine/simple-flow-engine';
import { canvasAppReturnType, NodeInfo } from '../types/node-info';

export const getAction = (updated?: () => void) => {
  let node: INodeComponent<NodeInfo>;

  let currentValue = 0;
  const initializeCompute = () => {
    currentValue = 0;
    return;
  };
  const compute = (
    input: string,
    pathExecution?: RunNodeResult<NodeInfo>[],
    loopIndex?: number
  ) => {
    return {
      result: input,
      followPath: undefined,
    };
  };
  return {
    createVisualNode: (
      canvasApp: canvasAppReturnType,
      x: number,
      y: number,
      id?: string
    ) => {
      const jsxComponentWrapper = createElement(
        'div',
        {
          class:
            'flex text-center items-center justify-center w-[200px] h-[100px] overflow-hidden bg-slate-500 rounded',
          style: {},
        },
        undefined,
        'action'
      ) as unknown as INodeComponent<NodeInfo>;

      const rect = canvasApp.createRectThumb(
        x,
        y,
        200,
        100,
        undefined,
        [
          {
            thumbType: ThumbType.Center,
            thumbIndex: 0,
            connectionType: ThumbConnectionType.startOrEnd,
            color: 'white',
            label: '#',
            thumbConstraint: 'action',
            name: 'state',
            hidden: true,
          },
        ],
        jsxComponentWrapper,
        {
          classNames: `bg-slate-500 p-4 rounded`,
        },
        undefined,
        undefined,
        undefined,
        id,
        {
          formElements: [],
          type: 'action',
          formValues: {},
        }
      );

      if (!rect.nodeComponent) {
        throw new Error('rect.nodeComponent is undefined');
      }
      node = rect.nodeComponent;
      node.nodeInfo.compute = compute;
      node.nodeInfo.initializeCompute = initializeCompute;
    },
  };
};
