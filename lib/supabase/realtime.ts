import { getStoredSession } from './browser';

type ChangeRecord = Record<string, unknown>;
type Handler = (record: ChangeRecord) => void;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export function subscribeSupportMessages(onInsert: Handler) {
  if (typeof window === 'undefined' || !supabaseUrl || !publishableKey) return () => undefined;
  let socket: WebSocket | null = null;
  let heartbeat = 0;
  let reconnect = 0;
  let closed = false;
  let ref = 1;

  const connect = () => {
    if (closed) return;
    const session = getStoredSession();
    if (!session?.access_token) return;
    const wsUrl = `${supabaseUrl.replace(/^http/i, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(publishableKey)}&vsn=1.0.0`;
    socket = new WebSocket(wsUrl);
    socket.onopen = () => {
      socket?.send(JSON.stringify({
        topic: 'realtime:public:support_messages',
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
            postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'support_messages' }],
          },
          access_token: session.access_token,
        },
        ref: String(ref++),
      }));
      heartbeat = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(ref++) }));
        }
      }, 25000);
    };
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as { event?: string; payload?: { data?: { record?: ChangeRecord }; record?: ChangeRecord } };
        if (message.event !== 'postgres_changes') return;
        const record = message.payload?.data?.record ?? message.payload?.record;
        if (record) onInsert(record);
      } catch { /* Ignore malformed realtime frames. */ }
    };
    socket.onclose = () => {
      if (heartbeat) window.clearInterval(heartbeat);
      if (!closed) reconnect = window.setTimeout(connect, 1500);
    };
    socket.onerror = () => socket?.close();
  };

  connect();
  return () => {
    closed = true;
    if (heartbeat) window.clearInterval(heartbeat);
    if (reconnect) window.clearTimeout(reconnect);
    socket?.close();
  };
}
