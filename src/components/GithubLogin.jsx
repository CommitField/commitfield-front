import React, { useState, useEffect } from 'react';
import { Github } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BACKEND_URL, API_FRONT_URL } from "../config";

const GithubLogin = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const response = await fetch('/login', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        window.location.href = "/home"; // 로그인 성공시 홈 페이지로 이동
      }
    } catch (error) {
      console.error('로그인 상태 확인 중 오류:', error);
    }
    setLoading(false);
  };

  const handleLogin = () => {
    // GitHub OAuth 엔드포인트로 리다이렉트
    window.location.href = `${API_BACKEND_URL}/oauth2/authorization/github`;
  };

  const goToCommitInfo = () => {
    navigate('/commit-info');
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setUser(null);
        window.location.href = '/';
      } else {
        console.error('로그아웃 실패:', response.status);
      }
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center">로딩 중...</div>;
  }

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-8">커밋 필드</h1>
      {!user ? (
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Github size={20} />
          GitHub로 로그인하기
        </button>
      ) : (
        <div className="space-y-8 flex flex-col items-center">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar_url}
              alt="프로필"
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-gray-600">{user.login}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full">
            <button
              onClick={goToCommitInfo}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors w-full"
            >
              내 커밋 정보 보기
            </button>
            
            <button
              onClick={() => navigate('/home')}
              className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors w-full"
            >
              홈으로 이동
            </button>
            
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors w-full"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GithubLogin;