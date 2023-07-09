import { RunNodeResult } from '../simple-flow-engine/simple-flow-engine';
import { canvasAppReturnType } from '../types/node-info';

export abstract class BaseNode<T, X> {
  abstract compute: (
    input: string | X[],
    loopIndex?: number,
    pathExecution?: RunNodeResult<T>[]
  ) => {
    result: boolean;
    followPath?: string;
  };
  abstract initializeCompute: () => void;
  abstract createVisualNode: (
    canvasApp: canvasAppReturnType,
    x: number,
    y: number,
    expression?: string,
    id?: string
  ) => void;
}
