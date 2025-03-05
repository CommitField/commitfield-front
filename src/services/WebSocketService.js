// src/services/WebSocketService.js
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { API_BACKEND_URL } from '../config';

class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.messageCallbacks = new Set();
    this.connectionCallbacks = new Set(); // 연결 상태 콜백 추가
    this.subscribedRooms = new Set();
    this.subscriptions = {};
  }

  connect() {
    // 이미 연결된 경우 처리
    if (this.isConnected && this.stompClient) {
      console.log('WebSocket already connected');
      this.notifyConnectionStatus(true);
      return this;
    }

    // 기존 연결이 있으면 먼저 종료
    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
      } catch (err) {
        console.error('Error deactivating previous connection:', err);
      }
    }

    try {
      // 연결 시작 알림
      this.notifyConnectionStatus(false);
      
      // SockJS와 STOMP 클라이언트 생성
      const socket = new SockJS(`${API_BACKEND_URL || 'http://localhost:8090'}/ws-stomp`);
      
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        debug: function (str) {
          console.log("WebSocketService.js:27", str);
        },
        reconnectDelay: 5000, // 자동 재연결 시간 (ms)
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000
      });

      // 연결 성공 이벤트 핸들러
      this.stompClient.onConnect = (frame) => {
        console.log('WebSocketService.js:36', 'WebSocket Connected:', frame);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // 연결 상태 알림
        this.notifyConnectionStatus(true);
        
        // 연결 성공 시 기존에 구독했던 모든 방에 다시 구독
        setTimeout(() => {
          this.subscribedRooms.forEach(roomId => {
            this.subscribeToRoom(roomId);
          });
        }, 500); // 약간의 지연을 두어 STOMP 연결이 완전히 설정될 시간을 줌
        
        // 연결 성공 시스템 메시지 전송
        this.messageCallbacks.forEach(callback => {
          callback({ 
            type: 'SYSTEM', 
            message: '채팅에 연결되었습니다.' 
          });
        });
      };

      // 에러 이벤트 핸들러
      this.stompClient.onStompError = (frame) => {
        console.error('STOMP error:', frame);
        
        // 연결 상태 알림
        this.notifyConnectionStatus(false);
        
        this.messageCallbacks.forEach(callback => {
          callback({ 
            type: 'SYSTEM', 
            message: '채팅 연결 오류가 발생했습니다.' 
          });
        });
      };

      // 연결 종료 이벤트 핸들러
      this.stompClient.onWebSocketClose = (event) => {
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

        // 자동 재연결 시도
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

      // 연결 시작
      this.stompClient.activate();
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnected = false;
      
      // 연결 상태 알림
      this.notifyConnectionStatus(false);
      
      // 에러 발생 시 재연결 시도
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    }

    return this;
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
  subscribeToRoom(roomId) {
    if (!this.stompClient || !this.isConnected) {
      console.warn('WebSocket is not connected. Adding room to subscription queue.');
      this.subscribedRooms.add(roomId);
      return false;
    }

    try {
      console.log(`Attempting to subscribe to room ${roomId}`);
      
      // 이미 구독 중인 경우 처리
      if (this.subscriptions[roomId]) {
        console.log(`Already subscribed to room ${roomId}`);
        return true;
      }
      
      // 채팅방 메시지 구독
      const subscription = this.stompClient.subscribe(`/sub/chat/room/${roomId}`, (message) => {
        try {
          console.log('Received message:', message);
          const receivedMessage = JSON.parse(message.body);
          
          // 메시지 수신 시 모든 콜백 실행
          this.messageCallbacks.forEach(callback => {
            callback(receivedMessage);
          });
        } catch (error) {
          console.error('Error parsing websocket message:', error);
        }
      }, { id: `sub-${roomId}` });

      // 구독 정보 저장
      this.subscriptions[roomId] = subscription;
      this.subscribedRooms.add(roomId);
      console.log(`Subscribed to room ${roomId}`);

      return true;
    } catch (error) {
      console.error(`Error subscribing to room ${roomId}:`, error);
      return false;
    }
  }

  // 특정 채팅방 구독 해지
  unsubscribeFromRoom(roomId) {
    if (!this.isConnected || !this.subscriptions[roomId]) {
      this.subscribedRooms.delete(roomId);
      return false;
    }

    try {
      // 구독 해지
      this.subscriptions[roomId].unsubscribe();
      delete this.subscriptions[roomId];
      this.subscribedRooms.delete(roomId);
      console.log(`Unsubscribed from room ${roomId}`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from room ${roomId}:`, error);
      return false;
    }
  }

  // 메시지 수신 이벤트 리스너 등록
  onMessage(callback) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  // 메시지 전송 메서드
  sendMessage(roomId, message, userId, nickname) {
    if (!this.stompClient || !this.isConnected) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      const chatMessage = {
        type: 'CHAT',
        roomId: roomId,
        userId: userId,
        from: nickname,  // 백엔드가 기대하는 필드명
        message: message,
        sendAt: new Date().toISOString()
      };

      console.log('Sending message:', chatMessage);
      
      this.stompClient.publish({
        destination: `/app/chat/message/${roomId}`,
        body: JSON.stringify(chatMessage)
      });

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  // 웹소켓 연결 종료 메서드
  disconnect() {
    if (this.stompClient && this.isConnected) {
      try {
        // 모든 구독 해지
        Object.keys(this.subscriptions).forEach(roomId => {
          this.unsubscribeFromRoom(roomId);
        });
        
        this.stompClient.deactivate();
        this.isConnected = false;
        
        // 연결 상태 알림
        this.notifyConnectionStatus(false);
        
        this.subscribedRooms.clear();
        this.messageCallbacks.clear();
        this.subscriptions = {};
        console.log('WebSocket disconnected');
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error);
      }
    }
  }
}

// 싱글톤 인스턴스 생성
const webSocketService = new WebSocketService();
export default webSocketService;