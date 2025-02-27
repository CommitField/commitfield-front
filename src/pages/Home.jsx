import React, { useState, useEffect } from 'react';
import { CalendarDays, GitBranch, Award, Leaf, Sun, Wind, Snowflake } from 'lucide-react';

const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCommitData, setTotalCommitData] = useState(null);
  const [seasonData, setSeasonData] = useState({
    spring: null,
    summer: null,
    fall: null,
    winter: null
  });

  useEffect(() => {
    const fetchCommitData = async () => {
      try {
        // Fetch total commit data
        const totalResponse = await fetch('/api/commits', {
          credentials: 'include'
        });

        if (!totalResponse.ok) {
          throw new Error('전체 커밋 데이터를 가져오는데 실패했습니다');
        }

        const totalData = await totalResponse.json();
        setTotalCommitData(totalData);

        // Fetch season-specific data
        const seasons = ['spring', 'summer', 'fall', 'winter'];
        const seasonResponses = await Promise.all(
          seasons.map(season =>
            fetch(`/api/commits/${season}`, {
              credentials: 'include'
            })
          )
        );

        const seasonDataResults = await Promise.all(
          seasonResponses.map(response => {
            if (!response.ok) {
              throw new Error(`시즌 데이터를 가져오는데 실패했습니다: ${response.status}`);
            }
            return response.json();
          })
        );

        setSeasonData({
          spring: seasonDataResults[0],
          summer: seasonDataResults[1],
          fall: seasonDataResults[2],
          winter: seasonDataResults[3]
        });

        setLoading(false);
      } catch (err) {
        console.error('커밋 데이터 가져오기 오류:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchCommitData();
  }, []);

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
        console.error('로그아웃 실패:', response.status);
      }
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-700">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 bg-red-50 rounded-lg shadow">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-700 mb-2">데이터 로딩 오류</h2>
          <p className="text-gray-700 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate total contributions (public + private)
  const totalContributions = totalCommitData ?
    totalCommitData.totalCommitContributions + totalCommitData.restrictedContributionsCount : 0;

  // Get season name in Korean
  const getSeasonName = (season) => {
    switch (season) {
      case 'spring': return '봄';
      case 'summer': return '여름';
      case 'fall': return '가을';
      case 'winter': return '겨울';
      default: return season;
    }
  };

  // Get season icon and color
  const getSeasonIcon = (season) => {
    switch (season) {
      case 'spring': return <Leaf className="w-5 h-5 text-green-500" />;
      case 'summer': return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'fall': return <Wind className="w-5 h-5 text-orange-500" />;
      case 'winter': return <Snowflake className="w-5 h-5 text-blue-500" />;
      default: return <GitBranch className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get season header background color
  const getSeasonHeaderColor = (season) => {
    switch (season) {
      case 'spring': return 'bg-green-100';
      case 'summer': return 'bg-yellow-100';
      case 'fall': return 'bg-orange-100';
      case 'winter': return 'bg-blue-100';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="w-full min-h-screen p-4 bg-white">
      <div className="p-4 bg-gray-900 text-white">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="text-2xl font-bold">CommitField</span>
          <button
            onClick={handleLogout}
            className="bg-black rounded-md px-4 py-2"
            style={{ border: 'none' }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* CommitInfo content integrated here */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6">내 커밋 기록</h2>

        {/* 커밋 통계 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 w-full">
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            {/* 총 커밋 수 - 왼쪽 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '33%' }}>
              <div className="text-4xl font-bold mb-1">{totalContributions.toLocaleString()}</div>
              <div className="text-gray-600 font-medium">Total Contributions</div>
              <div className="text-sm text-gray-400 mt-1">전체 기간</div>
            </div>

            {/* 현재 연속 - 가운데 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '33%' }}>
              <div className="text-4xl font-bold mb-1">{totalCommitData?.currentStreakDays}</div>
              <div className="text-gray-600 font-medium">Current Streak</div>
              <div className="text-sm text-gray-400 mt-1">최근 {totalCommitData?.currentStreakDays}일 연속</div>
            </div>

            {/* 최장 연속 - 오른쪽 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '33%' }}>
              <div className="text-4xl font-bold mb-1">{totalCommitData?.maxStreakDays}</div>
              <div className="text-gray-600 font-medium">Longest Streak</div>
              <div className="text-sm text-gray-400 mt-1">역대 최장 기록</div>
            </div>
          </div>

          <div className="text-xs text-gray-400 mt-6 text-center">* 매일 자정(KST) 기준으로 업데이트됩니다</div>
        </div>

        {/* Season Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="py-3 px-4 bg-gray-100 text-left font-medium text-gray-700 border-b">시즌</th>
                <th className="py-3 px-4 bg-gray-100 text-center font-medium text-gray-700 border-b">총 커밋</th>
                <th className="py-3 px-4 bg-gray-100 text-center font-medium text-gray-700 border-b">공개 커밋</th>
                <th className="py-3 px-4 bg-gray-100 text-center font-medium text-gray-700 border-b">비공개 커밋</th>
                <th className="py-3 px-4 bg-gray-100 text-center font-medium text-gray-700 border-b">현재 연속</th>
                <th className="py-3 px-4 bg-gray-100 text-center font-medium text-gray-700 border-b">최장 연속</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(seasonData).map(([season, data], index) => {
                if (!data) return null;

                const totalSeasonContributions = data.totalCommitContributions + data.restrictedContributionsCount;
                const headerColor = getSeasonHeaderColor(season);

                return (
                  <tr key={season} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={`py-4 px-4 border-b ${headerColor} font-medium`}>
                      <div className="flex items-center">
                        {getSeasonIcon(season)}
                        <span className="ml-2">{getSeasonName(season)} 시즌</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center border-b font-bold">
                      {totalSeasonContributions}
                    </td>
                    <td className="py-4 px-4 text-center border-b">
                      {data.totalCommitContributions}
                    </td>
                    <td className="py-4 px-4 text-center border-b">
                      {data.restrictedContributionsCount}
                    </td>
                    <td className="py-4 px-4 text-center border-b">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full">
                        {data.currentStreakDays}일
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center border-b">
                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                        {data.maxStreakDays}일
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Home;