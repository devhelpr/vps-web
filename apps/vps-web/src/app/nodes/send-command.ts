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
  compileExpressionAsInfo,
  runExpression,
} from '@devhelpr/expression-compiler';
import { RunNodeResult } from '../simple-flow-engine/simple-flow-engine';
import {
  InitialValues,
  NodeTask,
  NodeTaskFactory,
} from '../node-task-registry';

export const getSendCommand: NodeTaskFactory<NodeInfo> = (
  updated: () => void
): NodeTask<NodeInfo> => {
  let node: IRectNodeComponent<NodeInfo>;
  let canvasAppInstance: CanvasAppInstance<NodeInfo>;

  const runCommandParameterExpression = (
    expression: string,
    loopIndex: number,
    value: string
  ) => {
    const compiledExpressionInfo = compileExpressionAsInfo(expression);
    const expressionFunction = (
      new Function(
        'payload',
        `${compiledExpressionInfo.script}`
      ) as unknown as (payload?: any) => any
    ).bind(compiledExpressionInfo.bindings);

    const payloadForExpression = {
      value: value,
      index: loopIndex ?? 0,
      runIteration: loopIndex ?? 0,
      random: Math.round(Math.random() * 100),
    };
    canvasAppInstance?.getVariableNames().forEach((variableName) => {
      Object.defineProperties(payloadForExpression, {
        [variableName]: {
          get: () => {
            console.log('get', variableName);
            return canvasAppInstance?.getVariable(variableName);
          },
          set: (value) => {
            canvasAppInstance?.setVariable(variableName, value);
          },
        },
      });
    });

    return runExpression(
      expressionFunction,
      payloadForExpression,
      false,
      compiledExpressionInfo.payloadProperties
    );
  };
  const isCommmand = (input: string) => {
    // detecting function call
    // [\w]+\(([^\(\)]+)\)
    return typeof input === 'string' && input.match(/[\w]+\(([^()]*)\)/);
  };

  const initializeCompute = () => {
    return;
  };
  const compute = (
    input: string,
    pathExecution?: RunNodeResult<NodeInfo>[],
    loopIndex?: number,
    payload?: any
  ) => {
    const command = node?.nodeInfo?.formValues?.['command'] ?? '';
    if (isCommmand(command)) {
      const match = command.match(/([\w]+)\(([^()]*)\)/);
      if (match) {
        const commandName = match[1];
        const args = match[2];
        const parsedArguments = args
          .split(',')
          .map((x: string) =>
            runCommandParameterExpression(x, loopIndex ?? 0, input)
          );

        const result = `${commandName}(${parsedArguments.join(',')})`;
        return {
          result,
          followPath: undefined,
        };
      }
    }
    return {
      stop: true,
    };
  };

  return {
    name: 'send-command',
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
      const initialValue = initalValues?.['command'] ?? '';
      canvasAppInstance = canvasApp;

      const formElements = [
        {
          fieldType: FormFieldType.Text,
          fieldName: 'command',
          value: initialValue ?? '',
          onChange: (value: string) => {
            if (!node.nodeInfo) {
              return;
            }
            node.nodeInfo.formValues = {
              ...node.nodeInfo.formValues,
              command: value,
            };
            console.log('onChange', node.nodeInfo);
            if (updated) {
              updated();
            }
          },
        },
      ];

      const componentWrapper = createElement(
        'div',
        {
          class: `inner-node bg-slate-500 p-4 rounded`,
        },
        undefined
      ) as unknown as INodeComponent<NodeInfo>;

      FormComponent({
        rootElement: componentWrapper.domElement as HTMLElement,
        id: id ?? '',
        formElements,
        hasSubmitButton: false,
        onSave: (formValues) => {
          console.log('onSave', formValues);
        },
      }) as unknown as HTMLElement;

      const rect = canvasApp.createRect(
        x,
        y,
        200,
        100,
        undefined,
        [
          {
            thumbType: ThumbType.StartConnectorCenter,
            thumbIndex: 0,
            connectionType: ThumbConnectionType.start,
            color: 'white',
            label: 'C',
            thumbConstraint: 'command',
          },
          {
            thumbType: ThumbType.EndConnectorCenter,
            thumbIndex: 0,
            connectionType: ThumbConnectionType.end,
            color: 'white',
            label: ' ',
            //thumbConstraint: 'value',
          },
        ],
        componentWrapper,
        {
          classNames: `bg-slate-500 p-4 rounded`,
        },
        undefined,
        undefined,
        undefined,
        id,
        {
          type: 'send-command',
          formValues: {
            command: initialValue ?? '',
          },
        },
        containerNode
      );
      if (!rect.nodeComponent) {
        throw new Error('rect.nodeComponent is undefined');
      }

      node = rect.nodeComponent;
      if (node.nodeInfo) {
        node.nodeInfo.formElements = formElements;
        node.nodeInfo.compute = compute;
        node.nodeInfo.initializeCompute = initializeCompute;
      }
      return node;
    },
  };
};
