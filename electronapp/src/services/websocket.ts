class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(url: string = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws') {
    console.log('🔌 WebSocket接続先:', url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('🔌 WebSocket connected');
      this.emit('connected', null);
      
      // Keep-alive ping
      setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log('🏓 WebSocket ping');
          this.ws.send('ping');
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      console.log('📬 WebSocket RAW受信:', event.data);
      try {
        // pongメッセージの場合はJSON解析をスキップ
        if (event.data === 'pong') {
          console.log('🏓 WebSocket pong受信');
          return;
        }

        const data = JSON.parse(event.data);
        console.log('📨 WebSocket JSON解析成功:', JSON.stringify(data, null, 2));
        this.emit('message', data);

        // イベントタイプ別に配信
        if (data.type) {
          console.log('📨 WebSocketイベント配信:', data.type, JSON.stringify(data.data, null, 2));
          this.emit(data.type, data.data);
        }
      } catch (e) {
        console.error('❌ WebSocketメッセージ解析失敗:', e, 'RAWデータ:', event.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('❌ WebSocket disconnected');
      this.emit('disconnected', null);
      this.reconnect(url);
    };
  }

  private reconnect(url: string) {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Reconnecting...');
      this.reconnectTimer = null;
      this.connect(url);
    }, this.reconnectInterval);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WebSocketService();
