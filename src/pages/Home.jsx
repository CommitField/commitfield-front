import React, { useState, useEffect } from 'react';


const Home = () => {
    const [user, setUser] = useState(null); // setUser 정의
    const handleLogout = async () => {
      try {
        const response = await fetch('http://localhost:8090/api/logout', {
          method: 'POST',
          credentials: 'include',  // 세션 쿠키 포함
        });

        if (response.ok) {
          setUser(null);  // 유저 정보 초기화
          window.location.href = '/';  // 홈 페이지로 리다이렉트
        } else {
          console.error('Logout failed:', response.status);
        }
      } catch (error) {
        console.error('Error during logout:', error);
      }
    };


  return (
    <div className="w-full max-w-2xl p-4">
      {/* Header with logout */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-medium">CommitField</h1>
        <button onClick={handleLogout} className="bg-emerald-500 text-white px-4 py-1 rounded-md">
          Logout
        </button>
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
              <h3 className="font-medium mb-1">Badges</h3>
              <div className="flex gap-2">
                <span className="text-yellow-500">★ 2025 눈 14일</span>
                <span className="text-yellow-500">★ 2025 여름 14일</span>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-1">Pets</h3>
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
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4">Today's commit</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">2,048</div>
              <div className="text-sm text-gray-600">Total Contributions</div>
              <div className="text-xs text-gray-400">Aug 10, 2016 - Present</div>
            </div>

            <div>
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-orange-400 grid place-items-center">
                <div className="text-2xl font-bold">16</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">Current Streak</div>
              <div className="text-xs text-gray-400">Feb 5 - Feb 20</div>
            </div>

            <div>
              <div className="text-2xl font-bold">86</div>
              <div className="text-sm text-gray-600">Longest Streak</div>
              <div className="text-xs text-gray-400">Dec 19, 2021 - Mar 14, 2022</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
