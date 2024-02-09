import {
  CanvasAppInstance,
  ICommandHandler,
  IElementNode,
} from '@devhelpr/visual-programming-system';
import { NodeTaskFactory } from '../../node-task-registry';
import { CommandHandler } from '../command-handler/command-handler';
import { CopyNodeCommand } from '../copy-node-command/copy-node-command';
import { BaseNodeInfo } from '../../types/base-node-info';

export class PasteNodeCommand<
  T extends BaseNodeInfo
> extends CommandHandler<T> {
  constructor(
    rootElement: HTMLElement,
    canvasApp: CanvasAppInstance<T>,
    canvasUpdated: () => void,
    removeElement: (element: IElementNode<T>) => void,
    getNodeTaskFactory: (name: string) => NodeTaskFactory<T>,
    setupTasksInDropdown: (
      selectNodeTypeHTMLElement: HTMLSelectElement
    ) => void,
    commandRegistry: Map<string, ICommandHandler>
  ) {
    super(
      rootElement,
      canvasApp,
      canvasUpdated,
      removeElement,
      getNodeTaskFactory,
      setupTasksInDropdown,
      commandRegistry
    );
    this.getNodeTaskFactory = getNodeTaskFactory;
    this.canvasApp = canvasApp;
    this.canvasUpdated = canvasUpdated;
    this.rootElement = rootElement;
    this.setupTasksInDropdown = setupTasksInDropdown;
    this.commandRegistry = commandRegistry;
  }
  commandRegistry: Map<string, ICommandHandler>;
  rootElement: HTMLElement;
  canvasApp: CanvasAppInstance<T>;
  canvasUpdated: () => void;
  getNodeTaskFactory: (name: string) => NodeTaskFactory<T>;
  setupTasksInDropdown: (selectNodeTypeHTMLElement: HTMLSelectElement) => void;
  // parameter1 is the nodeType
  // parameter2 is the id of a selected node
  lastPastedNodeId = '';
  lastX = 0;
  lastY = 0;
  execute(_parameter1?: any, _parameter2?: any): void {
    const copyCommand = this.commandRegistry.get(
      'copy-node'
    ) as CopyNodeCommand<T>;
    if (copyCommand) {
      const copyNode = copyCommand.node;
      const nodeType = copyNode?.nodeInfo?.type;
      if (nodeType && copyNode?.nodeInfo) {
        const factory = this.getNodeTaskFactory(nodeType);

        if (factory) {
          const nodeTask = factory(this.canvasUpdated);
          let x = copyNode.x;
          let y = copyNode.y;
          if (this.lastPastedNodeId === copyNode.id) {
            x = this.lastX;
            y = this.lastY;
          }
          x += 0;
          y += 20 + (copyNode?.height ?? 50);
          const initialValues = structuredClone(copyNode.nodeInfo.formValues);

          const nodeClone = nodeTask.createVisualNode(
            this.canvasApp,
            x,
            y,
            undefined,
            initialValues
          );
          this.lastX = x;
          this.lastY = y;
          this.lastPastedNodeId = copyNode.id;
          if (nodeClone && nodeClone.nodeInfo) {
            // TODO : IMPROVE THIS (needed for decorators !?)
            (nodeClone.nodeInfo as any).taskType = nodeType;
          }
        }
      }
    }
  }
}
