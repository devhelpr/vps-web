import {
  CanvasAppInstance,
  IElementNode,
  FlowNode,
  IRectNodeComponent,
  Composition,
} from '@devhelpr/visual-programming-system';
import {
  AnimatePathFunction,
  AnimatePathFromThumbFunction,
} from '../follow-path/animate-path';
import { FlowrunnerIndexedDbStorageProvider } from '../storage/indexeddb-storage-provider';
import { NodeInfo } from '../types/node-info';

export interface AppNavComponentsProps<T> {
  rootAppElement: HTMLElement;
  rootElement: HTMLElement;
  selectNodeType: HTMLSelectElement;
  storageProvider: FlowrunnerIndexedDbStorageProvider;
  initializeNodes: () => void;
  clearCanvas: () => void;
  animatePath: AnimatePathFunction<T>;
  animatePathFromThumb: AnimatePathFromThumbFunction<T>;
  canvasUpdated: () => void;
  getCanvasApp: () => CanvasAppInstance<T> | undefined;
  removeElement: (element: IElementNode<NodeInfo>) => void;
  setIsStoring: (isStoring: boolean) => void;
  importToCanvas: (
    nodesList: FlowNode<NodeInfo>[],
    canvasApp: CanvasAppInstance<NodeInfo>,
    canvasUpdated: () => void,
    containerNode?: IRectNodeComponent<NodeInfo>,
    nestedLevel?: number,
    getNodeTaskFactory?: (name: string) => any,
    compositions?: Record<string, Composition<T>>
  ) => void;
  showPopup: (node: IRectNodeComponent<NodeInfo>) => void;
}

export interface GenericAppNavComponentsProps<T> {
  rootAppElement: HTMLElement;
  rootElement: HTMLElement;
  selectNodeType: HTMLSelectElement;
  storageProvider: FlowrunnerIndexedDbStorageProvider;
  initializeNodes: () => void;
  clearCanvas: () => void;
  canvasUpdated: () => void;
  getCanvasApp: () => CanvasAppInstance<T> | undefined;
  removeElement: (element: IElementNode<T>) => void;
  setIsStoring: (isStoring: boolean) => void;
  importToCanvas: (
    nodesList: FlowNode<T>[],
    canvasApp: CanvasAppInstance<T>,
    canvasUpdated: () => void,
    containerNode?: IRectNodeComponent<T>,
    nestedLevel?: number,
    getNodeTaskFactory?: (name: string) => any,
    compositions?: Record<string, Composition<T>>
  ) => void;
}
