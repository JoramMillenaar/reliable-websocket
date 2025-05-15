export type WSState =
  | 'closed'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'timedout'
  | 'flushing';

type StateChangeHandler = (newState: WSState) => void;

export class ConnectionStateMachine {
  private _state: WSState = 'closed';
  private subscribers: StateChangeHandler[] = [];

  get state(): WSState {
    return this._state;
  }

  set(state: WSState) {
    if (state !== this._state) {
      this._state = state;
      this.subscribers.forEach(cb => cb(state));
    }
  }

  subscribe(state: WSState, handler: () => void) {
    this.subscribers.push(newState => {
      if (newState === state) handler();
    });
  }

  onAnyChange(cb: (state: WSState) => void) {
    this.subscribers.push(cb);
  }

  is(state: WSState): boolean {
    return this._state === state;
  }
}
