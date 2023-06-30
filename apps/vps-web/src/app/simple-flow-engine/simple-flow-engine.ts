import {
  ElementNodeMap,
  IConnectionNodeComponent,
  INodeComponent,
  IThumbNodeComponent,
} from '@devhelpr/visual-programming-system';
import { registerCustomFunction } from '@devhelpr/expression-compiler';

registerCustomFunction('random', [], () => {
  return Math.round(Math.random() * 100);
});

export const runNode = <T>(
  node: INodeComponent<T>,
  animatePath: (
    node: INodeComponent<T>,
    color: string,
    onNextNode?: (
      nodeId: string,
      node: INodeComponent<T>,
      input: string | any[]
    ) =>
      | { result: boolean; output: string | any[]; followPathByName?: string }
      | Promise<{
          result: boolean;
          output: string | any[];
          followPathByName?: string;
        }>,
    onStopped?: (input: string | any[]) => void,
    input?: string | any[],
    followPathByName?: string
  ) => void,
  onStopped?: (input: string | any[]) => void,
  input?: string
) => {
  const formInfo = node.nodeInfo as unknown as any;
  console.log(
    'run start',
    node.id,
    node,
    formInfo?.formValues?.['Expression'] ?? ''
  );
  let result: any = false;
  let followPath: string | undefined = undefined;
  if (formInfo?.compute) {
    const computeResult = formInfo.compute(input ?? '');
    result = computeResult.result;
    followPath = computeResult.followPath;
  } else {
    result = false;
    followPath = undefined;
  }
  if (result !== undefined) {
    animatePath(
      node as unknown as INodeComponent<T>,
      'white',
      (nodeId: string, node: INodeComponent<T>, input: string | any[]) => {
        console.log('Next nodeId', nodeId, node, input);
        let result: any = false;
        const formInfo = node.nodeInfo as unknown as any;

        if (formInfo.computeAsync) {
          return new Promise((resolve, reject) => {
            formInfo
              .computeAsync(input)
              .then((computeResult: any) => {
                result = computeResult.result;
                followPath = computeResult.followPath;

                resolve({
                  result: true,
                  output: computeResult.output ?? input,
                  followPathByName: followPath,
                });
              })
              .catch((error: any) => {
                reject(error);
              });
          });
        } else if (formInfo.compute) {
          const computeResult = formInfo.compute(input);
          result = computeResult.result;
          followPath = computeResult.followPath;
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

        return {
          result: true,
          output: result ?? input,
          followPathByName: followPath,
        };
      },
      (input: string | any[]) => {
        if (onStopped) {
          onStopped(input);
        }
      },
      result,
      followPath
    );
  } else {
    console.log('expression result', result);
  }
};
export const run = <T>(
  nodes: ElementNodeMap<T>,
  animatePath: (
    node: INodeComponent<T>,
    color: string,
    onNextNode?: (
      nodeId: string,
      node: INodeComponent<T>,
      input: string | any[]
    ) =>
      | { result: boolean; output: string | any[]; followPathByName?: string }
      | Promise<{
          result: boolean;
          output: string | any[];
          followPathByName?: string;
        }>,
    onStopped?: (input: string | any[]) => void,
    input?: string | any[],
    followPathByName?: string
  ) => void
) => {
  /*
	TODO : simple flow engine to run the nodes

    .. get all nodes that have no input
    .. run these nodes using animatePath

    .. animatePath needs an event function which is called when a node is reached
    .. in that event run the expression for that node:
      .. it errors .. stop the flow

  */

  const nodeList = Array.from(nodes);
  nodes.forEach((node) => {
    const nodeComponent = node as unknown as INodeComponent<T>;
    const connectionsFromEndNode = nodeList.filter((e) => {
      const element = e[1] as IConnectionNodeComponent<T>;
      return element.endNode?.id === node.id;
    });
    if (
      nodeComponent.nodeType !== 'connection' &&
      (!connectionsFromEndNode || connectionsFromEndNode.length === 0)
    ) {
      runNode<T>(nodeComponent, animatePath);
    }
  });
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
      input: string | any[]
    ) =>
      | { result: boolean; output: string | any[]; followPathByName?: string }
      | Promise<{
          result: boolean;
          output: string | any[];
          followPathByName?: string;
        }>,
    onStopped?: (input: string | any[]) => void,
    input?: string | any[],
    followPathByName?: string
  ) => void,
  onStopped?: (input: string | any[]) => void,
  input?: string | any[]
) => {
  //let result: any = false;
  let followPath: string | undefined = undefined;

  animatePathFromThumb(
    nodeThumb,
    'white',
    (nodeId: string, node: INodeComponent<T>, input: string | any[]) => {
      console.log('Next nodeId', nodeId, node, input);
      let result: any = false;
      const formInfo = node.nodeInfo as unknown as any;

      if (formInfo.computeAsync) {
        return new Promise((resolve, reject) => {
          formInfo
            .computeAsync(input)
            .then((computeResult: any) => {
              result = computeResult.result;
              followPath = computeResult.followPath;

              resolve({
                result: true,
                output: result ?? input,
                followPathByName: followPath,
              });
            })
            .catch((e: any) => {
              console.log('runNodeFromThumb error', e);
              reject();
            });
        });
      } else if (formInfo.compute) {
        const computeResult = formInfo.compute(input);
        result = computeResult.result;
        followPath = computeResult.followPath;
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

      return {
        result: true,
        output: result ?? input,
        followPathByName: followPath,
      };
    },
    (input: string | any[]) => {
      if (onStopped) {
        onStopped(input);
      }
    },
    input,
    followPath
  );
};