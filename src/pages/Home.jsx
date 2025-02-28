import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BACKEND_URL, API_FRONT_URL } from "../config";

const Home = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    
    const handleLogout = async () => {
      try {
        const response = await fetch(`${API_BACKEND_URL}/api/logout`, {
          method: 'POST',
          credentials: 'include',  // 세션 쿠키 포함
        });

        if (response.ok) {
          setUser(null);  // 유저 정보 초기화
          window.location.href = '/';  // 홈 페이지로 리다이렉트
        } else {
          console.error('로그아웃 실패:', response.status);
        }
      } catch (error) {
        console.error('로그아웃 중 오류 발생:', error);
      }
    };

    const goToCommitInfo = () => {
      navigate('/commit-info');
    };

  return (
    <div className="w-full max-w-2xl p-4 mx-auto">
      {/* Header with logout */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-medium">CommitField</h1>
        <div className="flex gap-2">
          <button 
            onClick={goToCommitInfo} 
            className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 transition-colors"
          >
            커밋 정보 보기
          </button>
          <button 
            onClick={handleLogout} 
            className="bg-emerald-500 text-white px-4 py-1 rounded-md hover:bg-emerald-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Profile section */}
      <div className="flex gap-6 mb-8">
        {/* Avatar */}
        <div className="w-32 h-32 bg-green-100 rounded-lg overflow-hidden">
          <div className="w-full h-full grid place-items-center">
            <div className="w-16 h-16 bg-yellow-200 rounded-lg"></div>
          </div>
        </div>

        {/* Profile info */}
        <div className="flex-1">
          <div className="flex items">
            <span className="text-lg font-medium">nickname</span>
            <span className="text-green-500 ml-2">▲</span>
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <h3 className="font-medium mb-1">배지</h3>
              <div className="flex gap-2">
                <span className="text-yellow-500">★ 2025 겨울 14일</span>
                <span className="text-yellow-500">★ 2025 여름 14일</span>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-1">펫</h3>
              <div className="flex gap-2">
                {[1, 2].map((pet) => (
                  <div key={pet} className="w-8 h-8 bg-blue-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div>
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-lg font-medium mb-4">오늘의 커밋</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">2,048</div>
              <div className="text-sm text-gray-600">총 기여</div>
              <div className="text-xs text-gray-400">2016년 8월 10일 - 현재</div>
            </div>

            <div>
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-orange-400 grid place-items-center">
                <div className="text-2xl font-bold">16</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">현재 연속 커밋</div>
              <div className="text-xs text-gray-400">2월 5일 - 2월 20일</div>
            </div>

            <div>
              <div className="text-2xl font-bold">86</div>
              <div className="text-sm text-gray-600">최장 연속 커밋</div>
              <div className="text-xs text-gray-400">2021년 12월 19일 - 2022년 3월 14일</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;