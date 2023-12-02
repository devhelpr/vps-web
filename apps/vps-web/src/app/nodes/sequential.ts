import {
  CanvasAppInstance,
  createElement,
  INodeComponent,
  IRectNodeComponent,
  ThumbConnectionType,
  ThumbType,
} from '@devhelpr/visual-programming-system';
import { FormComponent, FormFieldType } from '../components/form-component';
import { NodeInfo } from '../types/node-info';

import {
  RunNodeResult,
  runNodeFromThumb,
} from '../simple-flow-engine/simple-flow-engine';
import {
  InitialValues,
  NodeTask,
  NodeTaskFactory,
} from '../node-task-registry';
import {
  animatePathFromThumb,
  AnimatePathFromThumbFunction,
  AnimatePathFunction,
} from '../follow-path/animate-path';

export const getSequential =
  (
    animatePath: AnimatePathFunction<NodeInfo>,
    animatePathFromThumb: AnimatePathFromThumbFunction<NodeInfo>
  ) =>
  (updated: () => void): NodeTask<NodeInfo> => {
    let node: IRectNodeComponent<NodeInfo>;

    const initializeCompute = () => {
      return;
    };
    const computeAsync = (
      input: string,
      pathExecution?: RunNodeResult<NodeInfo>[],
      loopIndex?: number,
      payload?: any
    ) => {
      return new Promise((resolve, reject) => {
        if (!node.thumbConnectors || node.thumbConnectors.length < 2) {
          reject();
          return;
        }
        runNodeFromThumb(
          node.thumbConnectors[0],
          animatePathFromThumb,
          (inputFromFirstRun: string | any[]) => {
            console.log('Sequential inputFromFirstRun', inputFromFirstRun);
            if (!node.thumbConnectors || node.thumbConnectors.length < 2) {
              reject();
              return;
            }
            runNodeFromThumb(
              node.thumbConnectors[1],
              animatePathFromThumb,
              (inputFromSecondRun: string | any[]) => {
                console.log(
                  'Sequential inputFromSecondRun',
                  inputFromSecondRun
                );
                resolve({
                  result: input,
                  stop: true,
                });
              },
              input,
              pathExecution,
              node,
              0
            );
          },
          input,
          pathExecution,
          node,
          0
        );
      });
    };

    return {
      name: 'sequential',
      family: 'flow-canvas',
      isContainer: false,
      createVisualNode: (
        canvasApp: CanvasAppInstance<NodeInfo>,
        x: number,
        y: number,
        id?: string,
        initalValues?: InitialValues,
        containerNode?: IRectNodeComponent<NodeInfo>
      ) => {
        const initialValue = initalValues?.['expression'] ?? '';

        const jsxComponentWrapper = createElement(
          'div',
          {
            class: `inner-node bg-slate-500 p-4 rounded`,
            style: {
              'clip-path': 'polygon(0 50%, 100% 0, 100% 100%)',
            },
          },
          undefined
        ) as unknown as INodeComponent<NodeInfo>;

        const rect = canvasApp.createRect(
          x,
          y,
          110,
          110,
          undefined,
          [
            {
              thumbType: ThumbType.StartConnectorRight,
              thumbIndex: 0,
              connectionType: ThumbConnectionType.start,
              color: 'white',
              label: ' ',
              name: 'output1',
            },
            {
              thumbType: ThumbType.StartConnectorRight,
              thumbIndex: 1,
              connectionType: ThumbConnectionType.start,
              color: 'white',
              label: ' ',
              name: 'output2',
            },
            {
              thumbType: ThumbType.EndConnectorCenter,
              thumbIndex: 0,
              connectionType: ThumbConnectionType.end,
              color: 'white',
              label: ' ',
            },
          ],
          jsxComponentWrapper,
          {
            classNames: `bg-slate-500 p-4 rounded`,
          },
          true,
          undefined,
          undefined,
          id,
          {
            type: 'sequential',
            formValues: {},
          },
          containerNode
        );
        if (!rect.nodeComponent) {
          throw new Error('rect.nodeComponent is undefined');
        }

        node = rect.nodeComponent;
        if (node.nodeInfo) {
          node.nodeInfo.formElements = [];
          node.nodeInfo.computeAsync = computeAsync;
          node.nodeInfo.initializeCompute = initializeCompute;
        }
        return node;
      },
    };
  };
