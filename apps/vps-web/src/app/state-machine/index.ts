import { IRectNodeComponent } from '@devhelpr/visual-programming-system';

export interface Transition<T> {
  name: string;
  from: string;
  to: string;
  nodeComponent: IRectNodeComponent<T>;
}
export interface State<T> {
  id: string;
  name: string;
  transitions: Transition<T>[];
  isFinal: boolean;
  nodeComponent: IRectNodeComponent<T>;
  stateMachine?: StateMachine<T>;
}

export interface StateMachine<T> {
  states: State<T>[];
  initialState: State<T> | undefined;
  currentState?: State<T>;
}
