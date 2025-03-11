import React, { useState, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";

const Profile = ({ userInfo }) => {
  const [seasonCommitCount, setSeasonCommitCount] = useState(userInfo.seasonCommitCount || 0);
  const [petExp, setPetExp] = useState(userInfo.petExp || 0);
  const [commitCount, setCommitCount] = useState(0);
  const [client, setClient] = useState(null); // WebSocket 클라이언트 상태
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef(null);

  const maxExp = userInfo.petGrow === "EGG" ? 150 : userInfo.petGrow === "HATCH" ? 300 : 300;

  // 티어 아이콘 매핑
  const tierEmojis = {
    SEED: "🫘",
    SPROUT: "🌱",
    FLOWER: "🌺",
    FRUIT: "🍎",
    TREE: "🌳",
  };

  // 펫 성장 단계 한글화
  const petGrowthStages = {
    EGG: "알",
    HATCH: "부화",
    BABY: "아기",
    GROWN: "성체",
  };

  // 경험치 바 계산
  const progress = (petExp / maxExp) * 100;

  // 프로필 정보 자동 새로고침 함수
  const refreshProfileData = async () => {
    setIsRefreshing(true);
    try {
      // 실제로는 여기서 API 호출을 통해 최신 데이터를 가져옵니다
      const response = await fetch("/api/user/info", {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // 새로운 데이터로 상태 업데이트
        setSeasonCommitCount(data.seasonCommitCount || 0);
        setPetExp(data.petExp || 0);
        // 마지막 갱신 시간 업데이트
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error("프로필 데이터 새로고침 오류:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 자동 새로고침 설정 (30초마다)
  useEffect(() => {
    refreshTimerRef.current = setInterval(refreshProfileData, 30000);

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // userInfo가 변경되면 값 업데이트
useEffect(() => {
  setSeasonCommitCount((prev) => prev || userInfo.seasonCommitCount);
  setPetExp((prev) => prev || userInfo.petExp);
}, [userInfo]);

  // 날짜 포맷팅 함수
  const formatDate = (dateString) => {
    if (!dateString) return "없음";
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 새로고침 시간 포맷팅 함수
  const formatRefreshTime = (date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  useEffect(() => {
    // userInfo.username이 없으면 WebSocket 연결 안 함
    if (!userInfo.username) {
      console.log("Username is not available yet, waiting...");
      return;
    }

    // 기존 WebSocket 연결이 있으면 끊기
    if (client) {
      client.disconnect(() => {
        console.log("Previous WebSocket disconnected.");
      });
    }

    // 새로운 WebSocket 연결
    const socket = new SockJS("http://localhost:8090/ws");
    const newClient = Stomp.over(socket);

    newClient.connect({}, () => {
      console.log("WebSocket connected!");

      // 커밋 수 업데이트 메시지 수신
      newClient.subscribe(`/topic/commit/${userInfo.username}`, (message) => {
        const newCommitCount = JSON.parse(message.body);
        setCommitCount(newCommitCount);

        // 시즌 커밋 수 업데이트
        setSeasonCommitCount((prev) => prev + newCommitCount);

        // 펫 경험치 업데이트
        setPetExp((prev) => Math.min(prev + newCommitCount, maxExp)); // maxExp 넘지 않도록 제한
      });
    }, (error) => {
      console.error("WebSocket error:", error);
    });

    // WebSocket 클라이언트 저장
    setClient(newClient);

    return () => {
      if (newClient) {
        newClient.disconnect(() => {
          console.log("WebSocket disconnected.");
        });
      }
    };
  }, [userInfo.username]); // username이 변경될 때마다 WebSocket 연결

  return (
    <div className="profile-container">
      {/* 왼쪽: 펫 이미지 */}
      <div className="pet-section">
        <div className="pet-frame">
          <img
            src={`/pets/${userInfo.petGrow}_${userInfo.petType}_128.png`}
            alt="Pet"
            className={`pet-image animated-pet ${isRefreshing ? 'refreshing' : ''}`}
          />
        </div>
        <div className="pet-stage">
          {petGrowthStages[userInfo.petGrow] || userInfo.petGrow}
        </div>
        {isRefreshing && <div className="refreshing-indicator"></div>}
      </div>

      {/* 오른쪽: 사용자 정보 및 펫 정보 */}
      <div className="user-info">
        {/* 유저 이름과 아바타 */}
        <div className="user-header">
          <div className="avatar-container">
            <img src={userInfo.avatarUrl} alt="User Avatar" />
          </div>
          z<span className="username">{userInfo.username || "사용자"}</span>
        </div>

        {/* 유저 세부 정보 */}
        <div className="user-details">
          <div className="detail-item">
            <span className="detail-icon">📊</span>
            <span className="detail-text">
              이번 시즌 커밋: <span className="detail-value">{seasonCommitCount}</span>
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-icon">🔄</span>
            <span className="detail-text">
              업데이트 커밋: <span className="detail-value">{commitCount}</span>
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-icon">🏆</span>
            <span className="detail-text">
              티어: <span className="tier-badge">
                {tierEmojis[userInfo.tier] || ""} {userInfo.tier || "없음"}
              </span>
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-icon">📅</span>
            <span className="detail-text">
              마지막 커밋: <span className="detail-value">{formatDate(userInfo.lastCommitted)}</span>
            </span>
          </div>
        </div>

        {/* 펫 정보 */}
        <div className="pet-info">
          <div className="pet-title">
            <span>🐾</span> 펫 정보
          </div>

          <div className="exp-bar-container">
            <div className="exp-bar">
              <div
                className="exp-progress"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="exp-text">
              {petExp} / {maxExp}
            </span>
          </div>

          {/* 새로고침 버튼 및 마지막 새로고침 시간 표시 */}
          <div className="refresh-info">
            <button
              className="refresh-button"
              onClick={refreshProfileData}
              disabled={isRefreshing}
            >
              <span className={`refresh-icon ${isRefreshing ? 'rotating' : ''}`}>🔄</span>
            </button>
            <span className="last-refresh-time">
              {isRefreshing ? '새로고침 중...' : `마지막 업데이트: ${formatRefreshTime(lastRefreshTime)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;