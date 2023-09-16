import {
  createElement,
  INodeComponent,
  IRectNodeComponent,
  ThumbConnectionType,
  ThumbType,
} from '@devhelpr/visual-programming-system';
import { FormComponent, FormFieldType } from '../components/form-component';
import { canvasAppReturnType, NodeInfo } from '../types/node-info';
import { RunNodeResult } from '../simple-flow-engine/simple-flow-engine';
import {
  InitialValues,
  NodeTask,
  NodeTaskFactory,
} from '../node-task-registry';

export const getVariable: NodeTaskFactory<NodeInfo> = (
  updated: () => void
): NodeTask<NodeInfo> => {
  let node: IRectNodeComponent<NodeInfo>;
  let htmlNode: INodeComponent<NodeInfo> | undefined = undefined;
  let variableName = '';
  let currentValue = 0;
  const initializeCompute = () => {
    currentValue = 0;
    if (htmlNode) {
      (htmlNode.domElement as unknown as HTMLElement).textContent = '-';
    }
    return;
  };
  const compute = (
    input: string,
    pathExecution?: RunNodeResult<NodeInfo>[],
    loopIndex?: number
  ) => {
    let result: any = false;
    try {
      currentValue = parseFloat(input) ?? 0;
      if (isNaN(currentValue)) {
        currentValue = 0;
      }
      if (htmlNode) {
        (htmlNode.domElement as unknown as HTMLElement).textContent =
          currentValue.toString();
      }
      result = currentValue;
    } catch (error) {
      result = undefined;
    }

    return {
      result,
      followPath: undefined,
    };
  };

  const getData = () => {
    return currentValue;
  };
  const setData = (data: any) => {
    currentValue = data;
    if (htmlNode) {
      (htmlNode.domElement as unknown as HTMLElement).textContent =
        currentValue.toString();
    }
  };

  return {
    name: 'variable',
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
      variableName = initalValues?.['variableName'] ?? '';
      canvasApp.registerVariable(variableName, {
        getData,
        setData,
      });
      const formElements = [
        {
          fieldType: FormFieldType.Text,
          fieldName: 'variableName',
          value: initalValues?.['variableName'] ?? '',
          onChange: (value: string) => {
            node.nodeInfo.formValues = {
              ...node.nodeInfo.formValues,
              variableName: value,
            };
            canvasApp.unregisterVariable(variableName);
            variableName = value;
            canvasApp.registerVariable(variableName, {
              getData,
              setData,
            });
            console.log('onChange', node.nodeInfo);
            if (updated) {
              updated();
            }
          },
        },
      ];

      htmlNode = createElement(
        'div',
        {
          class: '',
        },
        undefined,
        '-'
      ) as unknown as INodeComponent<NodeInfo>;

      const componentWrapper = createElement(
        'div',
        {
          class: `inner-node bg-slate-500 p-4 rounded text-center`,
        },
        undefined,
        htmlNode.domElement as unknown as HTMLElement
      ) as unknown as INodeComponent<NodeInfo>;

      const rect = canvasApp.createRect(
        x,
        y,
        100,
        100,
        undefined,
        [],
        componentWrapper,
        {
          classNames: `bg-slate-500 p-4 rounded`,
        },
        undefined,
        undefined,
        undefined,
        id,
        {
          type: 'variable',
          formValues: {
            variableName: variableName,
          },
        },
        containerNode
      );
      if (!rect.nodeComponent) {
        throw new Error('rect.nodeComponent is undefined');
      }
      rect.nodeComponent.nodeInfo.formElements = formElements;

      node = rect.nodeComponent;
      node.nodeInfo.isVariable = true;
      node.nodeInfo.compute = compute;
      node.nodeInfo.sendData = compute;
      node.nodeInfo.getData = getData;
      node.nodeInfo.initializeCompute = initializeCompute;
      return node;
    },
  };
};
