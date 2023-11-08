import './app.element.css';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import styles from '../styles.css?inline';
//import iconStyles from '../../public/icon-styles.css?inline';
import {
  createElement,
  IElementNode,
  INodeComponent,
  createEffect,
  getSelectedNode,
  setSelectNode,
  setupMarkupElement,
  createElementMap,
  createCanvasApp,
  CanvasAppInstance,
  ThumbType,
  IRectNodeComponent,
  IConnectionNodeComponent,
  IThumbNodeComponent,
  Flow,
  updateNamedSignal,
  NodeType,
  ElementNodeMap,
  LineType,
  SelectedNodeInfo,
  createNSElement,
  Camera,
  FlowNode,
} from '@devhelpr/visual-programming-system';

import { registerCustomFunction } from '@devhelpr/expression-compiler';
import flowData from '../example-data/tiltest.json';

import { FormComponent } from './components/form-component';

import {
  increaseRunIndex,
  resetRunIndex,
  run,
  RunNodeResult,
} from './simple-flow-engine/simple-flow-engine';
import { NodeInfo } from './types/node-info';
import {
  setSpeedMeter,
  timers,
  animatePath as _animatePath,
  animatePathFromThumb as _animatePathFromThumb,
} from './follow-path/animate-path';
import {
  createIndexedDBStorageProvider,
  FlowrunnerIndexedDbStorageProvider,
} from './storage/indexeddb-storage-provider';
import { getPointOnConnection } from './follow-path/point-on-connection';
import { AppComponents } from './components/app-components';
import { NavbarComponents } from './components/navbar-components';
import {
  menubarClasses,
  navBarButton,
  navBarIconButton,
  navBarIconButtonInnerElement,
} from './consts/classes';
import {
  getNodeFactoryNames,
  getNodeTaskFactory,
  setupCanvasNodeTaskRegistry,
} from './node-task-registry/canvas-node-task-registry';
import { serializeElementsMap } from './storage/serialize-canvas';
import { importToCanvas } from './storage/import-to-canvas';
import { NodeSidebarMenuComponents } from './components/node-sidebar-menu';

const template = document.createElement('template');
template.innerHTML = `
  <div class="h-screen w-full bg-slate-800 overflow-hidden touch-none" id="root" >
  </div>
`;

export class AppElement {
  public static observedAttributes = [];

  onclick = (_ev: MouseEvent) => {
    alert('clicked');
  };

  isStoring = false;

  canvas?: IElementNode<NodeInfo> = undefined;
  canvasApp?: CanvasAppInstance<NodeInfo> = undefined;
  storageProvider: FlowrunnerIndexedDbStorageProvider | undefined = undefined;

  pathExecutions: RunNodeResult<NodeInfo>[][] = [];
  scopeNodeDomElement: HTMLElement | undefined = undefined;

  currentPathUnderInspection: RunNodeResult<NodeInfo>[] | undefined = undefined;

  formElement: INodeComponent<NodeInfo> | undefined = undefined;
  editPopupContainer: IElementNode<NodeInfo> | undefined = undefined;
  editPopupLineContainer: IElementNode<NodeInfo> | undefined = undefined;
  editPopupLinePath: IElementNode<NodeInfo> | undefined = undefined;
  editPopupLineEndPath: IElementNode<NodeInfo> | undefined = undefined;
  editPopupEditingNodeIndicator: IElementNode<NodeInfo> | undefined = undefined;
  selectedNodeLabel: IElementNode<NodeInfo> | undefined = undefined;
  rootElement: HTMLElement | undefined = undefined;

  appRootElement: Element | null;

  constructor(appRootSelector: string) {
    // NOTE : on http instead of https, crypto is not available...
    // so uuid's cannot be created and the app will not work

    if (typeof crypto === 'undefined') {
      console.error(
        'NO Crypto defined ... uuid cannot be created! Are you on a http connection!?'
      );
    }
    this.appRootElement = document.querySelector(appRootSelector);
    if (!this.appRootElement) {
      return;
    }
    this.appRootElement.appendChild(template.content.cloneNode(true));
    this.rootElement = this.appRootElement.querySelector(
      'div#root'
    ) as HTMLElement;
    if (!this.rootElement) {
      return;
    }

    const canvasApp = createCanvasApp<NodeInfo>(this.rootElement);
    this.canvas = canvasApp.canvas;
    this.canvasApp = canvasApp;

    this.canvasApp.setOnCameraChanged(this.onCameraChanged);

    this.editPopupContainer = createElement(
      'div',
      {
        id: 'textAreaContainer',
        class:
          'absolute w-[400px] h-[380px] z-[1020] p-2 bg-slate-600 hidden overflow-auto',
        wheel: (event) => {
          event.stopPropagation();
        },
      },
      this.rootElement
    );
    this.editPopupLineContainer = createNSElement(
      'svg',
      {
        width: 0,
        height: 0,
        class:
          'absolute top-0 left-0 pointer-events-none z-[1000] hidden opacity-75',
        style: {
          width: '200px',
          height: '200px',
          filter: 'drop-shadow(rgba(0, 0, 0, 0.4) 3px 1px 2px)',
        },
      },
      this.rootElement
    );
    this.editPopupLinePath = createNSElement(
      'path',
      {
        d: 'M0 0 L200 200',
        stroke: 'white',
        'stroke-width': '3px',
        fill: 'transparent',
      },
      this.editPopupLineContainer.domElement
    );
    this.editPopupLineEndPath = createNSElement(
      'path',
      {
        d: 'M0 0 L0 0',
        stroke: 'white',
        'stroke-width': '2px',
        fill: 'transparent',
      },
      this.editPopupLineContainer.domElement
    );

    this.editPopupEditingNodeIndicator = createElement(
      'div',
      {
        class: 'absolute z-[1010] pointer-events-none',
        style: {
          filter: 'drop-shadow(rgba(0, 0, 0, 0.4) 3px 1px 2px)',
        },
      },
      this.rootElement
    );
  }

  removeElement = (element: IElementNode<NodeInfo>) => {
    if (element.nodeInfo?.delete) {
      element.nodeInfo.delete();
    }
    element.domElement.remove();
    const node = element as unknown as INodeComponent<NodeInfo>;
    if (node && node.delete) {
      node.delete();
    }
    element.elements.forEach((element: IElementNode<NodeInfo>) => {
      this.removeElement(element as unknown as IElementNode<NodeInfo>);
    });
    element.elements = createElementMap<NodeInfo>();
  };
  onPreclearCanvas = () => {
    //
  };

  protected clearCanvas = () => {
    this.onPreclearCanvas();
    setSelectNode(undefined);

    this.canvasApp?.elements.forEach((element) => {
      element.domElement.remove();
      this.removeElement(element as unknown as IElementNode<NodeInfo>);
    });
    this.canvasApp?.elements.clear();
    this.canvasApp?.setCamera(0, 0, 1);
  };

  onCameraChanged = (camera: Camera) => {
    const selectedNodeInfo = getSelectedNode();

    if (selectedNodeInfo) {
      const node = (
        selectedNodeInfo?.containerNode
          ? (selectedNodeInfo?.containerNode.nodeInfo as any)?.canvasAppInstance
              ?.elements
          : this.canvasApp?.elements
      )?.get(selectedNodeInfo.id);

      if (!node) {
        return;
      }
      const nodeInfo: any = node?.nodeInfo ?? {};
      if (
        node &&
        (node as INodeComponent<NodeInfo>).nodeType === NodeType.Connection
      ) {
        return;
      }

      if (((nodeInfo as any)?.formElements ?? []).length === 0) {
        return;
      }
      if (!this.formElement) {
        return;
      }
      console.log('before positionPopup2', selectedNodeInfo);
      this.positionPopup(node);
    }
  };

  positionPopup = (node: IRectNodeComponent<NodeInfo>) => {
    (
      this.editPopupContainer?.domElement as unknown as HTMLElement
    ).classList.remove('hidden');
    (
      this.editPopupLineContainer?.domElement as unknown as HTMLElement
    ).classList.remove('hidden');

    const sidebar = this.editPopupContainer
      ?.domElement as unknown as HTMLElement;
    const nodeComponent = node as INodeComponent<NodeInfo>;

    let parentX = 0;
    let parentY = 0;
    if (node.containerNode) {
      if (node.containerNode && node.containerNode?.getParentedCoordinates) {
        const parentCoordinates =
          node.containerNode?.getParentedCoordinates() ?? {
            x: 0,
            y: 0,
          };
        // parentX = node.containerNode.x;
        // parentY = node.containerNode.y;
        parentX = parentCoordinates.x;
        parentY = parentCoordinates.y;
      }
    }
    const camera = this.canvasApp?.getCamera();

    const xCamera = camera?.x ?? 0;
    const yCamera = camera?.y ?? 0;
    const scaleCamera = camera?.scale ?? 1;
    const xNode = parentX + nodeComponent.x ?? 0;
    const yNode = parentY + nodeComponent.y ?? 0;
    const widthNode = nodeComponent.width ?? 0;
    const heightNode = nodeComponent.height ?? 0;

    console.log(
      'selectedNode',
      xCamera,
      yCamera,
      scaleCamera,
      xNode,
      yNode,
      widthNode,
      heightNode
    );
    const rootClientRect = this.rootElement?.getBoundingClientRect();
    console.log('rootClientRect', rootClientRect);
    let x = xCamera + xNode * scaleCamera + widthNode * scaleCamera + 100;
    if (x < 10) {
      x = 10;
    }
    if (x + 400 - 10 > (rootClientRect?.width ?? 0)) {
      x = (rootClientRect?.width ?? 0) - 400 - 10;
    }
    let y = yCamera + yNode * scaleCamera;
    if (y < 50) {
      y = 50;
    }
    if (y + 380 > (rootClientRect?.height ?? 0) - 80) {
      y = (rootClientRect?.height ?? 0) - 380 - 80;
    }

    sidebar.style.left = `${x}px`;
    sidebar.style.top = `${y}px`;

    const lineContainer = this.editPopupLineContainer
      ?.domElement as unknown as HTMLElement;

    const xLine = xCamera + xNode * scaleCamera + (widthNode / 2) * scaleCamera;
    lineContainer.style.left = `${xLine}px`;

    const centerNodeY =
      yCamera + yNode * scaleCamera + (heightNode / 2) * scaleCamera;
    const yLine = centerNodeY - heightNode * scaleCamera;

    lineContainer.style.top = `${y < yLine ? y : yLine}px`;
    lineContainer.style.width = `${x - xLine < 0 ? xLine - x : x - xLine}px`;
    lineContainer.style.height = `${1000}px`; // heightNode * scaleCamera

    const indicatorElement = this.editPopupEditingNodeIndicator
      ?.domElement as unknown as HTMLElement;
    indicatorElement.style.left = `${
      xCamera + xNode * scaleCamera + (widthNode / 2) * scaleCamera
    }px`;
    indicatorElement.style.top = `${centerNodeY}px`;
    indicatorElement.classList.remove('hidden');
    indicatorElement.classList.add('editing-node-indicator');

    (this.editPopupLinePath?.domElement as SVGPathElement).setAttribute(
      'd',
      `M0 ${(y < yLine ? yLine - y : 0) + heightNode * scaleCamera} 
       L${(x - xLine < 0 ? xLine - x : x - xLine) - 5} ${
        (yLine < y ? y - yLine : 0) + 170
      }`
    );

    (this.editPopupLineEndPath?.domElement as SVGPathElement).setAttribute(
      'd',
      `M${(x - xLine < 0 ? xLine - x : x - xLine) - 5} ${
        (yLine < y ? y - yLine : 0) + 170 - 5
      }
      L${(x - xLine < 0 ? xLine - x : x - xLine) - 5} ${
        (yLine < y ? y - yLine : 0) + 170 + 5
      }
        `
    );
  };
}

/*
const [getCount, setCount] = createSignal(0);
const [getValue, setValue] = createSignal('test');
createEffect(() => console.log('effect', getCount(), getValue()));
setCount(1);
setCount(2);
setValue('test2');
setCount(3);
*/
/*
setInterval(() => {
  setCount(getCount() + 1);
}, 1000);
*/
