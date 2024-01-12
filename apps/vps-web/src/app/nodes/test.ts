import {
  CanvasAppInstance,
  createElement,
  INodeComponent,
  IRectNodeComponent,
  ThumbConnectionType,
  ThumbType,
} from '@devhelpr/visual-programming-system';
import { NodeInfo } from '../types/node-info';
import {
  InitialValues,
  NodeTask,
  NodeTaskFactory,
} from '../node-task-registry';
import { FormFieldType } from '../components/FormField';

export const getTest: NodeTaskFactory<NodeInfo> = (
  updated: () => void
): NodeTask<NodeInfo> => {
  let node: IRectNodeComponent<NodeInfo>;
  let nodeComponent: INodeComponent<NodeInfo>;
  const initializeCompute = () => {
    return;
  };
  const compute = (input: string, _loopIndex?: number) => {
    return {
      result: input,
      followPath: undefined,
    };
  };
  return {
    name: 'test',
    family: 'flow-canvas',
    category: 'flow-canvas',
    //isContained: true,
    createVisualNode: (
      canvasApp: CanvasAppInstance<NodeInfo>,
      x: number,
      y: number,
      id?: string,
      initalValues?: InitialValues,
      containerNode?: IRectNodeComponent<NodeInfo>
    ) => {
      const initialValue = initalValues?.['caption'] ?? 'Test';
      const formElements = [
        {
          fieldType: FormFieldType.Text,
          fieldName: 'caption',
          value: initialValue ?? '',
          onChange: (value: string) => {
            if (!node.nodeInfo) {
              return;
            }
            node.nodeInfo.formValues = {
              ...node.nodeInfo.formValues,
              caption: value,
            };
            nodeComponent.domElement.textContent =
              node.nodeInfo.formValues['caption'] ?? 'Test';
            console.log('onChange', node.nodeInfo);
            if (updated) {
              updated();
            }
          },
        },
      ];

      nodeComponent = createElement(
        'div',
        {
          class: `flex text-center items-center justify-center
              w-[100px] h-[50px] overflow-hidden
              bg-sky-600 text-white
              rounded-lg 
              inner-node
              shape-rect`,
          style: {
            // 'clip-path': 'circle(50%)',
          },
        },
        undefined,
        'state'
      ) as unknown as INodeComponent<NodeInfo>;
      nodeComponent.domElement.textContent = initialValue ?? 'Test';

      const rect = canvasApp.createRectThumb(
        x,
        y,
        100,
        50,
        undefined,
        [
          {
            thumbType: ThumbType.Center,
            thumbIndex: 0,
            connectionType: ThumbConnectionType.startOrEnd,
            color: 'white',
            label: '#',
            name: 'input',
            hidden: true,
          },
        ],
        nodeComponent,
        {
          classNames: `bg-slate-500 p-4 rounded`,
        },
        undefined,
        undefined,
        undefined,
        id,
        {
          formElements: formElements,
          type: 'test',
          formValues: {
            caption: initialValue ?? '',
          },
        },
        containerNode,
        undefined,
        false
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
