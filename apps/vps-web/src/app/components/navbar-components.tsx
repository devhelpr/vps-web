import {
  CanvasAppInstance,
  IConnectionNodeComponent,
  IElementNode,
  INodeComponent,
  IRectNodeComponent,
  NodeType,
  getSelectedNode,
  setSelectNode,
} from '@devhelpr/visual-programming-system';
import { navBarButton } from '../consts/classes';
import {
  AnimatePathFromThumbFunction,
  AnimatePathFunction,
} from '../follow-path/animate-path';

import { NodeInfo } from '../types/node-info';
import { getNodeTaskFactory } from '../node-task-registry/canvas-node-task-registry';

export interface NavbarComponentsProps {
  selectNodeType: HTMLSelectElement;
  animatePath: AnimatePathFunction<NodeInfo>;
  animatePathFromThumb: AnimatePathFromThumbFunction<NodeInfo>;
  canvasUpdated: () => void;
  canvasApp: CanvasAppInstance;
  removeElement: (element: IElementNode<NodeInfo>) => void;
}

export const NavbarComponents = (props: NavbarComponentsProps) => (
  <element:Fragment>
    <div>
      <button
        class={`${navBarButton} bg-blue-500 hover:bg-blue-700`}
        onclick={(event: Event) => {
          event.preventDefault();
          const nodeType = props.selectNodeType.value;
          let halfWidth = 0;
          let halfHeight = 0;
          if (props.canvasApp?.rootElement) {
            const box = props.canvasApp?.rootElement.getBoundingClientRect();
            halfWidth = box.width / 2;
            halfHeight = box.height / 2;
          }
          const startPos = props.canvasApp?.transformCameraSpaceToWorldSpace(
            halfWidth,
            halfHeight
          );
          const startX = (startPos?.x ?? Math.floor(Math.random() * 250)) - 100;
          const startY = (startPos?.y ?? Math.floor(Math.random() * 500)) - 150;

          const factory = getNodeTaskFactory(nodeType);

          if (factory) {
            const nodeTask = factory(props.canvasUpdated);

            const nodeElementId = getSelectedNode();
            if (nodeElementId) {
              const node = props.canvasApp?.elements?.get(
                nodeElementId
              ) as INodeComponent<NodeInfo>;

              const selectedNodeTaskFactory = getNodeTaskFactory(
                node.nodeInfo.taskType
              );
              if (node && selectedNodeTaskFactory) {
                const selectedNodeTask = selectedNodeTaskFactory(
                  props.canvasUpdated
                );
                if (
                  selectedNodeTask.isContainer &&
                  (selectedNodeTask.childNodeTasks ?? []).indexOf(nodeType) >= 0
                ) {
                  nodeTask.createVisualNode(
                    node.nodeInfo.canvasAppInstance,
                    50,
                    50,
                    undefined,
                    undefined,
                    node
                  );

                  return;
                } else if (selectedNodeTask.isContainer) {
                  return;
                }
              }
            }
            //factory.createVisualNode(props.canvasApp, startX, startY);
            //} else if (factory) {
            //const nodeTask = factory(props.canvasUpdated);
            const node = nodeTask.createVisualNode(
              props.canvasApp,
              startX,
              startY
            );
            if (node) {
              node.nodeInfo.taskType = nodeType;
            }
          }

          return false;
        }}
      >
        Add node
      </button>
      <button
        class={`${navBarButton}`}
        onclick={(event: Event) => {
          event.preventDefault();
          props.canvasApp?.centerCamera();
          return false;
        }}
      >
        Center
      </button>
      <button
        class={`${navBarButton}`}
        onclick={(event: Event) => {
          event.preventDefault();
          const nodeElementId = getSelectedNode();
          if (nodeElementId) {
            const node = props.canvasApp?.elements?.get(
              nodeElementId
            ) as INodeComponent<NodeInfo>;
            if (node) {
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
                    const connection = props.canvasApp?.elements?.get(
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

              props.removeElement(node);
              props.canvasApp?.elements?.delete(nodeElementId);

              setSelectNode(undefined);
              props.canvasUpdated();
            }
          }
          return false;
        }}
      >
        Delete
      </button>
    </div>
  </element:Fragment>
);
