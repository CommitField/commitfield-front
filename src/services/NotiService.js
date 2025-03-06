import axios from 'axios';
import { API_BACKEND_URL } from '../config';

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BACKEND_URL, // 기본값 설정
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
    
    // 개발 중에는 더 자세한 오류 정보 제공
    return Promise.reject({
      message: error.response?.data?.message || '서버 통신 오류가 발생했습니다',
      status: error.response?.status || 500,
      error
    });
  }
);

const NotiService = {
  // 캐시 초기화 메서드
  clearCache: () => {
    cache.clearCache();
  },

  // 알림 조회
  getNotis: async () => {
    try {
      const url = `/api/notifications`;
      console.log('Fetching Notis from:', url);
      const response = await apiClient.get(url);
      console.log('Noti response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching Notis:', error);
      
      // 다른 종류의 에러인 경우 빈 메시지 목록 반환
      if (error.status === 500) {
        console.log('Server error, returning empty Notis');
        return {
          success: true,
          message: "알림을 불러오는데 문제가 발생했습니다.",
          data: []
        };
      }
      
      throw error;
    }
  },
};

export default NotiService;