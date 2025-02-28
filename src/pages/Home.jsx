import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BACKEND_URL, API_FRONT_URL } from "../config";
import { Leaf, Sun, Wind, Snowflake } from 'lucide-react';
import './CommitStats.css'; // CSS 파일 임포트

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#fef2f2', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ color: '#ef4444', fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#b91c1c', marginBottom: '8px' }}>데이터 로딩 오류</h2>
          <p style={{ color: '#374151', marginBottom: '16px' }}>{error}</p>
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
      case 'spring': return <Leaf className="season-icon" style={{ color: '#10b981' }} />;
      case 'summer': return <Sun className="season-icon" style={{ color: '#f59e0b' }} />;
      case 'fall': return <Wind className="season-icon" style={{ color: '#f97316' }} />;
      case 'winter': return <Snowflake className="season-icon" style={{ color: '#3b82f6' }} />;
      default: return null;
    }
  };

  // Get season header background color
  const getSeasonHeaderColor = (season) => {
    switch (season) {
      case 'spring': return '#ecfdf5';
      case 'summer': return '#fffbeb';
      case 'fall': return '#fff7ed';
      case 'winter': return '#eff6ff';
      default: return '#f9fafb';
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '0px', backgroundColor: 'white' }}>
      <div style={{ padding: '16px', backgroundColor: '#111827', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold' }}>CommitField</span>
          <button
            onClick={handleLogout}
            style={{ backgroundColor: 'black', borderRadius: '6px', padding: '8px 16px', border: 'none' }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* CommitInfo content integrated here */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>내 커밋 기록</h2>

        {/* 커밋 통계 - CSS 클래스 사용 */}
        <div className="stats-container">
          <div className="stats-row">
            {/* 총 커밋 수 */}
            <div className="stat-column">
              <div className="stat-value">
                {totalContributions.toLocaleString()}
              </div>
              <div className="stat-label">Total Contributions</div>
              <div className="stat-sublabel">전체 기간</div>
            </div>
            
            {/* 구분선 */}
            <div className="divider"></div>
            
            {/* 현재 연속 */}
            <div className="stat-column">
              <div className="stat-value current-streak">
                {totalCommitData?.currentStreakDays}
              </div>
              <div className="stat-label current-streak-label">Current Streak</div>
              <div className="stat-sublabel">최근 {totalCommitData?.currentStreakDays}일 연속</div>
            </div>
            
            {/* 구분선 */}
            <div className="divider"></div>
            
            {/* 최장 연속 */}
            <div className="stat-column">
              <div className="stat-value">
                {totalCommitData?.maxStreakDays}
              </div>
              <div className="stat-label">Longest Streak</div>
              <div className="stat-sublabel">역대 최장 기록</div>
            </div>
          </div>

          <div className="footer">
            <div className="footer-text">
              <span className="footer-icon">⏱️</span>
              매일 자정(KST) 기준으로 업데이트됩니다
            </div>
          </div>
        </div>

        {/* Season Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', textAlign: 'left', fontWeight: '500', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>시즌</th>
                <th style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', textAlign: 'center', fontWeight: '500', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>총 커밋</th>
                <th style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', textAlign: 'center', fontWeight: '500', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>공개 커밋</th>
                <th style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', textAlign: 'center', fontWeight: '500', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>비공개 커밋</th>
                <th style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', textAlign: 'center', fontWeight: '500', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>현재 연속</th>
                <th style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', textAlign: 'center', fontWeight: '500', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>최장 연속</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(seasonData).map(([season, data], index) => {
                if (!data) return null;

                const totalSeasonContributions = data.totalCommitContributions + data.restrictedContributionsCount;
                const headerBgColor = getSeasonHeaderColor(season);

                return (
                  <tr key={season} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', backgroundColor: headerBgColor, fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {getSeasonIcon(season)}
                        <span style={{ marginLeft: '8px' }}>{getSeasonName(season)} 시즌</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>
                      {totalSeasonContributions}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      {data.totalCommitContributions}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      {data.restrictedContributionsCount}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '4px 12px', 
                        backgroundColor: '#dcfce7', 
                        color: '#166534', 
                        borderRadius: '9999px' 
                      }}>
                        {data.currentStreakDays}일
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '4px 12px', 
                        backgroundColor: '#f3e8ff', 
                        color: '#6b21a8', 
                        borderRadius: '9999px' 
                      }}>
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