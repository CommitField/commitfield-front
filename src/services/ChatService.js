import axios from 'axios';
import { API_BACKEND_URL } from '../config';

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BACKEND_URL || 'http://localhost:8090',
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
  clearCache: function () {
    this.rooms.all = null;
    this.rooms.created = null;
    this.rooms.joined = null;
    this.rooms.timestamp = 0;
  },
  // 참여 목록 캐시만 초기화하는 메서드 추가
  clearJoinedRoomsCache: function () {
    this.rooms.joined = null;
  },
  isCacheValid: function () {
    return Date.now() - this.rooms.timestamp < 60000;
  }
};

// 응답 인터셉터 - 공통 에러 처리
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);

    if (error.response && error.response.status === 401) {
      console.error('Authentication error, redirecting to login page');
      window.location.href = '/';
      return Promise.reject(error);
    }

    if (error.response?.data?.errorCode === 'CHAT_NOT_FOUND') {
      return {
        success: true,
        message: "채팅 메시지가 없습니다.",
        data: []
      };
    }

    if (error.response && error.response.status === 400) {
      console.error('400 Bad Request:', error.response.data);

      const errorMessage = error.response.data.message || '요청 처리 중 오류가 발생했습니다.';

      return Promise.reject({
        message: errorMessage,
        status: 400,
        error: error.response.data
      });
    }

    return Promise.reject({
      message: error.response?.data?.message || '서버 통신 오류가 발생했습니다',
      status: error.response?.status || 500,
      error
    });
  }
);

const ChatService = {
  clearCache: () => {
    cache.clearCache();
  },

  getRoomList: async (page = 0, size = 10, forceRefresh = false) => {
    try {
      if (cache.rooms.all && cache.isCacheValid() && !forceRefresh) {
        console.log('Using cached room list');
        return cache.rooms.all;
      }

      console.log('Fetching fresh room list');
      const response = await apiClient.get(`/chat/room?page=${page}&size=${size}`);
      console.log('전체 채팅방 목록 응답:', response);

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

  getMyCreatedRooms: async (page = 0, size = 10, forceRefresh = false) => {
    try {
      if (cache.rooms.created && cache.isCacheValid() && !forceRefresh) {
        console.log('Using cached created rooms');
        return cache.rooms.created;
      }

      console.log('Fetching fresh created rooms');
      const response = await apiClient.get(`/chat/room/creator?page=${page}&size=${size}`);

      if (response.success) {
        cache.rooms.created = response;
        cache.rooms.timestamp = Date.now();
      }

      return response;
    } catch (error) {
      console.error('Error fetching created rooms:', error);
      return {
        success: true,
        message: "생성한 채팅방을 가져오는 중 오류가 발생했습니다.",
        data: []
      };
    }
  },

  getMyJoinedRooms: async (page = 0, size = 10, forceRefresh = false) => {
    try {
      if (cache.rooms.joined && cache.isCacheValid() && !forceRefresh) {
        console.log('Using cached joined rooms');
        return cache.rooms.joined;
      }

      console.log('Fetching fresh joined rooms');
      const response = await apiClient.get(`/chat/room/part?page=${page}&size=${size}`);

      if (response.success) {
        cache.rooms.joined = response;
        cache.rooms.timestamp = Date.now();
      }

      return response;
    } catch (error) {
      console.error('Error fetching joined rooms:', error);
      return {
        success: true,
        message: "참여한 채팅방을 가져오는 중 오류가 발생했습니다.",
        data: []
      };
    }
  },

  createRoom: async (title, userCountMax, file = null) => {
    try {
      if (!title || !userCountMax) {
        throw new Error('제목과 최대 인원 수는 필수 입력값입니다.');
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('userCountMax', parseInt(userCountMax));

      // 파일 업로드 디버깅
      if (file) {
        console.log('Uploading file:', file);
        formData.append('file', file);
      }

      // FormData 내용 확인
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      console.log('Creating room with:', { title, userCountMax, file });
      const response = await apiClient.post('/chat/room', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Create room response:', response);

      if (response && !response.errorCode) {
        cache.clearCache();
      }

      return response;
    } catch (error) {
      console.error('Error creating room:', error.response || error);
      throw error;
    }
  },

  joinRoom: async (roomId, password = null) => {
    try {
      if (!roomId) {
        throw new Error('채팅방 ID는 필수입니다.');
      }

      // 비밀번호가 있는 경우와 없는 경우 분리
      const requestBody = password ? { password } : {};

      const response = await apiClient.post(`/chat/room/join/${roomId}`, requestBody);
      console.log('방 참여 응답:', response);

      if (response && !response.errorCode) {
        // 참여한 방 목록 캐시만 초기화
        cache.clearJoinedRoomsCache();
      }

      return response;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  },

  // 채팅방 나가기 - 참여 목록 캐시만 초기화
  leaveRoom: async (roomId) => {
    try {
      if (!roomId) {
        throw new Error('채팅방 ID는 필수입니다.');
      }

      const response = await apiClient.delete(`/chat/room/out/${roomId}`);
      ChatService.clearRoomCache(roomId);
      console.log('채팅방 나가기 응답:', response);

      return response;
    } catch (error) {
      ChatService.clearRoomCache(roomId);
      console.error('Error leaving room:', error);
      throw error;
    }
  },

  deleteRoom: async (roomId) => {
    try {
      if (!roomId) {
        throw new Error('채팅방 ID는 필수입니다.');
      }

      const response = await apiClient.delete(`/chat/room/delete/${roomId}`);
      console.log('채팅방 삭제 응답:', response);

      ChatService.clearRoomCache(roomId);

      return response;
    } catch (error) {
      ChatService.clearRoomCache(roomId);
      console.error('Error deleting room:', error);
      throw error;
    }
  },

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
      console.error('Error fetching messages:', error);

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

  sendMessage: async (roomId, message) => {
    try {
      if (!roomId || !message?.trim()) {
        throw new Error('채팅방 ID와 메시지 내용은 필수입니다.');
      }

      // 사용자 정보 가져오기
      const userResponse = await apiClient.get('/api/user/chatinfo');
      console.log('User info:', userResponse);

      if (!userResponse || !userResponse.username) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }

      // HTTP API를 통해 메시지 저장
      const response = await apiClient.post(`/chat/msg/${roomId}`, {
        message: message.trim()
      });

      if (!response.success) {
        throw new Error('메시지 저장 실패');
      }

      return {
        ...response,
        userData: {
          id: userResponse.username,
          nickname: userResponse.nickname || userResponse.username
        }
      };
    } catch (error) {
      console.error('Message send error:', error);
      throw error;
    }
  },

  // 채팅방 입장 (비밀번호 포함)
  joinRoomWithPassword: async (roomId, password) => {
    try {
      // ChatRoomRequest 형식에 맞게 요청 바디 작성
      const requestBody = {
        title: '',             // 필수 필드지만 입장 시에는 불필요
        userCountMax: 0,       // 필수 필드지만 입장 시에는 불필요
        password: password     // 비밀번호 전송
      };

      // POST 요청으로 채팅방 입장 시도
      const response = await fetch(`/chat/room/join/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // 응답 처리
      const responseData = await response.json();

      // 응답이 성공이 아닌 경우 (비밀번호 오류 등)
      if (!response.ok) {
        let errorMessage = '채팅방 입장에 실패했습니다.';

        // 서버에서 반환한 오류 코드에 따라 메시지 설정
        if (responseData && responseData.errorCode) {
          switch (responseData.errorCode) {
            case 'ROOM_PASSWORD_MISMATCH':
              errorMessage = '비밀번호가 일치하지 않습니다.';
              break;
            case 'NEED_TO_PASSWORD':
              errorMessage = '비밀번호가 필요한 채팅방입니다.';
              break;
            case 'ROOM_USER_FULL':
              errorMessage = '채팅방이 가득 찼습니다.';
              break;
            case 'ALREADY_JOIN_ROOM':
              errorMessage = '이미 참여 중인 채팅방입니다.';
              break;
            default:
              errorMessage = responseData.message || errorMessage;
          }
        }

        throw new Error(errorMessage);
      }

      // 성공적으로 입장한 경우, 채팅방 목록 새로고침을 위한 플래그 설정
      localStorage.setItem('refreshJoinedOnly', 'true');
      localStorage.setItem('chatRoomChanged', Date.now().toString());

      return responseData;
    } catch (error) {
      console.error('Error joining room with password:', error);
      throw error;
    }
  },

  // 기존 ChatRoomList.jsx에서 사용하는 방식을 활용한 방 정보 조회
  getRoomInfo: async (roomId) => {
    try {
      // 현재 채팅방 목록에서 해당 방 찾기 (추가 API 호출 없이)
      const roomListResponse = await ChatService.getRoomList();

      if (!roomListResponse.success && !roomListResponse.data) {
        throw new Error('채팅방 목록을 불러오는데 실패했습니다.');
      }

      const rooms = roomListResponse.data || [];
      const room = rooms.find(r => r.id === parseInt(roomId));

      if (!room) {
        throw new Error('채팅방을 찾을 수 없습니다.');
      }

      return {
        id: room.id,
        title: room.title,
        isPrivate: room.isPrivate || false,  // 이 필드는 API 응답에 포함되어야 함
        currentUserCount: room.currentUserCount,
        userCountMax: room.userCountMax
      };
    } catch (error) {
      console.error('Error getting room info:', error);
      throw error;
    }
  },

  clearRoomCache: (roomId) => {
    // 채팅방 메시지 캐시 삭제
    localStorage.removeItem(`chat_messages_${roomId}`);

    // 캐시 객체에서 해당 방 정보 제거
    if (cache.rooms.all) {
      cache.rooms.all.data = cache.rooms.all.data.filter(room => room.id !== roomId);
    }
    if (cache.rooms.created) {
      cache.rooms.created.data = cache.rooms.created.data.filter(room => room.id !== roomId);
    }
    if (cache.rooms.joined) {
      cache.rooms.joined.data = cache.rooms.joined.data.filter(room => room.id !== roomId);
    }

    // 캐시 변경 이벤트 발생
    localStorage.setItem('chatRoomChanged', Date.now().toString());
  },

  async getRoomUsers(roomId) {
    try {
      const response = await fetch(`http://localhost:8090/chat/room/users/${roomId}`, {
        credentials: 'include',  // 쿠키를 포함하여 요청
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return await response.json();
    } catch (error) {
        console.error('Failed to fetch room users:', error);
        throw error;
    }
  }
};

export default ChatService;