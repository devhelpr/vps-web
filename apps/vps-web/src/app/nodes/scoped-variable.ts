import {
  CanvasAppInstance,
  createElement,
  IElementNode,
  INodeComponent,
  IRectNodeComponent,
  Rect,
  ThumbConnectionType,
  ThumbType,
} from '@devhelpr/visual-programming-system';
import { FormComponent, FormFieldType } from '../components/form-component';
import { NodeInfo } from '../types/node-info';
import { RunNodeResult } from '../simple-flow-engine/simple-flow-engine';
import {
  InitialValues,
  NodeTask,
  NodeTaskFactory,
} from '../node-task-registry';
import { showDictionaryData } from './data-viewers/dictionary';
import { showArrayData } from './data-viewers/array';

export const scopeVariableNodeName = 'scope-variable';

export const getScopedVariable: NodeTaskFactory<NodeInfo> = (
  updated: () => void
): NodeTask<NodeInfo> => {
  let canvasAppInstance: CanvasAppInstance<NodeInfo>;
  let rect: ReturnType<CanvasAppInstance<NodeInfo>['createRect']> | undefined =
    undefined;
  let node: IRectNodeComponent<NodeInfo>;
  let componentWrapper: IRectNodeComponent<NodeInfo>;
  let htmlNode: IElementNode<NodeInfo> | undefined = undefined;
  let tagNode: IElementNode<NodeInfo> | undefined = undefined;
  let variableName = '';
  let currentValue: any = 0;
  let timeout: any = undefined;

  let fieldType = 'value';
  let fieldValueType = 'number';
  let scopedData: Record<string, any> = {};

  const setDataForFieldType = (data: any, scopeId?: string) => {
    if (fieldType === 'value') {
      let value = data;
      if (typeof value === 'string') {
        value = parseFloat(value) || 0;
      }
      if (scopeId) {
        scopedData[scopeId] = value;
      } else {
        currentValue = value;
      }
    } else if (fieldType === 'dictionary') {
      if (scopeId) {
        if (!scopedData[scopeId]) {
          scopedData[scopeId] = {};
        }
      } else {
        if (!currentValue) {
          currentValue = {};
        }
      }
      if (data && data.key) {
        if (scopeId) {
          scopedData[scopeId][data.key] = data.value;
        } else {
          currentValue[data.key] = data.value;
        }
      }
    } else if (fieldType === 'array') {
      if (scopeId) {
        if (!scopedData[scopeId]) {
          scopedData[scopeId] = [];
        }
      } else {
        if (!currentValue) {
          currentValue = [];
        }
      }
      if (data) {
        if (scopeId) {
          scopedData[scopeId].push(data);
        } else {
          currentValue.push(data);
        }
      }
    }
  };

  const getDataForFieldType = (parameter?: any, scopeId?: string) => {
    if (fieldType === 'value') {
      if (scopeId) {
        return scopedData[scopeId];
      }
      return currentValue;
    } else if (fieldType === 'dictionary') {
      if (scopeId) {
        if (parameter === undefined) {
          return scopedData[scopeId];
        }
        if (scopedData[scopeId]) {
          return scopedData[scopeId][parameter.toString()];
        }
        return '';
      }
      if (parameter === undefined) {
        return currentValue;
      }
      return currentValue?.[parameter.toString()];
    } else if (fieldType === 'array') {
      if (scopeId) {
        if (parameter === undefined) {
          return scopedData[scopeId];
        }
        if (scopedData[scopeId]) {
          return scopedData[scopeId][parameter];
        }
        return '';
      }
      if (parameter === undefined) {
        return currentValue;
      }
      return currentValue?.[parameter];
    }
  };

  const initializeCompute = () => {
    scopedData = {};
    currentValue = undefined;
    fieldType = node?.nodeInfo?.formValues?.['fieldType'] ?? 'value';
    setDataForFieldType(
      fieldType === 'value'
        ? node?.nodeInfo?.formValues?.['initialValue'] ?? 0
        : undefined
    );

    if (fieldType === 'value') {
      if (isNaN(currentValue)) {
        currentValue = 0;
        if (htmlNode) {
          (htmlNode.domElement as unknown as HTMLElement).textContent = '-';
        }
      } else if (htmlNode) {
        (htmlNode.domElement as unknown as HTMLElement).textContent =
          currentValue.toString();
      }
      canvasAppInstance?.setVariable(variableName, currentValue);
    } else if (fieldType === 'dictionary') {
      if (htmlNode) {
        (htmlNode.domElement as unknown as HTMLElement).textContent =
          'dictionary';
      }
    } else if (fieldType === 'array') {
      if (htmlNode) {
        (htmlNode.domElement as unknown as HTMLElement).textContent = 'array';
      }
    } else {
      if (htmlNode) {
        (
          htmlNode.domElement as unknown as HTMLElement
        ).textContent = `${fieldType} is not supported yet`;
      }
    }

    if (rect) {
      rect.resize(120);
    }

    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }

    (componentWrapper.domElement as unknown as HTMLElement).classList.remove(
      'border-green-200'
    );

    return;
  };

  const compute = (
    input: string,
    pathExecution?: RunNodeResult<NodeInfo>[],
    loopIndex?: number
  ) => {
    return {
      result: false,
      stop: true,
      followPath: undefined,
    };
  };

  const getData = (parameter?: any, scopeId?: string) => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    (componentWrapper.domElement as unknown as HTMLElement).classList.add(
      'border-orange-200'
    );
    timeout = setTimeout(() => {
      (componentWrapper?.domElement as unknown as HTMLElement).classList.remove(
        'border-orange-200'
      );

      (componentWrapper?.domElement as unknown as HTMLElement).classList.remove(
        'border-green-200'
      );
    }, 250);
    return getDataForFieldType(parameter, scopeId);
  };
  const setData = (data: any, scopeId?: string) => {
    setDataForFieldType(data, scopeId);

    const value = fieldType === 'value' ? currentValue : data.value;
    if (htmlNode) {
      if (fieldType === 'dictionary') {
        const dictionary = getDataForFieldType(undefined, scopeId);
        if (dictionary) {
          showDictionaryData(dictionary, htmlNode);
          if (rect) {
            rect.resize(240);
          }
        }
      } else if (fieldType === 'array') {
        const array = getDataForFieldType(undefined, scopeId);
        if (array && Array.isArray(array)) {
          showArrayData(array, htmlNode);
          if (rect) {
            rect.resize(240);
          }
        }
      } else {
        (htmlNode.domElement as unknown as HTMLElement).textContent =
          value.toString();

        if (rect) {
          rect.resize(120);
        }
      }
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      (componentWrapper.domElement as unknown as HTMLElement).classList.add(
        'border-green-200'
      );
      timeout = setTimeout(() => {
        (
          componentWrapper?.domElement as unknown as HTMLElement
        ).classList.remove('border-green-200');
        (
          componentWrapper?.domElement as unknown as HTMLElement
        ).classList.remove('border-orange-200');
      }, 250);
    }
  };

  return {
    name: scopeVariableNodeName,
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
      canvasAppInstance = canvasApp;
      variableName = initalValues?.['variableName'] ?? '';
      canvasApp.registerVariable(variableName, {
        id: id ?? '',
        getData,
        setData,
      });
      const formElements = [
        {
          fieldType: FormFieldType.Text,
          fieldName: 'variableName',
          value: initalValues?.['variableName'] ?? '',
          onChange: (value: string) => {
            if (!node.nodeInfo) {
              return;
            }
            node.nodeInfo.formValues = {
              ...node.nodeInfo.formValues,
              variableName: value,
            };
            canvasApp.unregisterVariable(variableName, id ?? '');
            variableName = value;
            (tagNode?.domElement as HTMLElement).textContent = variableName;
            canvasApp.registerVariable(variableName, {
              id: id ?? '',
              getData,
              setData,
            });
            console.log('onChange', node.nodeInfo);
            if (updated) {
              updated();
            }
          },
        },
        {
          fieldType: FormFieldType.Text,
          fieldName: 'initialValue',
          value: initalValues?.['initialValue'] ?? '',
          onChange: (value: string) => {
            if (!node.nodeInfo) {
              return;
            }
            node.nodeInfo.formValues = {
              ...node.nodeInfo.formValues,
              initialValue: value,
            };
            initializeCompute();
            if (updated) {
              updated();
            }
          },
        },
        {
          fieldType: FormFieldType.Select,
          fieldName: 'fieldType',
          value: initalValues?.['fieldType'] ?? 'value',
          options: [
            {
              value: 'value',
              label: 'Value',
            },
            {
              value: 'dictionary',
              label: 'Dictionary',
            },
            {
              value: 'array',
              label: 'Array',
            },
            {
              value: 'grid',
              label: 'Grid/Matrix',
            },
          ],
          onChange: (value: string) => {
            if (!node.nodeInfo) {
              return;
            }
            node.nodeInfo.formValues = {
              ...node.nodeInfo.formValues,
              fieldType: value,
            };
            fieldType = value;
            initializeCompute();
            if (updated) {
              updated();
            }
          },
        },
        {
          fieldType: FormFieldType.Select,
          fieldName: 'fieldValueType',
          value: initalValues?.['fieldValueType'] ?? 'number',
          options: [
            {
              value: 'number',
              label: 'Number',
            },
            {
              value: 'string',
              label: 'String',
            },
            /*{
              value: 'integer',
              label: 'Integer',
            },
            {
              value: 'decimal',
              label: 'Decimal',
            },
            {
              value: 'latlong',
              label: 'Latitude/Longitude',
            },
            {
              value: 'date',
              label: 'Date',
            },
            {
              value: 'time',
              label: 'Time',
            },
            { value: 'datetime', label: 'Date/Time' },
            { value: 'boolean', label: 'Boolean' },
            { value: 'color', label: 'Color' },
            { value: 'byte', label: 'Byte' },
            { value: 'word', label: 'Word(32bit)' },
            { value: 'dword', label: 'Double Word(64bit)' },
            { value: 'bigint', label: 'Bigint' },
            */
          ],
          onChange: (value: string) => {
            if (!node.nodeInfo) {
              return;
            }
            node.nodeInfo.formValues = {
              ...node.nodeInfo.formValues,
              fieldValueType: value,
            };
            fieldValueType = value;
            initializeCompute();
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

      componentWrapper = createElement(
        'div',
        {
          class: `border-[4px] border-solid border-transparent transition duration-500 ease-in-out inner-node bg-slate-600 text-white p-4 rounded text-center`,
        },
        undefined,
        htmlNode.domElement as unknown as HTMLElement
      ) as unknown as IRectNodeComponent<NodeInfo>;

      rect = canvasApp.createRect(
        x,
        y,
        100,
        100,
        undefined,
        [],
        componentWrapper,
        {
          classNames: `p-4 rounded`,
        },
        undefined,
        undefined,
        undefined,
        id,
        {
          type: scopeVariableNodeName,
          formValues: {
            variableName: variableName,
            initialValue: initalValues?.['initialValue'] ?? '',
            fieldType: initalValues?.['fieldType'] ?? 'value',
          },
        },
        containerNode
      );
      if (!rect.nodeComponent) {
        throw new Error('rect.nodeComponent is undefined');
      }

      tagNode = createElement(
        'div',
        {
          class:
            'absolute top-0 left-0 bg-slate-700 text-white px-1 rounded -translate-y-2/4 translate-x-1',
        },
        rect.nodeComponent.domElement as unknown as HTMLElement,
        variableName
      ) as unknown as INodeComponent<NodeInfo>;

      node = rect.nodeComponent;

      if (node.nodeInfo) {
        node.nodeInfo.formElements = formElements;
        node.nodeInfo.isVariable = true;
        node.nodeInfo.compute = compute;
        node.nodeInfo.sendData = compute;
        node.nodeInfo.getData = getData;
        node.nodeInfo.initializeCompute = initializeCompute;
        node.nodeInfo.delete = () => {
          canvasApp.unregisterVariable(variableName, id ?? '');
          (
            componentWrapper?.domElement as unknown as HTMLElement
          ).classList.remove('border-green-200');
          if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
          }
        };
      }
      return node;
    },
  };
};
