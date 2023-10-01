import {
  createElement,
  IElementNode,
  INodeComponent,
  IRectNodeComponent,
  ThumbConnectionType,
  ThumbType,
} from '@devhelpr/visual-programming-system';
import { canvasAppReturnType, NodeInfo } from '../types/node-info';
import { InitialValues, NodeTask } from '../node-task-registry';
import { AnimatePathFunction } from '../follow-path/animate-path';
import { FormFieldType } from '../components/form-component';

export const getNodeTriggerTarget =
  (animatePath: AnimatePathFunction<NodeInfo>) =>
  (updated: () => void): NodeTask<NodeInfo> => {
    let node: IRectNodeComponent<NodeInfo>;
    let divElement: IElementNode<NodeInfo>;
    const initializeCompute = () => {
      return;
    };
    const compute = (input: string) => {
      if (!node?.nodeInfo?.formValues?.['node']) {
        return {
          result: false,
          stop: true,
        };
      }
      if (input === 'TRIGGER') {
        return {
          result: true,
        };
      }
      return {
        result: false,
        stop: true,
      };
    };

    return {
      name: 'node-trigger-target',
      family: 'flow-canvas',
      isContainer: false,
      createVisualNode: <NodeInfo>(
        canvasApp: canvasAppReturnType,
        x: number,
        y: number,
        id?: string,
        initalValues?: InitialValues,
        containerNode?: IRectNodeComponent<NodeInfo>
      ) => {
        const initialValue = initalValues?.['node'] || '';

        const formElements = [
          {
            fieldType: FormFieldType.Text,
            fieldName: 'node',
            value: initialValue,
            onChange: (value: string) => {
              node.nodeInfo.formValues = {
                ...node.nodeInfo.formValues,
                node: value,
              };
              divElement.domElement.textContent =
                node.nodeInfo.formValues['node'] || '';

              if (updated) {
                updated();
              }
            },
          },
        ];

        const componentWrapper = createElement(
          'div',
          {
            class: `inner-node bg-sky-900 p-4 rounded flex flex-row justify-center items-center`,
          },
          undefined
        ) as unknown as INodeComponent<NodeInfo>;

        divElement = createElement(
          'div',
          {
            class: `text-center block text-white font-bold`,
          },
          componentWrapper.domElement
        );

        divElement.domElement.textContent = initialValue || '';

        const rect = canvasApp.createRect(
          x,
          y,
          100,
          100,
          undefined,

          [
            {
              thumbType: ThumbType.StartConnectorCenter,
              thumbIndex: 0,
              connectionType: ThumbConnectionType.start,
              color: 'white',
              label: ' ',
            },
          ],
          componentWrapper,
          {
            classNames: `bg-sky-900 py-4 px-2 rounded`,
          },
          false,
          undefined,
          undefined,
          id,
          {
            type: 'node-trigger-target',
            formValues: {
              node: initialValue || '',
            },
          },
          containerNode
        );
        if (!rect.nodeComponent) {
          throw new Error('rect.nodeComponent is undefined');
        }
        rect.nodeComponent.nodeInfo.formElements = formElements;

        node = rect.nodeComponent;
        node.nodeInfo.compute = compute;
        node.nodeInfo.initializeCompute = initializeCompute;

        return node;
      },
    };
  };
