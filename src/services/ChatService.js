// src/services/ChatService.js - 개선된 버전
import axios from 'axios';
import { API_BACKEND_URL } from '../config';

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BACKEND_URL || 'http://localhost:8090', // 기본값 설정
  withCredentials: true, // 쿠키 기반 인증을 위해 필요 (OAuth2)
});

// 캐시 설정
const cache = {
  rooms: {
    all: null,
    created: null,
    joined: null,
    timestamp: 0
  },
  clearCache: function() {
    this.rooms.all = null;
    this.rooms.created = null;
    this.rooms.joined = null;
    this.rooms.timestamp = 0;
  },
  isCacheValid: function() {
    // 캐시 유효 시간을 10초로 설정
    return Date.now() - this.rooms.timestamp < 10000;
  }
};

// 응답 인터셉터 - 공통 에러 처리
apiClient.interceptors.response.use(
  (response) => {
    // 백엔드 응답 처리
    return response.data; // 백엔드는 이미 데이터를 감싸고 있음
  },
  (error) => {
    console.error('API Error:', error);
    
    // OAuth2 인증 에러 처리
    if (error.response && error.response.status === 401) {
      console.error('Authentication error, redirecting to login page');
      // 토큰 만료 등의 이유로 인증이 필요한 경우 로그인 페이지로 리디렉션
      window.location.href = '/'; // 로그인 페이지 경로
      return Promise.reject(error);
    }
    
    // CHAT_NOT_FOUND 에러 처리
    if (error.response?.data?.errorCode === 'CHAT_NOT_FOUND') {
      // 메시지가 없는 경우는 정상적인 상황으로 처리하여 빈 배열 반환
      return {
        success: true,
        message: "채팅 메시지가 없습니다.",
        data: []
      };
    }
    
    // 400 에러 처리 - 더 명확한 오류 메시지 제공
    if (error.response && error.response.status === 400) {
      console.error('400 Bad Request:', error.response.data);
      
      // 백엔드에서 오는 상세 오류 메시지 활용
      const errorMessage = error.response.data.message || '요청 처리 중 오류가 발생했습니다.';
      
      return Promise.reject({
        message: errorMessage,
        status: 400,
        error: error.response.data
      });
    }
    
    // 개발 중에는 더 자세한 오류 정보 제공
    return Promise.reject({
      message: error.response?.data?.message || '서버 통신 오류가 발생했습니다',
      status: error.response?.status || 500,
      error
    });
  }
);

const ChatService = {
  // 캐시 초기화 메서드
  clearCache: () => {
    cache.clearCache();
  },
  
  // 채팅방 목록 조회 - 캐시 적용
  getRoomList: async (page = 0, size = 10, forceRefresh = false) => {
    try {
      // 캐시가 유효하고 강제 새로고침이 아닌 경우 캐시된 데이터 반환
      if (cache.rooms.all && cache.isCacheValid() && !forceRefresh) {
        console.log('Using cached room list');
        return cache.rooms.all;
      }
      
      console.log('Fetching fresh room list');
      const response = await apiClient.get(`/chat/room?page=${page}&size=${size}`);
      
      // 성공적인 응답인 경우 캐시 업데이트
      if (response.success) {
        cache.rooms.all = response;
        cache.rooms.timestamp = Date.now();
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching room list:', error);
      throw error;
    }
  },

  // 내가 생성한 채팅방 목록 조회 - 캐시 적용
  getMyCreatedRooms: async (page = 0, size = 10, forceRefresh = false) => {
    try {
      // 캐시가 유효하고 강제 새로고침이 아닌 경우 캐시된 데이터 반환
      if (cache.rooms.created && cache.isCacheValid() && !forceRefresh) {
        console.log('Using cached created rooms');
        return cache.rooms.created;
      }
      
      console.log('Fetching fresh created rooms');
      const response = await apiClient.get(`/chat/room/creator?page=${page}&size=${size}`);
      
      // 성공적인 응답인 경우 캐시 업데이트
      if (response.success) {
        cache.rooms.created = response;
        cache.rooms.timestamp = Date.now();
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching created rooms:', error);
      // 에러가 발생했을 때 빈 목록 반환 (선택적)
      return {
        success: true,
        message: "생성한 채팅방을 가져오는 중 오류가 발생했습니다.",
        data: []
      };
    }
  },

  // 내가 참여한 채팅방 목록 조회 - 캐시 적용
  getMyJoinedRooms: async (page = 0, size = 10, forceRefresh = false) => {
    try {
      // 캐시가 유효하고 강제 새로고침이 아닌 경우 캐시된 데이터 반환
      if (cache.rooms.joined && cache.isCacheValid() && !forceRefresh) {
        console.log('Using cached joined rooms');
        return cache.rooms.joined;
      }
      
      console.log('Fetching fresh joined rooms');
      const response = await apiClient.get(`/chat/room/part?page=${page}&size=${size}`);
      
      // 성공적인 응답인 경우 캐시 업데이트
      if (response.success) {
        cache.rooms.joined = response;
        cache.rooms.timestamp = Date.now();
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching joined rooms:', error);
      // 에러가 발생했을 때 빈 목록 반환 (선택적)
      return {
        success: true,
        message: "참여한 채팅방을 가져오는 중 오류가 발생했습니다.",
        data: []
      };
    }
  },

  // 채팅방 생성 - 캐시 초기화
  createRoom: async (title, userCountMax) => {
    try {
      if (!title || !userCountMax) {
        throw new Error('제목과 최대 인원 수는 필수 입력값입니다.');
      }
      
      console.log('Creating room with:', { title, userCountMax: parseInt(userCountMax) });
      const response = await apiClient.post('/chat/room', { 
        title, 
        userCountMax: parseInt(userCountMax)  // 반드시 정수로 변환
      });
      console.log('Create room response:', response);
      
      // 채팅방이 생성되면 모든 캐시 초기화
      if (response && !response.errorCode) {
        cache.clearCache();
      }
      
      return response;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  },

  // 채팅방 입장 - 참여 캐시 초기화
  joinRoom: async (roomId) => {
    try {
      if (!roomId) {
        throw new Error('채팅방 ID는 필수입니다.');
      }
      
      const response = await apiClient.post(`/chat/room/join/${roomId}`);
      
      // 채팅방 참여 성공 시 참여 목록 캐시 초기화
      if (response && !response.errorCode) {
        cache.rooms.joined = null;
      }
      
      return response;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  },

  // 채팅방 나가기 - 캐시 초기화
  leaveRoom: async (roomId) => {
    try {
      if (!roomId) {
        throw new Error('채팅방 ID는 필수입니다.');
      }
      
      const response = await apiClient.delete(`/chat/room/out/${roomId}`);
      
      // 채팅방 나가기 성공 시 모든 캐시 초기화
      if (response && !response.errorCode) {
        cache.clearCache();
      }
      
      return response;
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  },

  // 채팅방 삭제 - 캐시 초기화
  deleteRoom: async (roomId) => {
    try {
      if (!roomId) {
        throw new Error('채팅방 ID는 필수입니다.');
      }
      
      const response = await apiClient.delete(`/chat/room/delete/${roomId}`);
      
      // 채팅방 삭제 성공 시 모든 캐시 초기화
      if (response && !response.errorCode) {
        cache.clearCache();
      }
      
      return response;
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  },

  // 채팅 메시지 조회
  getChatMessages: async (roomId, lastId = null) => {
    try {
      if (!roomId) {
        throw new Error('채팅방 ID는 필수입니다.');
      }
      
      const url = lastId 
        ? `/chat/msg/${roomId}?lastId=${lastId}` 
        : `/chat/msg/${roomId}`;
      console.log('Fetching messages from:', url);
      const response = await apiClient.get(url);
      console.log('Chat messages response:', response);
      return response;
    } catch (error) {
      // CHAT_NOT_FOUND 에러는 이미 인터셉터에서 처리
      console.error('Error fetching messages:', error);
      
      // 다른 종류의 에러인 경우 빈 메시지 목록 반환
      if (error.status === 500 || error.status === 400) {
        console.log('Server error, returning empty messages');
        return {
          success: true,
          message: "메시지를 불러오는데 문제가 발생했습니다.",
          data: []
        };
      }
      
      throw error;
    }
  },

  // 채팅 메시지 전송
  sendMessage: async (roomId, message) => {
    try {
      if (!roomId || !message) {
        throw new Error('채팅방 ID와 메시지 내용은 필수입니다.');
      }
      
      if (message.trim() === '') {
        throw new Error('메시지 내용은 비어있을 수 없습니다.');
      }
      
      console.log('Sending message to room', roomId, ':', message);
      const response = await apiClient.post(`/chat/msg/${roomId}`, { message });
      console.log('Send message response:', response);
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
};

export default ChatService;