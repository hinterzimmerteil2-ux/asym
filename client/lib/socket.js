const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 5000;
const PING_EVERY_MS = 8000;
const PING_DEAD_MS = 20000;

export function createGameConnection({ onMessage, onOpen, onClose, onError } = {}) {
  let ws = null;
  let reconnectAttempts = 0;
  let manuallyClosed = false;
  let reconnectTimeout = null;
  let pingTimer = null;
  let lastRx = 0;

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    const sock = new WebSocket(WS_URL);
    ws = sock;
    sock.onopen = () => {
      reconnectAttempts = 0;
      lastRx = Date.now();
      startWatchdog();
      onOpen?.();
    };
    sock.onmessage = (event) => {
      lastRx = Date.now();
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg?.type) onMessage?.(msg.type, msg.payload || {});
    };
    sock.onclose = () => {
      if (ws !== sock) return;
      stopWatchdog();
      onClose?.();
      if (!manuallyClosed) scheduleReconnect();
    };
    sock.onerror = (err) => onError?.(err);
  }

  function startWatchdog() {
    stopWatchdog();
    pingTimer = setInterval(() => {
      if (ws?.readyState !== WebSocket.OPEN) return;
      if (Date.now() - lastRx > PING_DEAD_MS) {
        ws.close();
        return;
      }
      ws.send(JSON.stringify({ type: 'ping', payload: {} }));
    }, PING_EVERY_MS);
  }

  function stopWatchdog() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  }

  function reconnectNow() {
    if (manuallyClosed) return;
    if (ws && ws.readyState === WebSocket.OPEN && Date.now() - lastRx > PING_DEAD_MS) ws.close();
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      reconnectAttempts = 0;
      connect();
    }
  }

  function onVisible() {
    if (document.visibilityState === 'visible') reconnectNow();
  }

  function scheduleReconnect() {
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempts, RECONNECT_MAX_DELAY_MS);
    reconnectAttempts++;
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect();
    }, delay);
  }

  function send(type, payload = {}) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  function close() {
    manuallyClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    stopWatchdog();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', reconnectNow);
      document.removeEventListener('visibilitychange', onVisible);
    }
    ws?.close();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', reconnectNow);
    document.addEventListener('visibilitychange', onVisible);
  }
  connect();
  return { send, close };
}
