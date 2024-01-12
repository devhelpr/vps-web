import {
  CanvasAppInstance,
  ElementNodeMap,
  IConnectionNodeComponent,
  IElementNode,
  INodeComponent,
  IRectNodeComponent,
  IThumbNodeComponent,
  NodeType,
} from '@devhelpr/visual-programming-system';
import { registerCustomFunction } from '@devhelpr/expression-compiler';
import {
  getNodeConnectionPairById,
  getNodeConnectionPairByIdWhereNodeIsEndpoint,
} from '../follow-path/get-node-connection-pairs';
import { getFollowNodeExecution } from '../follow-path/followNodeExecution';
import { NodeInfo } from '../types/node-info';

registerCustomFunction('random', [], () => {
  return Math.round(Math.random() * 100);
});

export interface ConnectionExecute<T> {
  connection: IConnectionNodeComponent<T>;
  connectionValue: any;
}

export let connectionExecuteHistory: ConnectionExecute<NodeInfo>[] = [];

const handleDecoratrs = (
  decorators: any[],
  executeOrder: 'before' | 'after',
  input: any,
  payload: any,
  scopeId?: string
) => {
  const executeDecorators = decorators.filter((e: any) => {
    return e.executeOrder === executeOrder;
  });
  let decoratorInput = input;
  executeDecorators.forEach((decorator: any) => {
    const decoratorNode = decorator.decoratorNode;
    if (decoratorNode && decoratorNode.nodeInfo?.compute) {
      const decoratorResult = decoratorNode.nodeInfo?.compute(
        decoratorInput,
        undefined,
        runIndex,
        payload,
        undefined,
        scopeId
      );
      if (decoratorResult && !decoratorResult.stop && decoratorResult.output) {
        decoratorInput = decoratorResult.output;
      } else {
        // ? error handling decorators ?
        //return false;
      }
    }
  });
  return decoratorInput;
};

const getVariablePayload = <T>(
  node: IRectNodeComponent<T>,
  canvasApp: CanvasAppInstance<T>,
  scopeId?: string
) => {
  const dataNodesConnectionPairs =
    getNodeConnectionPairByIdWhereNodeIsEndpoint<T>(
      canvasApp,
      node,
      undefined,
      undefined,
      true
    );
  const payload: Record<string, unknown> = {};
  if (dataNodesConnectionPairs) {
    dataNodesConnectionPairs.forEach((connectionInfo) => {
      if (connectionInfo.start) {
        const nodeInfo = connectionInfo.start.nodeInfo as unknown as any;
        if (nodeInfo && nodeInfo.getData) {
          payload['variable'] = nodeInfo.getData(scopeId) ?? 0;
        }
      }
    });
  }
  return payload;
};

const sendData = <T>(
  node: IRectNodeComponent<T>,
  canvasApp: CanvasAppInstance<T>,
  data: string,
  scopeId?: string
) => {
  const dataNodesConnectionPairs = getNodeConnectionPairById<T>(
    canvasApp,
    node,
    undefined,
    undefined,
    true
  );
  if (dataNodesConnectionPairs) {
    dataNodesConnectionPairs.forEach((connectionInfo) => {
      if (connectionInfo.end) {
        const nodeInfo = connectionInfo.end.nodeInfo as unknown as any;
        if (nodeInfo && nodeInfo.sendData) {
          nodeInfo.sendData(data, scopeId);
        }
      }
    });
  }
};

// export interface RunNodeResult<T> {
//   input: string | any[];
//   previousOutput: string | any[];
//   output: string | any[];
//   result: boolean;
//   nodeId: string;
//   nodeType: string;
//   path: string;
//   scopeNode?: IRectNodeComponent<T>;
//   node: IRectNodeComponent<T>;
//   endNode?: IRectNodeComponent<T>;
//   connection?: IConnectionNodeComponent<T>;
//   previousNode?: IRectNodeComponent<T>;
//   nextNode?: IRectNodeComponent<T>;
// }

const triggerExecution = <T>(
  node: IRectNodeComponent<T>,
  canvasApp: CanvasAppInstance<T>,
  result: any,
  animatePath: (
    node: IRectNodeComponent<T>,
    color: string,
    onNextNode?: (
      nodeId: string,
      node: IRectNodeComponent<T>,
      input: string | any[],
      connection: IConnectionNodeComponent<T>,
      scopeId?: string
    ) =>
      | { result: boolean; output: string | any[]; followPathByName?: string }
      | Promise<{
          result: boolean;
          output: string | any[];
          followPathByName?: string;
          followThumb?: string;
        }>,
    onStopped?: (input: string | any[], scopeId?: string) => void,
    input?: string | any[],
    followPathByName?: string,
    animatedNodes?: undefined,
    offsetX?: number,
    offsetY?: number,
    _followPathToEndThumb?: boolean,
    _singleStep?: boolean,
    followThumb?: string,
    scopeId?: string
  ) => void,
  onStopped: undefined | ((input: string | any[], scopeId?: string) => void),
  followPath: string | undefined,
  input?: string,
  previousOutput?: any,
  offsetX?: number,
  offsetY?: number,
  scopeId?: string,
  previousNode?: IRectNodeComponent<T>
) => {
  if (result !== undefined) {
    // if (pathExecution) {
    //   pathExecution.push({
    //     input: input ?? '',
    //     output: result,
    //     previousOutput: previousOutput,
    //     result: !!result,
    //     nodeId: node.id,
    //     path: followPath ?? '',
    //     node: node,
    //     nodeType: (node.nodeInfo as any)?.type ?? '',
    //   });
    // }
    animatePath(
      node,
      'white',
      (
        _nodeId: string,
        nextNode: IRectNodeComponent<T>,
        input: string | any[],
        connection: IConnectionNodeComponent<T>,
        scopeId?: string

        // TODO : fromNode toevoegen incl compute resultaat ??
      ) => {
        let result: any = false;
        let previousOutput: any = undefined;
        const formInfo = nextNode.nodeInfo as unknown as any;

        connectionExecuteHistory.push({
          connection:
            connection as unknown as IConnectionNodeComponent<NodeInfo>,
          connectionValue: input,
        });

        const payload = getVariablePayload<T>(nextNode, canvasApp, scopeId);
        if (formInfo && formInfo.computeAsync) {
          if (formInfo.decorators) {
            const decoratorInput = handleDecoratrs(
              formInfo.decorators,
              'before',
              input,
              payload,
              scopeId
            );
            if (decoratorInput === false) {
              return {
                result: false,
                output: undefined,
              };
            }
            input = decoratorInput;
          }

          const promise = formInfo.computeAsync(
            input,
            runIndex,
            payload,
            connection?.endNodeThumb?.thumbName,
            scopeId
          );

          return new Promise((resolve, reject) => {
            promise
              .then((computeResult: any) => {
                if (computeResult.stop) {
                  if (onStopped) {
                    onStopped(computeResult.output ?? '', scopeId);
                  }
                  // return {
                  //   result: result,
                  //   stop: true,
                  //   output: result,
                  // };
                } else {
                  result = computeResult.result;
                  sendData(nextNode, canvasApp, result);
                  followPath = computeResult.followPath;

                  // if (pathExecution) {
                  //   pathExecution.push({
                  //     input: input ?? '',
                  //     previousOutput: computeResult.previousOutput,
                  //     output: computeResult.output ?? input,
                  //     result: result,
                  //     nodeId: nextNode.id,
                  //     path: followPath ?? '',
                  //     node: nextNode,
                  //     nodeType: (nextNode.nodeInfo as any)?.type ?? '',
                  //     previousNode,
                  //   });
                  // }

                  resolve({
                    result: true,
                    output: computeResult.output ?? input,
                    followPathByName: followPath,
                    followThumb: computeResult.followThumb,
                  });
                }
              })
              .catch((error: any) => {
                reject(error);
              });
          });
        } else if (formInfo && formInfo.compute) {
          if (formInfo.decorators) {
            const decoratorInput = handleDecoratrs(
              formInfo.decorators,
              'before',
              input,
              payload,
              scopeId
            );
            if (decoratorInput === false) {
              return {
                result: false,
                output: undefined,
              };
            }
            input = decoratorInput;
          }
          const computeResult = formInfo.compute(
            input,
            runIndex,
            payload,
            connection?.endNodeThumb?.thumbName,
            scopeId
          );
          result = computeResult.result;
          sendData(nextNode, canvasApp, result);
          followPath = computeResult.followPath;
          previousOutput = computeResult.previousOutput;

          if (computeResult.stop) {
            if (onStopped) {
              onStopped(computeResult.output ?? '', scopeId);
            }
            return {
              result: result,
              stop: true,
              output: result,
            };
          }

          if (formInfo.decorators) {
            if (formInfo.decorators) {
              const decoratorInput = handleDecoratrs(
                formInfo.decorators,
                'after',
                input,
                payload,
                scopeId
              );
              if (decoratorInput === false) {
                return {
                  result: false,
                  output: undefined,
                };
              }
              input = decoratorInput;
            }
          }
        } else {
          result = false;
          followPath = undefined;
        }
        if (result === undefined) {
          return {
            result: false,
            output: result,
          };
        }

        // if (pathExecution) {
        //   pathExecution.push({
        //     input: input ?? '',
        //     output: result,
        //     previousOutput: previousOutput,
        //     result: !!result,
        //     nodeId: nextNode.id,
        //     path: followPath ?? '',
        //     node: nextNode,
        //     nodeType: (nextNode.nodeInfo as any)?.type ?? '',
        //     previousNode,
        //   });
        // }

        return {
          result: true,
          output: result ?? input,
          followPathByName: followPath,
        };
      },
      (input: string | any[]) => {
        if (onStopped) {
          onStopped(input, scopeId);
        }
      },
      result,
      followPath,
      undefined,
      offsetX,
      offsetY,
      undefined,
      undefined,
      undefined,
      scopeId
    );
  } else {
    console.log('expression result', result);
  }
};

let runIndex = 0;
export const resetRunIndex = () => {
  runIndex = 0;
};
export const increaseRunIndex = () => {
  runIndex++;
};

export const runNode = <T>(
  node: IRectNodeComponent<T>,
  canvasApp: CanvasAppInstance<T>,
  animatePath: (
    node: IRectNodeComponent<T>,
    color: string,
    onNextNode?: (
      nodeId: string,
      node: IRectNodeComponent<T>,
      input: string | any[],
      connection: IConnectionNodeComponent<T>,
      scopeId?: string
    ) =>
      | { result: boolean; output: string | any[]; followPathByName?: string }
      | Promise<{
          result: boolean;
          output: string | any[];
          followPathByName?: string;
          followThumb?: string;
        }>,
    onStopped?: (input: string | any[], scopeId?: string) => void,
    input?: string | any[],
    followPathByName?: string,
    animatedNodes?: undefined,
    offsetX?: number,
    offsetY?: number,
    _followPathToEndThumb?: boolean,
    _singleStep?: boolean,
    followThumb?: string
  ) => void,
  onStopped?: (input: string | any[], scopeId?: string) => void,
  input?: string,
  offsetX?: number,
  offsetY?: number,
  loopIndex?: number,
  connection?: IConnectionNodeComponent<T>,
  scopeId?: string
): void => {
  const payload = getVariablePayload<T>(node, canvasApp);

  const formInfo = node.nodeInfo as unknown as any;
  let result: any = false;
  let followPath: string | undefined = undefined;
  let previousOutput: any = undefined;

  if (formInfo && formInfo?.computeAsync) {
    if (formInfo.decorators) {
      const decoratorInput = handleDecoratrs(
        formInfo.decorators,
        'before',
        input,
        payload,
        scopeId
      );
      if (decoratorInput === false) {
        return;
      }
      input = decoratorInput;
    }

    formInfo
      .computeAsync(
        input ?? '',
        loopIndex === undefined ? runIndex : loopIndex,
        payload,
        connection?.endNodeThumb?.thumbName,
        scopeId
      )
      .then((computeResult: any) => {
        sendData(node, canvasApp, computeResult.result);
        result = computeResult.result;
        followPath = computeResult.followPath;
        previousOutput = computeResult.previousOutput;
        if (computeResult.stop) {
          if (onStopped) {
            onStopped(computeResult.output ?? '', scopeId);
          }
          return;
        }
        triggerExecution(
          node,
          canvasApp,
          result,
          animatePath,
          onStopped,
          followPath,
          input,
          previousOutput,
          offsetX,
          offsetY,
          scopeId,
          node
        );
      });
  } else if (formInfo && formInfo?.compute) {
    if (formInfo.decorators) {
      const decoratorInput = handleDecoratrs(
        formInfo.decorators,
        'before',
        input,
        payload,
        scopeId
      );
      if (decoratorInput === false) {
        return;
      }
      input = decoratorInput;
    }
    const computeResult = formInfo.compute(
      input ?? '',
      loopIndex === undefined ? runIndex : loopIndex,
      payload,
      connection?.endNodeThumb?.thumbName,
      scopeId
    );

    sendData(node, canvasApp, computeResult.result);
    result = computeResult.result;
    followPath = computeResult.followPath;
    previousOutput = computeResult.previousOutput;
    if (computeResult.stop) {
      if (onStopped) {
        onStopped(computeResult.output ?? '', scopeId);
      }
      return;
    }

    if (formInfo.decorators) {
      const decoratorInput = handleDecoratrs(
        formInfo.decorators,
        'after',
        input,
        payload,
        scopeId
      );
      if (decoratorInput === false) {
        return;
      }
      input = decoratorInput;
    }

    triggerExecution(
      node,
      canvasApp,
      result,
      animatePath,
      onStopped,
      followPath,
      input,
      previousOutput,
      offsetX,
      offsetY,
      scopeId,
      node
    );
  } else {
    result = false;
    followPath = undefined;
  }
};
export const run = <T>(
  nodes: ElementNodeMap<T>,
  canvasApp: CanvasAppInstance<T>,
  animatePath: (
    node: IRectNodeComponent<T>,
    color: string,
    onNextNode?: (
      nodeId: string,
      node: IRectNodeComponent<T>,
      input: string | any[],
      connection: IConnectionNodeComponent<T>,
      scopeId?: string
    ) =>
      | {
          result: boolean;
          output: string | any[];
          followPathByName?: string;
          followPath?: string;
        }
      | Promise<{
          result: boolean;
          output: string | any[];
          followPathByName?: string;
          followPath?: string;
        }>,
    onStopped?: (input: string | any[], scopeId?: string) => void,
    input?: string | any[],
    followPathByName?: string,
    animatedNodes?: undefined,
    offsetX?: number,
    offsetY?: number,
    _followPathToEndThumb?: boolean,
    _singleStep?: boolean,
    followThumb?: string
  ) => void,
  onFinishRun?: (input: string | any[]) => void,
  input?: string,
  offsetX?: number,
  offsetY?: number
) => {
  /*
	TODO : simple flow engine to run the nodes

    .. get all nodes that have no input
    .. run these nodes using animatePath

    .. animatePath needs an event function which is called when a node is reached
    .. in that event run the expression for that node:
      .. it errors .. stop the flow

  */

  connectionExecuteHistory = [];

  const nodeList = Array.from(nodes);
  let isRunning = false;
  let cameraSet = false;
  nodes.forEach((node) => {
    const nodeComponent = node as unknown as IRectNodeComponent<T>;
    const connectionsFromEndNode = nodeList.filter((e) => {
      const eNode = e[1] as INodeComponent<T>;
      if (eNode.nodeType === NodeType.Connection) {
        const element = e[1] as IConnectionNodeComponent<T>;
        return (
          element.endNode?.id === node.id &&
          !element.isData &&
          !element.isAnnotationConnection
        );
      }
      return false;
    });
    const nodeInfo = nodeComponent.nodeInfo as any;
    if (
      !(nodeComponent.nodeInfo as any)?.isVariable &&
      nodeComponent.nodeType !== NodeType.Connection &&
      (!connectionsFromEndNode || connectionsFromEndNode.length === 0) &&
      nodeInfo?.type !== 'node-trigger-target' &&
      nodeInfo?.type !== 'function'
    ) {
      if (!cameraSet && getFollowNodeExecution()) {
        cameraSet = true;
        canvasApp.setCamera(-nodeComponent.x, -nodeComponent.y, 0.5);
      }
      isRunning = true;
      runNode<T>(
        nodeComponent,
        canvasApp,
        animatePath,
        (input: string | any[]) => {
          if (onFinishRun) {
            onFinishRun(input);
          }
        },
        input,
        offsetX,
        offsetY
      );
    }
  });
  if (!isRunning) {
    if (onFinishRun) {
      onFinishRun('');
    }
  }
  return true;
};

export const runNodeFromThumb = <T>(
  nodeThumb: IThumbNodeComponent<T>,
  animatePathFromThumb: (
    node: IThumbNodeComponent<T>,
    color: string,
    onNextNode?: (
      nodeId: string,
      node: INodeComponent<T>,
      input: string | any[],
      connection: IConnectionNodeComponent<T>,
      scopeId?: string
    ) =>
      | {
          result: boolean;
          stop?: boolean;
          output: string | any[];
          followPathByName?: string;
        }
      | Promise<{
          result: boolean;
          stop?: boolean;
          output: string | any[];
          followPathByName?: string;
        }>,
    onStopped?: (input: string | any[], scopeId?: string) => void,
    input?: string | any[],
    followPathByName?: string,
    animatedNodes?: {
      node1?: IElementNode<unknown>;
      node2?: IElementNode<unknown>;
      node3?: IElementNode<unknown>;
    },
    offsetX?: number,
    offsetY?: number,
    followPathToEndThumb?: boolean,
    singleStep?: boolean,
    scopeId?: string
  ) => void,
  onStopped?: (input: string | any[], scopeId?: string) => void,
  input?: string | any[],
  scopeNode?: IRectNodeComponent<T>,
  loopIndex?: number,
  scopeId?: string
) => {
  //let result: any = false;
  let followPath: string | undefined = undefined;

  animatePathFromThumb(
    nodeThumb,
    'white',
    (
      _nodeId: string,
      nextNode: INodeComponent<T>,
      input: string | any[],
      connection: IConnectionNodeComponent<T>,
      scopeId?: string
    ) => {
      connectionExecuteHistory.push({
        connection: connection as unknown as IConnectionNodeComponent<NodeInfo>,
        connectionValue: input,
      });

      let result: any = false;
      let previousOutput: any = undefined;
      const formInfo = nextNode.nodeInfo as unknown as any;
      console.log('runNodeFromThumb', loopIndex, nextNode);
      if (formInfo && formInfo.computeAsync) {
        if (formInfo.decorators) {
          const decoratorInput = handleDecoratrs(
            formInfo.decorators,
            'before',
            input,
            undefined,
            scopeId
          );
          if (decoratorInput === false) {
            return {
              result: false,
              output: undefined,
            };
          }
          input = decoratorInput;
        }
        return new Promise((resolve, reject) => {
          formInfo
            .computeAsync(
              input,
              loopIndex,
              undefined,
              connection?.endNodeThumb?.thumbName,
              scopeId
            )
            .then((computeResult: any) => {
              result = computeResult.result;
              followPath = computeResult.followPath;

              if (computeResult.stop) {
                resolve({
                  result: result,
                  stop: true,
                  output: result,
                });
              } else {
                // if (pathExecution) {
                //   pathExecution.push({
                //     input: input ?? '',
                //     scopeNode,
                //     output: computeResult.output ?? input,
                //     previousOutput: computeResult.previousOutput,
                //     result: result,
                //     nodeId: nextNode.id,
                //     path: followPath ?? '',
                //     node: nextNode as unknown as IRectNodeComponent<T>,
                //     nodeType: (nextNode.nodeInfo as any)?.type ?? '',
                //     previousNode:
                //       nodeThumb.thumbLinkedToNode as unknown as IRectNodeComponent<T>,
                //   });
                // }

                resolve({
                  result: true,
                  output: result ?? input,
                  followPathByName: followPath,
                });
              }
            })
            .catch((e: any) => {
              console.log('runNodeFromThumb error', e);
              reject();
            });
        });
      } else if (formInfo && formInfo.compute) {
        if (formInfo.decorators) {
          const decoratorInput = handleDecoratrs(
            formInfo.decorators,
            'before',
            input,
            undefined,
            scopeId
          );
          if (decoratorInput === false) {
            return {
              result: false,
              output: undefined,
            };
          }
          input = decoratorInput;
        }

        const computeResult = formInfo.compute(
          input,
          loopIndex,
          undefined,
          connection?.endNodeThumb?.thumbName,
          scopeId
        );
        result = computeResult.result;
        followPath = computeResult.followPath;
        previousOutput = computeResult.previousOutput;
        if (computeResult.stop) {
          return {
            result: result,
            stop: true,
            output: result,
          };
        }
      } else {
        result = false;
        followPath = undefined;
      }
      console.log('expression result', result);
      if (result === undefined) {
        return {
          result: false,
          output: result,
        };
      }

      // if (pathExecution) {
      //   pathExecution.push({
      //     input: input ?? '',
      //     output: result,
      //     previousOutput: previousOutput,
      //     result: !!result,
      //     nodeId: nextNode.id,
      //     scopeNode,
      //     path: followPath ?? '',
      //     node: nextNode as unknown as IRectNodeComponent<T>,
      //     nodeType: (nextNode.nodeInfo as any)?.type ?? '',
      //     previousNode:
      //       nodeThumb.thumbLinkedToNode as unknown as IRectNodeComponent<T>,
      //   });
      // }

      if (formInfo.decorators) {
        const decoratorInput = handleDecoratrs(
          formInfo.decorators,
          'after',
          input,
          undefined,
          scopeId
        );
        if (decoratorInput === false) {
          return {
            result: false,
            output: undefined,
          };
        }
        input = decoratorInput;
      }

      return {
        result: true,
        output: result ?? input,
        followPathByName: followPath,
      };
    },
    (input: string | any[]) => {
      if (onStopped) {
        onStopped(input, scopeId);
      }
    },
    input,
    followPath,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    scopeId
  );
};
