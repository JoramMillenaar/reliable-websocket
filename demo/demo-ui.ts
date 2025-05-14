import { ReliableWebSocket } from "../src";

export function setupDemoUI() {
  const $log = document.getElementById('log')!;
  const $btn = document.getElementById('streamBtn') as HTMLButtonElement;
  const $stop = document.getElementById('stopBtn') as HTMLButtonElement;

  const log = (msg: string) => {
    $log.textContent += msg + '\n';
    $log.scrollTop = $log.scrollHeight;
  };


  const socket = new ReliableWebSocket({
    url: 'ws://localhost:3000',
    onMessage: msg => console.log("Received", msg),
    onOpen: () => console.log("Connected!"),
    onClose: () => console.log("Disconnected."),
    onError: err => console.error("Error", err),
  });

  socket.connect().then(() => {
    $btn.onclick = () => {
      socket.send("hello world");
      socket.send(new Uint8Array([1, 2, 3]).buffer);
      $btn.disabled = true;
      $stop.disabled = false;
    };

    $stop.onclick = () => {
      $btn.disabled = false;
      $stop.disabled = true;
      log('⏹ stream stopped');
    };
  });
}

setupDemoUI();