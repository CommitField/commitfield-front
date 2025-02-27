import React, { useState, useEffect } from 'react';
import { Github } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const GithubLogin = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check system preference for dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    
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
    window.location.href = 'http://localhost:8090/oauth2/authorization/github';
  };

  const goToCommitInfo = () => {
    navigate('/commit-info');
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:8090/api/logout', {
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
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className={`login-container ${isDarkMode ? 'dark-theme' : ''}`}>
      {!user ? (
        <div className="login-card">
          <h1 className="login-title">Commit Field</h1>
          <button
            onClick={handleLogin}
            className="github-button"
          >
            <Github size={20} className="github-icon" />
            github login
          </button>
        </div>
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