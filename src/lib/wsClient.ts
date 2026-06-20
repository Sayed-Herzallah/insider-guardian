import { WS_BASE_URL } from '@/config/api';
import { getTokens } from './apiClient';

type WsCallback = (payload: any) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<WsCallback>> = new Map();
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private url: string = WS_BASE_URL;

  public connect() {
    this.disconnect();

    const { access } = getTokens();
    if (!access) {
      console.warn('WebSocket: Cannot connect, no access token found.');
      return;
    }

    const connectUrl = `${this.url}?token=${encodeURIComponent(access)}`;
    console.log('WebSocket: Connecting to', connectUrl);

    try {
      this.socket = new WebSocket(connectUrl);

      this.socket.onopen = () => {
        console.log('WebSocket: Connected successfully.');
        this.startHeartbeat();
        this.subscribeStats();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;
          const payload = data.payload;

          if (type === 'pong') {
            // Heartbeat acknowledged
            return;
          }

          const callbacks = this.listeners.get(type);
          if (callbacks) {
            callbacks.forEach((cb) => cb(payload));
          }
        } catch (e) {
          console.error('WebSocket: Failed to parse message', e);
        }
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket: Connection closed.', event.reason);
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket: Error occurred.', error);
      };
    } catch (e) {
      console.error('WebSocket: Connection setup failed.', e);
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public subscribe(type: string, callback: WsCallback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      const callbacks = this.listeners.get(type);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  public send(type: string, payload: any = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket: Cannot send message, socket is not open.');
    }
  }

  public subscribeStats() {
    this.send('subscribe_stats');
  }

  public requestRefresh() {
    this.send('request_refresh');
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      this.send('ping');
    }, 30000); // 30 seconds keepalive
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    console.log('WebSocket: Scheduling reconnect in 5 seconds...');
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000);
  }
}

export const wsClient = new WebSocketClient();
