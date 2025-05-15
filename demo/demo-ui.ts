import { ReliableWebSocket } from "../src";

export function setupDemoUI() {
  const $log = document.getElementById('log')!;
  const $btn = document.getElementById('streamBtn') as HTMLButtonElement;
  const $stop = document.getElementById('stopBtn') as HTMLButtonElement;

  const log = (msg: string) => {
    console.log(msg);
    $log.textContent += msg + '\n';
    $log.scrollTop = $log.scrollHeight;
  };

  let streaming = false;
  let streamInterval: number | null = null;

  const socket = new ReliableWebSocket({
    url: 'ws://localhost:3000',
    onMessage: msg => log(`← ${typeof msg === 'string' ? msg : '[binary]'}`),
    onError: err => console.error("WebSocket Error", err),
  });

  socket.onState('connecting', () => log('🔌 Connecting...'));
  socket.onState('open', () => log('✅ Ready to send messages...'));
  socket.onState('flushing', () => log('📤 Flushing buffered messages...'));
  socket.onState('reconnecting', () => log('🔁 Reconnecting...'));
  socket.onState('closed', () => log('❌ Connection closed'));

  $btn.onclick = () => {
    socket.connect().then(() => {
      if (streaming) return;

      streaming = true;
      $btn.disabled = true;
      $stop.disabled = false;
      log('▶️ Stream started');
      streamInterval = window.setInterval(() => {
        if (!streaming) return;
        socket.send(`ping ${Date.now()}`);
      }, 1000);
    })
  };

  $stop.onclick = () => {
    streaming = false;
    log('⏹ Stream stopped');
    if (streamInterval !== null) {
      clearInterval(streamInterval);
      streamInterval = null;
    }
    socket.close();
    $btn.disabled = false;
    $stop.disabled = true;
  };
}

setupDemoUI();
