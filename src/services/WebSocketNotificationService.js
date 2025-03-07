import { API_BACKEND_URL } from '../config';

class WebSocketNotificationService {
  constructor() {
    this.webSocket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.messageCallbacks = new Set();
    this.connectionCallbacks = new Set();
    this.pendingMessages = [];
    this.connectionPromise = null;
  }

  connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      if (this.isConnected && this.webSocket) {
        console.log('WebSocket already connected');
        this.notifyConnectionStatus(true);
        resolve(true);
        return;
      }

      if (this.webSocket) {
        try {
          this.webSocket.close();
        } catch (err) {
          console.error('Error closing previous connection:', err);
        }
      }

      try {
        this.notifyConnectionStatus(false);
        const baseUrl = API_BACKEND_URL;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsBaseUrl = baseUrl.replace(/^https?:/, wsProtocol);

        this.webSocket = new WebSocket(`${wsBaseUrl}/notifications`);

        this.webSocket.onopen = (event) => {
            console.log('WebSocket Connected:', event);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.notifyConnectionStatus(true);
            
            // 연결 즉시 알림 채널 구독
            const subscribed = this.subscribeToNotificationChannel();
            console.log('Notification subscription success:', subscribed);
            
            this.processPendingMessages();
            resolve(true);
          };

        this.webSocket.onmessage = (event) => {
          try {
            const receivedMessage = JSON.parse(event.data);
            console.log('Notification received:', receivedMessage);
            this.messageCallbacks.forEach(callback => callback(receivedMessage));
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.webSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.notifyConnectionStatus(false);
          reject(error);
        };

        this.webSocket.onclose = (event) => {
          console.log('WebSocket closed:', event);
          this.isConnected = false;
          this.notifyConnectionStatus(false);
          reject(new Error('WebSocket connection closed'));

          this.connectionPromise = null;
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              console.log(`Reconnection attempt ${this.reconnectAttempts}`);
              this.connect();
            } else {
              console.error('Max reconnection attempts reached');
            }
          }, 3000);
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        this.notifyConnectionStatus(false);
        reject(error);
        this.connectionPromise = null;
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
      }
    });
    return this.connectionPromise;
  }

  onMessage(callback) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

    // 알림 채널 구독
    subscribeToNotificationChannel() {
        if (!this.webSocket || !this.isConnected) {
            console.warn('WebSocket is not connected. Unable to subscribe to notifications.');
            return false;
        }
    
        try {
            console.log('Subscribing to notification channel...');
            
            if (this.webSocket.readyState === WebSocket.OPEN) {
                // 구독 요청 메시지 전송
                this.webSocket.send(JSON.stringify({
                    type: 'SUBSCRIBE',
                    channel: 'notifications'
                }));
                
                // 연결 성공 로그
                console.log('Successfully subscribed to notification channel');
                return true;
            }
    
            return false;
        } catch (error) {
            console.error('Error subscribing to notification channel:', error);
            return false;
        }
    }

  notifyConnectionStatus(isConnected) {
    this.connectionCallbacks.forEach(callback => callback(isConnected));
  }

  onConnectionChange(callback) {
    this.connectionCallbacks.add(callback);
    callback(this.isConnected);
    return () => this.connectionCallbacks.delete(callback);
  }

  processPendingMessages() {
    if (this.pendingMessages.length > 0) {
      console.log(`Processing ${this.pendingMessages.length} pending messages`);
      
      const messages = [...this.pendingMessages];
      this.pendingMessages = [];
      
      messages.forEach(msg => {
        try {
          if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.send(JSON.stringify(msg));
            console.log('Sent pending message:', msg);
          } else {
            // 연결이 아직 준비되지 않은 경우 다시 pending 목록에 추가
            this.pendingMessages.push(msg);
          }
        } catch (err) {
          console.error('Error sending pending message:', err);
          // 실패한 메시지는 다시 pending 목록에 추가
          this.pendingMessages.push(msg);
        }
      });
    }
  }

  disconnect() {
    if (this.webSocket) {
      try {
        this.webSocket.close();
        this.isConnected = false;
        this.notifyConnectionStatus(false);
        this.pendingMessages = [];
        this.connectionPromise = null;
        console.log('WebSocket disconnected');
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error);
      }
    }
  }
}

const WebSocketService = new WebSocketNotificationService();
export default WebSocketService;