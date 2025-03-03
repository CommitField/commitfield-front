import React, { useState, useEffect } from 'react';
import { Leaf, Sun, Wind, Snowflake } from 'lucide-react';
import './CommitStats.css';

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
      <div className="loading-container">
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container">
        <div className="error-container">
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

  return (
    <div className="page-container">
      <div className="header">
        <div className="header-content">
          <span style={{ fontSize: '24px', fontWeight: 'bold' }}>CommitField</span>
          <button
            onClick={handleLogout}
            style={{ backgroundColor: 'black', borderRadius: '6px', padding: '8px 16px', border: 'none' }}
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="content-container">
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', paddingLeft: '16px' }}>내 커밋 기록</h2>

        {/* 커밋 통계 - 테이블과 너비 동일하게 */}
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
        <div className="table-container">
          <table className="season-table">
            <thead>
              <tr>
                <th className="table-header">시즌</th>
                <th className="table-header table-header-center">총 커밋</th>
                <th className="table-header table-header-center">공개 커밋</th>
                <th className="table-header table-header-center">비공개 커밋</th>
                <th className="table-header table-header-center">현재 연속</th>
                <th className="table-header table-header-center">최장 연속</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(seasonData).map(([season, data], index) => {
                if (!data) return null;

                const totalSeasonContributions = data.totalCommitContributions + data.restrictedContributionsCount;
                let rowClass = '';
                
                switch(season) {
                  case 'spring': rowClass = 'row-spring'; break;
                  case 'summer': rowClass = 'row-summer'; break;
                  case 'fall': rowClass = 'row-fall'; break;
                  case 'winter': rowClass = 'row-winter'; break;
                  default: rowClass = '';
                }

                return (
                  <tr key={season} className={rowClass}>
                    <td className="table-cell">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {getSeasonIcon(season)}
                        <span style={{ marginLeft: '8px', color: '#333' }}>{getSeasonName(season)} 시즌</span>
                      </div>
                    </td>
                    <td className="table-cell table-cell-center" style={{ fontWeight: 'bold', color: '#333' }}>
                      {totalSeasonContributions}
                    </td>
                    <td className="table-cell table-cell-center" style={{ color: '#333' }}>
                      {data.totalCommitContributions}
                    </td>
                    <td className="table-cell table-cell-center" style={{ color: '#333' }}>
                      {data.restrictedContributionsCount}
                    </td>
                    <td className="table-cell table-cell-center">
                      <span className={`streak-badge ${data.currentStreakDays > 0 ? 'current-streak-badge' : 'zero-value'}`}>
                        {data.currentStreakDays}일
                      </span>
                    </td>
                    <td className="table-cell table-cell-center">
                      <span className={`streak-badge ${data.maxStreakDays > 0 ? 'max-streak-badge' : 'zero-value'}`}>
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