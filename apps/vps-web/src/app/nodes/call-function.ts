import {
  createElement,
  INodeComponent,
  IRectNodeComponent,
  ThumbConnectionType,
  ThumbType,
} from '@devhelpr/visual-programming-system';
import { FormComponent, FormFieldType } from '../components/form-component';
import { canvasAppReturnType, NodeInfo } from '../types/node-info';
import {
  compileExpressionAsInfo,
  runExpression,
} from '@devhelpr/expression-compiler';
import { RunNodeResult } from '../simple-flow-engine/simple-flow-engine';
import { InitialValues, NodeTask } from '../node-task-registry';
import { AnimatePathFunction } from '../follow-path/animate-path';
import { runNode } from '../simple-flow-engine/simple-flow-engine';

export const getCallFunction =
  (animatePath: AnimatePathFunction<NodeInfo>) =>
  (updated: () => void): NodeTask<NodeInfo> => {
    let node: IRectNodeComponent<NodeInfo>;
    let canvasAppInstance: canvasAppReturnType;

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
    const computeAsync = (
      input: string,
      pathExecution?: RunNodeResult<NodeInfo>[],
      loopIndex?: number,
      payload?: any
    ) => {
      return new Promise((resolve, reject) => {
        const command = node.nodeInfo.formValues?.['functionCall'] ?? '';
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

            let isFunctionFound = false;
            canvasAppInstance.elements.forEach((element) => {
              if (element.nodeInfo?.type === 'function') {
                if (
                  !isFunctionFound &&
                  element.nodeInfo.formValues?.['node'] === commandName
                ) {
                  isFunctionFound = true;
                  runNode<NodeInfo>(
                    element as IRectNodeComponent<NodeInfo>,
                    canvasAppInstance,
                    animatePath,
                    (input) => {
                      resolve({
                        output: input,
                        result: input,
                        followPath: undefined,
                      });
                    },
                    {
                      a: parsedArguments?.[0] ?? 0,
                      b: parsedArguments?.[1] ?? 0,
                      trigger: 'TRIGGER',
                    } as unknown as string, // TODO : improve this!
                    []
                  );
                }
              }
            });
            return;
          }
        }
        resolve({
          stop: true,
        });
      });
    };

    return {
      name: 'call-function',
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
        const initialValue = initalValues?.['functionCall'] ?? '';
        canvasAppInstance = canvasApp;

        const formElements = [
          {
            fieldType: FormFieldType.Text,
            fieldName: 'functionCall',
            value: initialValue ?? '',
            onChange: (value: string) => {
              node.nodeInfo.formValues = {
                ...node.nodeInfo.formValues,
                functionCall: value,
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
              label: ' ',
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
            type: 'call-function',
            formValues: {
              functionCall: initialValue ?? '',
            },
          },
          containerNode
        );
        if (!rect.nodeComponent) {
          throw new Error('rect.nodeComponent is undefined');
        }
        rect.nodeComponent.nodeInfo.formElements = formElements;

        node = rect.nodeComponent;
        node.nodeInfo.computeAsync = computeAsync;
        node.nodeInfo.initializeCompute = initializeCompute;
        return node;
      },
    };
  };
