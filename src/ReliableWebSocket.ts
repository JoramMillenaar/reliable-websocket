import { type BufferStore, IndexedDBBuffer, InMemoryBuffer } from "./BufferStores.ts";

type WSMessage = string | ArrayBuffer | Uint8Array | Blob;

interface ReliableWebSocketOptions {
  url: string;
  usePersistentBuffer?: boolean;
  reconnectIntervalMs?: number;
  onOpen?: () => void;
  onMessage?: (data: WSMessage) => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
}

export class ReliableWebSocket {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly reconnectIntervalMs: number;
  private readonly persistent: boolean;
  private readonly buffer: BufferStore;
  private flushing = false;
  private listeners: {
    onOpen?: () => void;
    onMessage?: (data: WSMessage) => void;
    onClose?: () => void;
    onError?: (err: Event) => void;
  };

  constructor(opts: ReliableWebSocketOptions) {
    this.url = opts.url;
    this.reconnectIntervalMs = opts.reconnectIntervalMs ?? 3000;
    this.persistent = opts.usePersistentBuffer ?? true;
    this.listeners = {
      onOpen: opts.onOpen,
      onMessage: opts.onMessage,
      onClose: opts.onClose,
      onError: opts.onError,
    };
    this.buffer = this.persistent ? new IndexedDBBuffer() : new InMemoryBuffer();
  }

  async connect() {
    await this.buffer.init();
    this._connect();
  }

  private _connect() {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = async () => {
      console.log('[ReliableWebSocket] Connected');
      await this.flush();
      this.listeners.onOpen?.();
    };

    this.ws.onmessage = (e) => this.listeners.onMessage?.(e.data);

    this.ws.onclose = () => {
      console.warn('[ReliableWebSocket] Disconnected, retrying...');
      this.listeners.onClose?.();
      setTimeout(() => this._connect(), this.reconnectIntervalMs);
    };

    this.ws.onerror = (err) => this.listeners.onError?.(err);
  }


  send(data: WSMessage) {
    let payload: ArrayBuffer;

    if (typeof data === 'string') {
      payload = new TextEncoder().encode(data).buffer;
    } else if (data instanceof Uint8Array) {
      payload = data.buffer;
    } else if (data instanceof Blob) {
      const reader = new FileReader();
      reader.readAsArrayBuffer(data);
      reader.onload = () => this.sendOrBuffer(reader.result as ArrayBuffer);
      return;
    } else {
      payload = data;
    }

    this.sendOrBuffer(payload);
  }

  private sendOrBuffer(buffer: ArrayBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN && !this.flushing) {
      this.ws.send(buffer);
    } else {
      this.buffer.save(buffer);
    }
  }

  private async flush() {
    if (this.flushing) return;
    this.flushing = true;

    const items = await this.buffer.getAll();
    for (const item of items) {
      if (this.ws?.readyState !== WebSocket.OPEN) break;
      this.ws.send(item.buffer);
      await new Promise(r => setTimeout(r, 50));
    }

    await this.buffer.clear();
    this.flushing = false;
  }

  close() {
    this.ws?.close();
  }
}
