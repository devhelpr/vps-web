import {
  createElement,
  createNamedSignal,
  INodeComponent,
  ThumbConnectionType,
  ThumbType,
} from '@devhelpr/visual-programming-system';
import { FormComponent, FormFieldType } from '../components/form-component';
import { canvasAppReturnType, NodeInfo } from '../types/node-info';
import { compileExpression } from '@devhelpr/expression-compiler';

export const getExpression = () => {
  let node: INodeComponent<NodeInfo>;

  const initializeCompute = () => {
    return;
  };
  const compute = (input: string) => {
    const runExpression = compileExpression(
      node.nodeInfo.formValues?.['Expression'] ?? ''
    );

    let result: any = false;
    try {
      result = runExpression({ input: input });
    } catch (error) {
      result = false;
      console.log('expression error', error);
    }
    return {
      result,
      followPath: undefined,
    };
  };

  return {
    createVisualNode: (
      canvasApp: canvasAppReturnType,
      x: number,
      y: number
    ) => {
      const formElements = [
        {
          fieldType: FormFieldType.Text,
          fieldName: 'Expression',
          value: '',
          onChange: (value: string) => {
            node.nodeInfo.formValues = {
              ...node.nodeInfo.formValues,
              Expression: value,
            };
            console.log('onChange', node.nodeInfo);
          },
        },
      ];

      const jsxComponentWrapper = createElement(
        'div',
        {
          class: `bg-slate-500 p-4 rounded cursor-pointer`,
        },
        undefined,
        FormComponent({
          id: 'test',
          formElements,
          hasSubmitButton: false,
          onSave: (formValues) => {
            //
          },
        }) as unknown as HTMLElement
      ) as unknown as INodeComponent<NodeInfo>;

      const rect = canvasApp.createRect(
        x,
        y,
        200,
        100,
        undefined,
        undefined,
        [
          {
            thumbType: ThumbType.StartConnectorCenter,
            thumbIndex: 0,
            connectionType: ThumbConnectionType.start,
          },
          {
            thumbType: ThumbType.EndConnectorCenter,
            thumbIndex: 0,
            connectionType: ThumbConnectionType.end,
          },
        ],
        jsxComponentWrapper,
        {
          classNames: `bg-slate-500 p-4 rounded`,
        }
      );
      rect.nodeComponent.nodeInfo = {};
      rect.nodeComponent.nodeInfo.formElements = formElements;

      createNamedSignal(`expression${rect.nodeComponent.id}`, '');
      node = rect.nodeComponent;
      node.nodeInfo.compute = compute;
      node.nodeInfo.initializeCompute = initializeCompute;
    },
  };
};
