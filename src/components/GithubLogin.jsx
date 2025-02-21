import React, { useState, useEffect } from 'react';
import { Github } from 'lucide-react';

const GithubLogin = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    }
    setLoading(false);
  };

  const handleLogin = () => {
    // GitHub OAuth 엔드포인트로 리다이렉트
    window.location.href = 'http://localhost:8090/oauth2/authorization/github';
  };

  const handleLogout = async () => {
    try {
      await fetch('/logout', {
        method: 'GET',
        credentials: 'include'
      });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center">Loading...</div>;
  }

  return (
    <div className="p-4">
        <h1>Commit Field</h1>
      {!user ? (
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Github size={20} />
          GitHub로 로그인하기
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar_url}
              alt="Profile"
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h2 className="text-lg font-semibold">{user.name}</h2>
              <p className="text-gray-600">{user.login}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
};

export default GithubLogin;