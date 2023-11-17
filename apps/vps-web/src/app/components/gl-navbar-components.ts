import {
  IConnectionNodeComponent,
  INodeComponent,
  IRectNodeComponent,
  NodeType,
  getSelectedNode,
  setSelectNode,
} from '@devhelpr/visual-programming-system';
import {
  navBarButton,
  navBarIconButton,
  navBarIconButtonInnerElement,
  navBarPrimaryIconButton,
} from '../consts/classes';

import { NodeInfo } from '../types/node-info';
import {
  BaseComponent,
  Component,
  createElementFromTemplate,
  createTemplate,
} from '@devhelpr/dom-components';
import {
  serializeElementsMap,
  exportFlowToJson,
} from '../storage/serialize-canvas';
import { downloadJSON } from '../utils/create-download-link';
import { GenericAppNavComponentsProps } from '../component-interface/app-nav-component';
import { getGLNodeTaskFactory } from '../node-task-registry/gl-node-task-registry';

export class GLNavbarComponent extends Component<
  GenericAppNavComponentsProps<any>
> {
  oldProps: GenericAppNavComponentsProps<any> | null = null;

  previousDoRenderChildren: boolean | null = null;
  doRenderChildren: boolean | null = true;

  addNodeButton: HTMLButtonElement | null = null;
  centerButton: HTMLButtonElement | null = null;
  deleteButton: HTMLButtonElement | null = null;
  exportButton: HTMLButtonElement | null = null;
  importButton: HTMLButtonElement | null = null;
  importScriptButton: HTMLButtonElement | null = null;

  rootAppElement: HTMLElement | null = null;

  constructor(
    parent: BaseComponent | null,
    props: GenericAppNavComponentsProps<any>
  ) {
    super(parent, props);

    this.template = createTemplate(
      `<div class="inline-flex items-center content-center">
        <button class="${navBarPrimaryIconButton}"><span class="${navBarIconButtonInnerElement} icon-add"></span></button>
        <button class="${navBarIconButton}"><span class="${navBarIconButtonInnerElement} icon-fit_screen"></span></button>
        <button class="${navBarIconButton}"><span class="${navBarIconButtonInnerElement} icon-delete"></span></button>
        <button class="${navBarButton}">Export</button>
        <button class="${navBarButton}">Import</button>
        <children></children>
      </div>`
    );
    this.rootElement = props.rootElement;
    this.rootAppElement = props.rootAppElement;
    this.mount();
  }
  mount() {
    super.mount();
    if (this.isMounted) return;
    if (!this.template) return;
    if (!this.rootElement) return;
    if (!this.element) {
      this.element = createElementFromTemplate(this.template);

      if (this.element) {
        this.element.remove();
        this.addNodeButton = this.element.firstChild as HTMLButtonElement;
        this.centerButton = this.addNodeButton
          ?.nextSibling as HTMLButtonElement;
        this.deleteButton = this.centerButton?.nextSibling as HTMLButtonElement;
        this.exportButton = this.deleteButton?.nextSibling as HTMLButtonElement;
        this.importButton = this.exportButton?.nextSibling as HTMLButtonElement;

        this.addNodeButton.addEventListener('click', this.onClickAddNode);
        this.centerButton.addEventListener('click', this.onClickCenter);
        this.deleteButton.addEventListener('click', this.onClickDelete);
        this.exportButton.addEventListener('click', this.onClickExport);
        this.importButton.addEventListener('click', this.onClickImport);

        this.renderList.push(
          this.addNodeButton,
          this.centerButton,
          this.deleteButton,
          this.exportButton,
          this.importButton
        );
        // this.childRoot = this.element.firstChild as HTMLElement;
        // this.renderList.push(this.childRoot);
        this.rootElement.append(this.element);
      }
    }
    this.isMounted = true;
  }
  unmount() {
    super.unmount();
    if (this.element && this.element.remove) {
      // remove only removes the connection between parent and node
      this.element.remove();
    }
    this.isMounted = false;
  }

  onClickAddNode = (event: Event) => {
    event.preventDefault();
    const nodeType = this.props.selectNodeType.value;
    let halfWidth = 0;
    let halfHeight = 0;
    if (this.props.canvasApp?.rootElement) {
      const box = this.props.canvasApp?.rootElement.getBoundingClientRect();
      halfWidth = box.width / 2;
      halfHeight = box.height / 2;
    }
    const startPos = this.props.canvasApp?.transformCameraSpaceToWorldSpace(
      halfWidth,
      halfHeight
    );
    const startX = (startPos?.x ?? Math.floor(Math.random() * 250)) - 100;
    const startY = (startPos?.y ?? Math.floor(Math.random() * 500)) - 150;

    const factory = getGLNodeTaskFactory(nodeType);

    if (factory) {
      const nodeTask = factory(this.props.canvasUpdated);

      const selectedNodeInfo = getSelectedNode();
      if (selectedNodeInfo) {
        let node = this.props.canvasApp?.elements?.get(
          selectedNodeInfo.id
        ) as INodeComponent<NodeInfo>;

        if (!node) {
          console.log('node not found in canvas'); // is the selected node in a container?
          //selectedNodeInfo.containerNode ...
          const canvasAppInstance = (
            selectedNodeInfo.containerNode?.nodeInfo as any
          )?.canvasAppInstance;
          node = canvasAppInstance?.elements?.get(
            selectedNodeInfo.id
          ) as INodeComponent<NodeInfo>;
          if (!node) {
            console.log('node not found in direct container');
            return;
          }
        }
        if (!node.nodeInfo?.taskType) {
          return;
        }
        const selectedNodeTaskFactory = getGLNodeTaskFactory(
          node.nodeInfo.taskType
        );
        if (node && selectedNodeTaskFactory) {
          const selectedNodeTask = selectedNodeTaskFactory(
            this.props.canvasUpdated
          );
          if (
            node.nodeInfo.canvasAppInstance &&
            selectedNodeTask.isContainer &&
            (selectedNodeTask.childNodeTasks ?? []).indexOf(nodeType) >= 0
          ) {
            nodeTask.createVisualNode(
              node.nodeInfo.canvasAppInstance,
              50,
              50,
              undefined,
              undefined,
              node as IRectNodeComponent<NodeInfo>,
              undefined,
              undefined,
              (node.nestedLevel ?? 0) + 1
            );

            return;
          } else if (selectedNodeTask.isContainer) {
            return;
          }
        }
      }
      const node = nodeTask.createVisualNode(
        this.props.canvasApp,
        startX,
        startY
      );
      if (node && node.nodeInfo) {
        node.nodeInfo.taskType = nodeType;
      }
    }

    return false;
  };

  onClickCenter = (event: Event) => {
    event.preventDefault();
    this.props.canvasApp?.centerCamera();
    return false;
  };

  getSelectedNodeInfo = () => {
    const nodeElementId = getSelectedNode();
    if (nodeElementId) {
      const node = nodeElementId.containerNode
        ? ((
            nodeElementId?.containerNode as unknown as IRectNodeComponent<NodeInfo>
          )?.nodeInfo?.canvasAppInstance?.elements?.get(
            nodeElementId.id
          ) as INodeComponent<NodeInfo>)
        : (this.props.canvasApp?.elements?.get(
            nodeElementId.id
          ) as INodeComponent<NodeInfo>);

      if (node) {
        return { selectedNodeInfo: nodeElementId, node };
      }
    }
    return false;
  };

  onClickDelete = (event: Event) => {
    event.preventDefault();
    const nodeInfo = this.getSelectedNodeInfo();

    if (nodeInfo) {
      const node = nodeInfo.node;
      if (node.nodeType === NodeType.Connection) {
        // Remove the connection from the start and end nodes
        const connection = node as IConnectionNodeComponent<NodeInfo>;
        if (connection.startNode) {
          connection.startNode.connections =
            connection.startNode?.connections?.filter(
              (c) => c.id !== connection.id
            );
        }
        if (connection.endNode) {
          connection.endNode.connections =
            connection.endNode?.connections?.filter(
              (c) => c.id !== connection.id
            );
        }
      } else if (node.nodeType === NodeType.Shape) {
        //does the shape have connections? yes.. remove the link between the connection and the node
        // OR .. remove the connection as well !?
        const shapeNode = node as IRectNodeComponent<NodeInfo>;
        if (shapeNode.connections) {
          shapeNode.connections.forEach((c) => {
            const connection = this.props.canvasApp?.elements?.get(
              c.id
            ) as IConnectionNodeComponent<NodeInfo>;
            if (connection) {
              if (connection.startNode?.id === node.id) {
                connection.startNode = undefined;
                connection.startNodeThumb = undefined;
              }
              if (connection.endNode?.id === node.id) {
                connection.endNode = undefined;
                connection.endNodeThumb = undefined;
              }
            }
          });
        }
      } else {
        return;
      }

      if (nodeInfo.selectedNodeInfo.containerNode) {
        (
          nodeInfo?.selectedNodeInfo
            ?.containerNode as unknown as IRectNodeComponent<NodeInfo>
        )?.nodeInfo?.canvasAppInstance?.elements?.delete(
          nodeInfo.selectedNodeInfo.id
        );
        this.props.removeElement(
          node
          // (
          //   nodeElementId.containerNode as unknown as IRectNodeComponent<NodeInfo>
          // ).nodeInfo.canvasAppInstance
        );
      } else {
        this.props.removeElement(node);
        this.props.canvasApp?.elements?.delete(nodeInfo.selectedNodeInfo.id);
      }
      setSelectNode(undefined);
      this.props.canvasUpdated();
    }

    return false;
  };

  onClickExport = (event: Event) => {
    event.preventDefault();
    const data = serializeElementsMap(this.props.canvasApp.elements);
    console.log('EXPORT DATA', exportFlowToJson('1234', data));
    downloadJSON(exportFlowToJson('1234', data), 'vps-flow.json');
    return false;
  };

  onClickImport = (event: Event) => {
    event.preventDefault();
    const input = document.createElement('input') as HTMLInputElement & {
      files: FileList;
    };

    input.type = 'file';
    input.setAttribute('accept', 'application/JSON');
    input.onchange = () => {
      const files = Array.from(input.files);
      if (files && files.length > 0) {
        // const file = URL.createObjectURL(files[0]);
        // console.log(file);

        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
          if (event && event.target && event.target.result) {
            const data = JSON.parse(event.target.result.toString());
            console.log('IMPORT DATA', data);
            this.props.clearCanvas();
            this.props.importToCanvas(
              data.flows.flow.nodes,
              this.props.canvasApp,
              this.props.canvasUpdated,
              undefined,
              0,
              getGLNodeTaskFactory
            );
            this.props.canvasApp.centerCamera();
            this.props.initializeNodes();
          }
        });
        reader.readAsBinaryString(files[0]);
      }
    };
    input.click();
    return false;
  };

  render() {
    super.render();

    if (!this.element) return;

    if (
      this.previousDoRenderChildren === null ||
      this.previousDoRenderChildren !== this.doRenderChildren
    ) {
      this.previousDoRenderChildren = this.doRenderChildren;
      this.renderList = [];
      const childElements = this.doRenderChildren
        ? this.getRenderableChildren()
        : [];

      this.renderElements(childElements);
    }
  }
}

export const GLNavbarMenu = (props: GenericAppNavComponentsProps<any>) => {
  new GLNavbarComponent(null, {
    initializeNodes: props.initializeNodes,
    storageProvider: props.storageProvider,
    clearCanvas: props.clearCanvas,
    rootElement: props.rootElement,
    rootAppElement: props.rootAppElement,
    selectNodeType: props.selectNodeType,
    canvasUpdated: props.canvasUpdated,
    canvasApp: props.canvasApp,
    removeElement: props.removeElement,
    importToCanvas: props.importToCanvas,
    setIsStoring: props.setIsStoring,
  });
};