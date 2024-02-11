import {
  CanvasAppInstance,
  IRectNodeComponent,
  NodeType,
} from '@devhelpr/visual-programming-system';
import { NodeTaskFactory } from '../../node-task-registry';
import { CommandHandler } from '../command-handler/command-handler';
import { BaseNodeInfo } from '../../types/base-node-info';
import { ICommandContext } from '../command-context';

export class CopyNodeCommand<T extends BaseNodeInfo> extends CommandHandler<T> {
  constructor(commandContext: ICommandContext<T>) {
    super(commandContext);
    this.getNodeTaskFactory = commandContext.getNodeTaskFactory;
    this.canvasApp = commandContext.canvasApp;
    this.canvasUpdated = commandContext.canvasUpdated;
    this.rootElement = commandContext.rootElement;
    this.setupTasksInDropdown = commandContext.setupTasksInDropdown;
    this.node = undefined;
  }
  rootElement: HTMLElement;
  canvasApp: CanvasAppInstance<T>;
  canvasUpdated: () => void;
  getNodeTaskFactory: (name: string) => NodeTaskFactory<T>;
  setupTasksInDropdown: (selectNodeTypeHTMLElement: HTMLSelectElement) => void;
  // parameter1 is the nodeType
  // parameter2 is the id of a selected node
  execute(_parameter1?: any, parameter2?: any): void {
    if (typeof parameter2 !== 'string') {
      return;
    }
    const node = this.canvasApp?.elements.get(
      parameter2
    ) as IRectNodeComponent<T>;
    if (!node) {
      console.log('node not found in canvas');
      return;
    }
    if (node.nodeType === NodeType.Shape) {
      this.node = node;
    } else {
      this.node = undefined;
    }
  }

  node: IRectNodeComponent<T> | undefined;

  resetNode() {
    this.node = undefined;
  }
}