# Reliable WebSocket

A simple, reconnecting WebSocket wrapper with offline buffering via IndexedDB. Useful for medical, field, or
offline-prone apps.

## Install

```bash
npm install reliable-websocket
````

## Usage

```ts
import { ReliableWebSocket } from 'reliable-websocket';

const socket = new ReliableWebSocket({
  url: 'wss://example.com/socket',
  onMessage: msg => console.log("Received", msg)
});

await socket.connect();
socket.send("hello world");
```

## Features

* Auto reconnect with backoff
* Persistent offline buffer (IndexedDB)
* Supports `string`, `ArrayBuffer`, `Uint8Array`, and `Blob`
