const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10000;

export function createGameConnection({ onMessage, onOpen, onClose, onError } = {}) {
  let ws = null;
  let reconnectAttempts = 0;
  let manuallyClosed = false;
  let reconnectTimeout = null;

  function connect() {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      reconnectAttempts = 0;
      onOpen?.();
    };
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg?.type) onMessage?.(msg.type, msg.payload || {});
    };
    ws.onclose = () => {
      onClose?.();
      if (!manuallyClosed) scheduleReconnect();
    };
    ws.onerror = (err) => onError?.(err);
  }

  function scheduleReconnect() {
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempts, RECONNECT_MAX_DELAY_MS);
    reconnectAttempts++;
    reconnectTimeout = setTimeout(connect, delay);
  }

  function send(type, payload = {}) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  function close() {
    manuallyClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    ws?.close();
  }

  connect();
  return { send, close };
}
