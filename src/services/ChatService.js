// src/services/ChatService.js
import axios from 'axios';
import { API_BACKEND_URL } from '../config';

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BACKEND_URL || 'http://localhost:8090', // 기본값 설정
  withCredentials: true, // 쿠키 기반 인증을 위해 필요 (OAuth2)
});

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
    
    // 개발 중에는 더 자세한 오류 정보 제공
    return Promise.reject({
      message: error.response?.data?.message || '서버 통신 오류가 발생했습니다',
      status: error.response?.status || 500,
      error
    });
  }
);

const ChatService = {
  // 채팅방 목록 조회
  getRoomList: async (page = 0, size = 10) => {
    try {
      const response = await apiClient.get(`/chat/room?page=${page}&size=${size}`);
      return response;
    } catch (error) {
      console.error('Error fetching room list:', error);
      throw error;
    }
  },

  // 내가 생성한 채팅방 목록 조회
  getMyCreatedRooms: async (page = 0, size = 10) => {
    try {
      const response = await apiClient.get(`/chat/room/creator?page=${page}&size=${size}`);
      return response;
    } catch (error) {
      console.error('Error fetching created rooms:', error);
      throw error;
    }
  },

  // 내가 참여한 채팅방 목록 조회
  getMyJoinedRooms: async (page = 0, size = 10) => {
    try {
      const response = await apiClient.get(`/chat/room/part?page=${page}&size=${size}`);
      return response;
    } catch (error) {
      console.error('Error fetching joined rooms:', error);
      throw error;
    }
  },

  // 채팅방 생성
  createRoom: async (title, userCountMax) => {
    try {
      console.log('Creating room with:', { title, userCountMax: parseInt(userCountMax) });
      const response = await apiClient.post('/chat/room', { 
        title, 
        userCountMax: parseInt(userCountMax)  // 반드시 정수로 변환
      });
      console.log('Create room response:', response);
      return response;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  },

  // 채팅방 입장
  joinRoom: async (roomId) => {
    try {
      const response = await apiClient.post(`/chat/room/join/${roomId}`);
      return response;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  },

  // 채팅방 나가기
  leaveRoom: async (roomId) => {
    try {
      const response = await apiClient.delete(`/chat/room/out/${roomId}`);
      return response;
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  },

  // 채팅방 삭제
  deleteRoom: async (roomId) => {
    try {
      const response = await apiClient.delete(`/chat/room/delete/${roomId}`);
      return response;
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  },

  // 채팅 메시지 조회
  getChatMessages: async (roomId, lastId = null) => {
    try {
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
      if (error.status === 500) {
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