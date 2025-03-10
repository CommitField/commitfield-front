// Vite 환경변수 사용
const API_BACKEND_URL = import.meta.env.VITE_CORE_API_BASE_URL || 'http://localhost:8090';
const API_FRONT_URL = import.meta.env.VITE_CORE_FRONT_BASE_URL || 'http://localhost:5173';

export {
    API_BACKEND_URL,
    API_FRONT_URL
};