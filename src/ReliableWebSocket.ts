import { type BufferStore, IndexedDBBuffer, InMemoryBuffer } from "./BufferStores";
import { ConnectionStateMachine, WSState } from "./ConnectionStateMachine";

export type WSMessage = string | ArrayBuffer | Uint8Array | Blob;

interface ReliableWebSocketOptions {
  url: string;
  usePersistentBuffer?: boolean;
  reconnectIntervalMs?: number;
  onMessage?: (data: WSMessage) => void;
  onError?: (err: Event) => void;
}

export class ReliableWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeoutId: number | null = null;

  private readonly url: string;
  private readonly buffer: BufferStore;
  private readonly reconnectIntervalMs: number;
  private readonly stateMachine = new ConnectionStateMachine();

  private onMessage?: (data: WSMessage) => void;
  private onError?: (err: Event) => void;

  constructor(opts: ReliableWebSocketOptions) {
    this.url = opts.url;
    this.reconnectIntervalMs = opts.reconnectIntervalMs ?? 3000;
    this.buffer = opts.usePersistentBuffer ? new IndexedDBBuffer() : new InMemoryBuffer();
    this.onMessage = opts.onMessage;
    this.onError = opts.onError;
  }

  get state(): WSState {
    return this.stateMachine.state;
  }

  onState(state: WSState, handler: () => void) {
    this.stateMachine.subscribe(state, handler);
  }

  onStateChange(cb: (state: WSState) => void) {
    this.stateMachine.onAnyChange(cb);
  }

  async connect(): Promise<void> {
    await this.buffer.init();
    this._connect();
  }

  private _connect(): void {
    const isInitial = this.stateMachine.state === 'closed';
    this.stateMachine.set(isInitial ? 'connecting' : 'reconnecting');

    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = async () => {
      await this.flush();
      this.stateMachine.set('open');
    };

    this.ws.onmessage = (e) => {
      this.onMessage?.(e.data);
    };

    this.ws.onerror = (err) => {
      if (this.stateMachine.state === 'reconnecting') {
        console.debug('[ReliableWebSocket] Suppressed reconnection error:', err);
      } else {
        this.onError?.(err);
      }
    };

    this.ws.onclose = () => {
      if (this.stateMachine.state === 'closed') return;
      if (this.stateMachine.state !== 'reconnecting') {
        this.stateMachine.set('reconnecting');
        console.warn('[ReliableWebSocket] Disconnected, retrying...');
      }

      this.reconnectTimeoutId = window.setTimeout(() => {
        this._connect();
      }, this.reconnectIntervalMs);
    };
  }

  send(data: WSMessage): void {
    if (data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = () => this.sendOrBuffer(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(data);
      return;
    }

    const payload =
      typeof data === 'string'
        ? new TextEncoder().encode(data).buffer
        : data instanceof Uint8Array
          ? data.buffer
          : data;

    this.sendOrBuffer(payload);
  }

  private sendOrBuffer(buffer: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN && !this.stateMachine.is('flushing')) {
      this.ws.send(buffer);
    } else {
      this.buffer.save(buffer);
    }
  }

  private async flush(): Promise<void> {
    if (this.stateMachine.is('flushing')) return;

    const items = await this.buffer.getAll();
    if (items.length === 0) return;

    this.stateMachine.set('flushing');
    for (const item of items) {
      if (this.ws?.readyState !== WebSocket.OPEN) break;
      this.ws.send(item.buffer);
      await new Promise((r) => setTimeout(r, 50));
    }

    await this.buffer.clear();
  }

  close(): void {
    this.stateMachine.set('closed');

    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.ws?.close();
  }
}
