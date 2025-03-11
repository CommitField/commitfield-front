// src/services/WebSocketService.js - Fixed WebSocket implementation
import { API_BACKEND_URL } from '../config';

class WebSocketService {
  constructor() {
    this.webSocket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.messageCallbacks = new Set();
    this.connectionCallbacks = new Set();
    this.subscribedRooms = new Set();
    this.pendingMessages = [];
    this.connectionPromise = null;
  }

  connect() {
    // If already connecting, return the existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create a new connection promise
    this.connectionPromise = new Promise((resolve, reject) => {
      // 이미 연결된 경우 처리
      if (this.isConnected && this.webSocket) {
        console.log('WebSocket already connected');
        this.notifyConnectionStatus(true);
        resolve(true);
        return;
      }

      // 기존 연결이 있으면 먼저 종료
      if (this.webSocket) {
        try {
          this.webSocket.close();
        } catch (err) {
          console.error('Error closing previous connection:', err);
        }
      }

      try {
        // 연결 시작 알림
        this.notifyConnectionStatus(false);

        // WebSocket 연결 생성
        const baseUrl = API_BACKEND_URL || 'http://localhost:8090';
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsBaseUrl = baseUrl.replace(/^https?:/, wsProtocol);

        console.log(`Connecting to WebSocket at ${wsBaseUrl}/chat-rooms`);

        // WebSocket 객체 생성
        this.webSocket = new WebSocket(`${wsBaseUrl}/chat-rooms`);

        // 연결 성공 이벤트 핸들러
        this.webSocket.onopen = (event) => {
          console.log('WebSocket Connected:', event);
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // 연결 상태 알림
          this.notifyConnectionStatus(true);

          // 연결 성공 시 기존에 구독했던 모든 방에 다시 구독
          setTimeout(() => {
            this.subscribedRooms.forEach(roomId => {
              this.subscribeToRoom(roomId);
            });

            // 보류 중인 메시지 처리
            this.processPendingMessages();
          }, 500);

          // 연결 성공 시스템 메시지 전송
          this.messageCallbacks.forEach(callback => {
            callback({
              type: 'SYSTEM',
              message: '채팅에 연결되었습니다.'
            });
          });

          // Promise 해결
          resolve(true);
        };

        // 메시지 수신 이벤트 핸들러
        this.webSocket.onmessage = (event) => {
          try {
            console.log('WebSocket message received:', event.data);
            const receivedMessage = JSON.parse(event.data);

            // 메시지 수신 시 모든 콜백 실행
            this.messageCallbacks.forEach(callback => {
              callback(receivedMessage);
            });
          } catch (error) {
            console.error('Error parsing websocket message:', error);
          }
        };

        // 에러 이벤트 핸들러
        this.webSocket.onerror = (error) => {
          console.error('WebSocket error:', error);

          // 연결 상태 알림
          this.notifyConnectionStatus(false);

          this.messageCallbacks.forEach(callback => {
            callback({
              type: 'SYSTEM',
              message: '채팅 연결 오류가 발생했습니다.'
            });
          });

          // Promise 거부
          reject(error);
        };

        // 연결 종료 이벤트 핸들러
        this.webSocket.onclose = (event) => {
          console.log('WebSocket closed:', event);
          this.isConnected = false;

          // 연결 상태 알림
          this.notifyConnectionStatus(false);

          // 연결 종료 시스템 메시지 전송
          this.messageCallbacks.forEach(callback => {
            callback({
              type: 'SYSTEM',
              message: '채팅 연결이 끊어졌습니다. 재연결을 시도합니다...'
            });
          });

          // Promise 거부
          reject(new Error('WebSocket connection closed'));

          // 자동 재연결 시도
          this.connectionPromise = null; // Reset the promise
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              console.log(`Reconnection attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`);
              this.connect();
            } else {
              console.error('Max reconnection attempts reached');
              this.messageCallbacks.forEach(callback => {
                callback({
                  type: 'SYSTEM',
                  message: '채팅 연결에 실패했습니다. 페이지를 새로고침 해주세요.'
                });
              });
            }
          }, 3000);
        };

      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        this.isConnected = false;

        // 연결 상태 알림
        this.notifyConnectionStatus(false);

        // Promise 거부
        reject(error);

        // 에러 발생 시 재연결 시도
        this.connectionPromise = null; // Reset the promise
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
      }
    });

    return this.connectionPromise;
  }

  // 보류 중인 메시지 처리
  processPendingMessages() {
    if (this.pendingMessages.length > 0) {
      console.log(`Processing ${this.pendingMessages.length} pending messages`);

      const messages = [...this.pendingMessages];
      this.pendingMessages = [];

      messages.forEach(msg => {
        try {
          this.webSocket.send(JSON.stringify(msg));
          console.log('Sent pending message:', msg);
        } catch (err) {
          console.error('Error sending pending message:', err);
          // 실패한 메시지는 다시 보류 목록에 추가
          this.pendingMessages.push(msg);
        }
      });
    }
  }

  // 연결 상태 알림 메서드
  notifyConnectionStatus(isConnected) {
    this.connectionCallbacks.forEach(callback => {
      callback(isConnected);
    });
  }

  // 연결 상태 변경 리스너 등록
  onConnectionChange(callback) {
    this.connectionCallbacks.add(callback);
    // 현재 연결 상태 즉시 알림
    callback(this.isConnected);
    return () => this.connectionCallbacks.delete(callback);
  }

  // 특정 채팅방 구독
  async subscribeToRoom(roomId) {
    // Ensure we have a valid roomId
    if (!roomId || isNaN(parseInt(roomId))) {
      console.error(`Invalid roomId: ${roomId}`);
      return false;
    }

    // Convert to number if it's a string
    const roomIdNum = parseInt(roomId);

    // 이미 구독 중인 경우 처리
    if (this.subscribedRooms.has(roomIdNum)) {
      console.log(`Already subscribed to room ${roomIdNum}`);
      return true;
    }

    try {
      // 연결 확인 및 필요시 연결
      if (!this.isConnected) {
        try {
          await this.connect();
        } catch (err) {
          console.warn('Failed to connect WebSocket for subscription:', err);
          this.subscribedRooms.add(roomIdNum); // Mark as intending to subscribe
          return false;
        }
      }

      console.log(`Attempting to subscribe to room ${roomIdNum}`);

      // 서버에 구독 요청 메시지 전송
      const subscribeMessage = {
        type: 'SUBSCRIBE',
        roomId: roomIdNum
      };

      // WebSocket connected, send the message
      if (this.isConnected && this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify(subscribeMessage));
        this.subscribedRooms.add(roomIdNum);
        console.log(`Subscribed to room ${roomIdNum}`);
        return true;
      } else {
        // Queue the subscription for when the connection is established
        this.pendingMessages.push(subscribeMessage);
        this.subscribedRooms.add(roomIdNum); // Mark as intending to subscribe
        console.log(`WebSocket not ready, queuing subscription to room ${roomIdNum}`);
        return false;
      }
    } catch (error) {
      console.error(`Error subscribing to room ${roomIdNum}:`, error);
      // Add to subscribed rooms so we retry on reconnect
      this.subscribedRooms.add(roomIdNum);
      return false;
    }
  }

  // 특정 채팅방 구독 해지
  unsubscribeFromRoom(roomId) {
    // Ensure we have a valid roomId
    if (!roomId || isNaN(parseInt(roomId))) {
      console.error(`Invalid roomId for unsubscribe: ${roomId}`);
      return false;
    }

    // Convert to number if it's a string
    const roomIdNum = parseInt(roomId);

    // 구독 중이 아닌 경우
    if (!this.subscribedRooms.has(roomIdNum)) {
      console.log(`Not subscribed to room ${roomIdNum}`);
      return true;
    }

    try {
      // 서버에 구독 해지 요청 메시지 전송
      const unsubscribeMessage = {
        type: 'UNSUBSCRIBE',
        roomId: roomIdNum
      };

      // WebSocket connected, send the message
      if (this.isConnected && this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify(unsubscribeMessage));
      } else {
        // Queue the unsubscription for when the connection is established
        this.pendingMessages.push(unsubscribeMessage);
      }

      this.subscribedRooms.delete(roomIdNum);
      console.log(`Unsubscribed from room ${roomIdNum}`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from room ${roomIdNum}:`, error);
      return false;
    }
  }

  // 메시지 수신 이벤트 리스너 등록
  onMessage(callback) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  // 메시지 전송 메서드
  async sendMessage(roomId, message, userId, nickname) {
    try {
      if (!roomId || !message) {
        console.error('Missing required fields for sending message:', { roomId, message });
        return false;
      }

      // 사용자 정보 가져오기
      const userResponse = await fetch(`${API_BACKEND_URL}/api/user/chatinfo`, {
        credentials: 'include'
      });
      const userData = await userResponse.json();

      if (!userData || !userData.id) {
        console.error('Failed to get user info');
        return false;
      }

      const chatMessage = {
        type: 'CHAT',
        roomId: parseInt(roomId),
        userId: userData.id,
        from: userData.nickname,
        username: userData.username,
        email: userData.email,
        message: message,
        sendAt: new Date().toISOString()
      };

      console.log('Sending message with user info:', chatMessage);

      if (this.isConnected && this.webSocket?.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify(chatMessage));
        return true;
      } else {
        this.pendingMessages.push(chatMessage);
        return false;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  // 웹소켓 연결 종료 메서드
  disconnect() {
    if (this.webSocket) {
      try {
        // 모든 구독 해지
        this.subscribedRooms.forEach(roomId => {
          this.unsubscribeFromRoom(roomId);
        });

        this.webSocket.close();
        this.isConnected = false;

        // 연결 상태 알림
        this.notifyConnectionStatus(false);

        this.subscribedRooms.clear();
        this.pendingMessages = [];
        this.connectionPromise = null;
        console.log('WebSocket disconnected');
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error);
      }
    }
  }

  // Checks connection status and attempts to reconnect if needed
  async ensureConnection() {
    if (!this.isConnected) {
      try {
        await this.connect();
        return true;
      } catch (err) {
        console.error('Failed to reconnect WebSocket:', err);
        return false;
      }
    }
    return true;
  }
}

// 싱글톤 인스턴스 생성
const webSocketService = new WebSocketService();
export default webSocketService;