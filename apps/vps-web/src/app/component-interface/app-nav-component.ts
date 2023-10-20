import {
  CanvasAppInstance,
  IElementNode,
  FlowNode,
  IRectNodeComponent,
} from '@devhelpr/visual-programming-system';
import {
  AnimatePathFunction,
  AnimatePathFromThumbFunction,
} from '../follow-path/animate-path';
import { FlowrunnerIndexedDbStorageProvider } from '../storage/indexeddb-storage-provider';
import { NodeInfo } from '../types/node-info';

export interface AppNavComponentsProps {
  rootAppElement: HTMLElement;
  rootElement: HTMLElement;
  selectNodeType: HTMLSelectElement;
  storageProvider: FlowrunnerIndexedDbStorageProvider;
  initializeNodes: () => void;
  clearCanvas: () => void;
  animatePath: AnimatePathFunction<NodeInfo>;
  animatePathFromThumb: AnimatePathFromThumbFunction<NodeInfo>;
  canvasUpdated: () => void;
  canvasApp: CanvasAppInstance<NodeInfo>;
  removeElement: (element: IElementNode<NodeInfo>) => void;
  setIsStoring: (isStoring: boolean) => void;
  importToCanvas: (
    nodesList: FlowNode<NodeInfo>[],
    canvasApp: CanvasAppInstance<NodeInfo>,
    canvasUpdated: () => void,
    containerNode?: IRectNodeComponent<NodeInfo>,
    nestedLevel?: number
  ) => void;
}
