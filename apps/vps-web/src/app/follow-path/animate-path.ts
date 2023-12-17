import {
  CanvasAppInstance,
  createElement,
  IConnectionNodeComponent,
  IElementNode,
  IRectNodeComponent,
  IThumbNodeComponent,
} from '@devhelpr/visual-programming-system';
import {
  getNodeConnectionPairById,
  getNodeConnectionPairsFromThumb,
} from './get-node-connection-pairs';
import { getPointOnConnection } from './point-on-connection';
import { NodeInfo } from '../types/node-info';
import { followNodeExecution } from './followNodeExecution';

function getSpeed(maxSpeed: number, speedMeter: number) {
  //return 1;
  return (maxSpeed * (1000 - speedMeter)) / 1000;
}
function getLoopIncrement() {
  return 0.25;
  //return 0.1;
}
function getMaxLoop() {
  //return 0;
  return 1.015;
}

export type AnimatePathFunction<T> = (
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
  followPathByName?: string, // normal, success, failure, "subflow",
  animatedNodes?: {
    node1?: IElementNode<unknown>;
    node2?: IElementNode<unknown>;
    node3?: IElementNode<unknown>;
  },
  offsetX?: number,
  offsetY?: number,
  followPathToEndThumb?: boolean,
  singleStep?: boolean,
  followThumb?: string,
  scopeId?: string
) => void;

export type AnimatePathFromThumbFunction<T> = (
  node: IThumbNodeComponent<T>,
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
      }>,
  onStopped?: (input: string | any[], scopeId?: string) => void,
  input?: string | any[],
  followPathByName?: string, // normal, success, failure, "subflow",
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
) => void;

export type FollowPathFunction = <T>(
  canvasApp: CanvasAppInstance<T>,
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
        followThumb?: string;
      }
    | Promise<{
        result: boolean;
        output: string | any[];
        followPathByName?: string;
        followThumb?: string;
      }>,
  onStopped?: (input: string | any[], scopeId?: string) => void,
  input?: string | any[],
  followPathByName?: string, // normal, success, failure, "subflow",
  animatedNodes?: {
    node1?: IElementNode<unknown>;
    node2?: IElementNode<unknown>;
    node3?: IElementNode<unknown>;
  },
  offsetX?: number,
  offsetY?: number,
  followPathToEndThumb?: boolean,
  singleStep?: boolean,
  followThumb?: string,
  scopeId?: string
) => void;

export const timers: Map<NodeJS.Timer, () => void> = new Map();

interface NodeAnimatonInfo {
  node: IRectNodeComponent<NodeInfo>;
  loopIndex: number;
}

const nodeAnimationMap: Map<string, NodeAnimatonInfo> = new Map();

let speedMeter = 1000;
export const setSpeedMeter = (speed: number) => {
  speedMeter = speed;
};

let targetX: number | undefined = undefined;
let targetY: number | undefined = undefined;
let nodeId = '';
let targetScale = 1.0;
let isTargetinCameraSpace = false;
export function setTargetCameraAnimation(
  x: number,
  y: number,
  id: string,
  scale: number
) {
  console.log('setTargetCameraAnimation', x, y, id, scale);
  targetX = x;
  targetY = y;
  nodeId = id;
  targetScale = scale;
  isTargetinCameraSpace = false;
}

export function setPositionTargetCameraAnimation(
  x: number,
  y: number,
  scale?: number
) {
  isTargetinCameraSpace = true;
  targetX = x;
  targetY = y;
  if (scale !== undefined) {
    targetScale = scale;
  }
}

let isCameraAnimationRunning = false;
export function setCameraAnimation<T>(canvasApp: CanvasAppInstance<T>) {
  isCameraAnimationRunning = true;
  const animateCamera = () => {
    if (targetX !== undefined && targetY !== undefined) {
      const canvasCamera = canvasApp.getCamera();
      let x = 600 - targetX * targetScale;
      let y = 340 - targetY * targetScale;
      let factor = 0.005;
      if (isTargetinCameraSpace) {
        x = targetX;
        y = targetY;
        factor = 0.3;
      }
      const distance = Math.sqrt(
        Math.pow(canvasCamera.x - x, 2) + Math.pow(canvasCamera.y - y, 2)
      );
      // canvasApp.setCamera(
      //   -x, // + distance * 0.001,
      //   -y, // + distance * 0.001,
      //   1.0 //canvasCamera.scale
      // );

      const scaleDiff = targetScale - canvasCamera.scale;
      if (distance < 0.001) {
        canvasApp.setCamera(
          canvasCamera.x,
          canvasCamera.y,
          canvasCamera.scale + scaleDiff * factor
        );
      } else {
        const normalizedX = (x - canvasCamera.x) / distance;
        const normalizedY = (y - canvasCamera.y) / distance;

        canvasApp.setCamera(
          canvasCamera.x + distance * factor * normalizedX,
          canvasCamera.y + distance * factor * normalizedY,
          canvasCamera.scale + scaleDiff * factor
        );
      }
    }
    requestAnimationFrame(animateCamera);
  };
  requestAnimationFrame(animateCamera);
}

// TODO : alt : animatePathFromThumb
// TODO : rename node1,node2,node3 and put in object
// TODO : what parameters put together in "options" parameter?
// TODO : build different variations of this function for the different use-cases

export const animatePathForNodeConnectionPairs = <T>(
  canvasApp: CanvasAppInstance<T>,
  nodeConnectionPairs:
    | false
    | {
        start: IRectNodeComponent<T>;
        end: IRectNodeComponent<T>;
        connection: IConnectionNodeComponent<T>;
      }[],
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
) => {
  if (!nodeConnectionPairs || nodeConnectionPairs.length === 0) {
    if (animatedNodes?.node1 && animatedNodes?.node2 && animatedNodes?.node3) {
      canvasApp?.elements.delete(animatedNodes?.node1.id);
      animatedNodes?.node1?.domElement?.remove();

      canvasApp?.elements.delete(animatedNodes?.node2.id);
      animatedNodes?.node2?.domElement?.remove();
    }
    if (onStopped) {
      console.log('animatePath onStopped4', input);
      onStopped(input ?? '', scopeId);
    }
    return;
  }
  const maxSpeed = 500;
  const currentSpeed = speedMeter;
  nodeConnectionPairs.forEach((nodeConnectionPair, index) => {
    const start = nodeConnectionPair.start;
    const connection = nodeConnectionPair.connection;
    const end = nodeConnectionPair.end;
    if (
      followNodeExecution &&
      index === 0 &&
      end &&
      end.id !== nodeId &&
      start.id !== nodeId
    ) {
      nodeId = end.id;

      if (isTargetinCameraSpace) {
        targetX = end.x;
        targetY = end.y;
      } else {
        targetX = end.x;
        targetY = end.y;
      }
      targetScale = 0.5;
      isTargetinCameraSpace = false;

      // if (!isCameraAnimationRunning) {
      //   isCameraAnimationRunning = true;
      //   setCameraAnimation(canvasApp);
      // }
      // const canvasCamera = canvasApp.getCamera();
      // const x = end.x; // canvasCamera.scale;
      // const y = end.y; // canvasCamera.scale;
      // const distance = Math.sqrt(
      //   Math.pow(canvasCamera.x - x, 2) + Math.pow(canvasCamera.y - y, 2)
      // );
      // canvasApp.setCamera(
      //   -x, // + distance * 0.001,
      //   -y, // + distance * 0.001,
      //   1.0 //canvasCamera.scale
      // );

      // const normalizedX = (x - canvasCamera.x) / distance;
      // const normalizedY = (y - canvasCamera.y) / distance;

      // canvasApp.setCamera(
      //   canvasCamera.x + distance * 0.01 * normalizedX,
      //   canvasCamera.y + distance * 0.01 * normalizedY,
      //   0.5 //canvasCamera.scale
      // );
    }
    // eslint-disable-next-line prefer-const
    let testCircle =
      animatedNodes?.node1 ??
      createElement(
        'div',
        {
          class: `connection-cursor__circle absolute top-0 left-0 z-[1000] pointer-events-none origin-center flex text-center items-center justify-center w-[20px] h-[20px] overflow-hidden rounded`,
          style: {
            'background-color': color,
            'clip-path': 'circle(50%)',
          },
        },
        canvasApp?.canvas.domElement,
        ''
      );

    // eslint-disable-next-line prefer-const
    let message =
      animatedNodes?.node2 ??
      createElement(
        'div',
        {
          class: `connection-cursor__message flex text-center truncate min-w-0 overflow-hidden z-[1010] pointer-events-none origin-center px-2 bg-white text-black absolute top-[-100px] z-[1000] left-[-50px] items-center justify-center w-[80px] h-[100px] overflow-hidden`,
          style: {
            'clip-path':
              'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)',
          },
        },
        canvasApp?.canvas.domElement,
        ''
      );

    // eslint-disable-next-line prefer-const
    let messageText =
      animatedNodes?.node3 ??
      createElement(
        'div',
        {
          class: `connection-cursor__text truncate min-w-0 overflow-hidden w-[80px] mt-[-30px]`,
        },
        message.domElement,
        input?.toString() ??
          (start.nodeInfo as unknown as any)?.formValues?.Expression ??
          ''
      );
    console.log('animatePathForNodeConnectionPairs', input);
    messageText.domElement.textContent =
      input?.toString() ??
      (start.nodeInfo as unknown as any)?.formValues?.Expression ??
      '';

    // dirty hack to prevent reusing cached node on next iteration if nodeConnectionPairs.length > 1
    if (animatedNodes?.node1) {
      animatedNodes.node1 = undefined;
    }
    if (animatedNodes?.node2) {
      animatedNodes.node2 = undefined;
    }
    if (animatedNodes?.node3) {
      animatedNodes.node3 = undefined;
    }

    const domCircle = testCircle.domElement as HTMLElement;
    const domMessage = message.domElement as HTMLElement;
    if (!animatedNodes?.node1) {
      domCircle.style.display = 'none';
      domMessage.style.display = 'none';
      domMessage.style.pointerEvents = 'none';
    }

    if (connection.layer === 2) {
      domCircle.classList.add('layer-2');
      domMessage.classList.add('layer-2');
      domCircle.classList.remove('layer-1');
      domMessage.classList.remove('layer-1');
    } else {
      domCircle.classList.add('layer-1');
      domMessage.classList.add('layer-1');
      domCircle.classList.remove('layer-2');
      domMessage.classList.remove('layer-2');
    }
    let loop = 0;
    const onInterval = () => {
      if (
        start &&
        end &&
        //connection.onCalculateControlPoints &&
        connection &&
        connection.controlPoints &&
        connection.controlPoints.length >= 1
      ) {
        const bezierCurvePoints = getPointOnConnection<T>(
          loop,
          connection,
          start,
          end
        );

        if (!animatedNodes?.node1) {
          domCircle.style.display = 'flex';
        }
        domCircle.style.transform = `translate(${
          bezierCurvePoints.x + (offsetX ?? 0)
        }px, ${bezierCurvePoints.y + (offsetY ?? 0)}px)`;
        if (!animatedNodes?.node1) {
          domMessage.style.display = 'flex';
        }
        domMessage.style.transform = `translate(${
          bezierCurvePoints.x + (offsetX ?? 0)
        }px, ${bezierCurvePoints.y + (offsetY ?? 0)}px)`;

        // loop += 0.015;
        loop += getLoopIncrement(); //0.1;
        if (loop > getMaxLoop()) {
          //  1.015
          loop = 0;

          // canvasApp?.elements.delete(testCircle.id);
          // testCircle?.domElement?.remove();

          // canvasApp?.elements.delete(message.id);
          // message?.domElement?.remove();

          clearInterval(cancel);
          timers.delete(cancel);

          if (!onNextNode || onNextNode) {
            const onNextOrPromise = singleStep ??
              onNextNode?.(end.id, end, input ?? '', connection, scopeId) ?? {
                result: true,
                output: '',
                followPathByName: undefined,
              };

            if (
              Array.isArray(onNextOrPromise) ||
              (onNextOrPromise as unknown as Promise<unknown>).then
            ) {
              testCircle && canvasApp?.elements.delete(testCircle.id);
              testCircle?.domElement?.remove();

              message && canvasApp?.elements.delete(message.id);
              message?.domElement?.remove();
              (testCircle as unknown as undefined) = undefined;
              (message as unknown as undefined) = undefined;
              (messageText as unknown as undefined) = undefined;
            }
            //
            const resolver = (result: any) => {
              //const result =
              console.log('animatePath onNextNode result', input, result);
              if (!result.stop && result.result !== undefined) {
                animatePath<T>(
                  canvasApp,
                  end,
                  color,
                  onNextNode,
                  onStopped,
                  result.output,
                  result.followPathByName,
                  { node1: testCircle, node2: message, node3: messageText },
                  offsetX,
                  offsetY,
                  undefined,
                  undefined,
                  result.followThumb,
                  scopeId
                );
              } else {
                testCircle && canvasApp?.elements.delete(testCircle.id);
                testCircle?.domElement?.remove();

                message && canvasApp?.elements.delete(message.id);
                message?.domElement?.remove();
                if (onStopped) {
                  console.log(
                    'animatePath onStopped1',
                    nodeConnectionPairs,
                    input,
                    result.output
                  );
                  onStopped(result.output ?? input ?? '');
                }
              }
            };

            Promise.resolve(onNextOrPromise)
              .then(resolver)
              .catch((err) => {
                console.log('animatePath onNextNode error', err);
              });
          } else {
            testCircle && canvasApp?.elements.delete(testCircle.id);
            testCircle?.domElement?.remove();

            canvasApp?.elements.delete(message.id);
            message?.domElement?.remove();
            if (onStopped) {
              console.log('animatePath onStopped2', nodeConnectionPairs, input);
              onStopped(input ?? '');
            }
          }
        } else {
          if (speedMeter !== currentSpeed) {
            clearInterval(cancel);
            timers.delete(cancel);
            cancel = setInterval(onInterval, getSpeed(maxSpeed, speedMeter));
            setCanceler();
          }
        }
      } else {
        if (start) {
          onNextNode && onNextNode(start.id, start, input ?? '', connection);
        }
        testCircle && canvasApp?.elements.delete(testCircle.id);
        testCircle?.domElement?.remove();

        canvasApp?.elements.delete(message.id);
        message?.domElement?.remove();

        clearInterval(cancel);
        timers.delete(cancel);

        if (onStopped) {
          console.log('animatePath onStopped3', nodeConnectionPairs, input);
          onStopped(input ?? '');
        }
      }
    };
    // console.log('animate speed', (maxSpeed * (1000 - speedMeter)) / 1000);
    let cancel = setInterval(onInterval, getSpeed(maxSpeed, speedMeter));

    const setCanceler = () => {
      timers.set(cancel, () => {
        clearInterval(cancel);
        timers.delete(cancel);
        //console.log('animate speed', (maxSpeed * (1000 - speedMeter)) / 1000);
        cancel = setInterval(onInterval, getSpeed(maxSpeed, speedMeter));
        setCanceler();
      });
    };
    setCanceler();
  });
};

export const animatePath: FollowPathFunction = <T>(
  canvasApp: CanvasAppInstance<T>,
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
        followThumb?: string;
      }
    | Promise<{
        result: boolean;
        output: string | any[];
        followPathByName?: string;
        followThumb?: string;
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
  followThumb?: string,
  scopeId?: string
) => {
  const nodeConnectionPairs = getNodeConnectionPairById<T>(
    canvasApp,
    node,
    followPathByName,
    followPathToEndThumb,
    undefined,
    followThumb
  );

  animatePathForNodeConnectionPairs(
    canvasApp,
    nodeConnectionPairs,
    color,
    onNextNode,
    onStopped,
    input,
    followPathByName,
    animatedNodes,
    offsetX,
    offsetY,
    followPathToEndThumb,
    singleStep,
    scopeId
  );
};

export const animatePathFromThumb = <T>(
  canvasApp: CanvasAppInstance<T>,
  node: IThumbNodeComponent<T>,
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
) => {
  const connectionsPairs = getNodeConnectionPairsFromThumb<T>(canvasApp, node);

  animatePathForNodeConnectionPairs(
    canvasApp,
    connectionsPairs,
    color,
    onNextNode,
    onStopped,
    input,
    followPathByName,
    animatedNodes,
    offsetX,
    offsetY,
    followPathToEndThumb,
    singleStep,
    scopeId
  );
};
