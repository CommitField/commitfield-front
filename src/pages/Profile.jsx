import React, { useState, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { useNavigate } from "react-router-dom";

const Profile = ({ userInfo }) => {
  const [seasonCommitCount, setSeasonCommitCount] = useState(userInfo.seasonCommitCount || 0);
  const [petExp, setPetExp] = useState(userInfo.petExp || 0);
  const [commitCount, setCommitCount] = useState(0);
  const [client, setClient] = useState(null); // WebSocket 클라이언트 상태
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef(null);

  //FIXME: 테스트를 위해 수치 줄임. 차후 150/300으로 변경 필요.
  const maxExp = userInfo.petGrow === "EGG" ? 5 : userInfo.petGrow === "HATCH" ? 10 : 10;

  // 티어 아이콘 매핑
  const tierEmojis = {
    NONE: "❌미획득",
    SEED: "🫘씨앗",
    SPROUT: "🌱새싹",
    FLOWER: "🌺꽃",
    FRUIT: "🍎열매",
    TREE: "🌳나무",
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
  const navigate = useNavigate(); // 페이지 이동 함수

  // 새 펫 받기 버튼 클릭 핸들러
const handleGetNewPet = async () => {
  try {
    const response = await fetch("/api/pets/new", {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("새 펫을 받을 수 없습니다.");
    }

    alert("새 펫을 성공적으로 받았습니다! 🎉");
    window.location.reload(); // 페이지 새로고침
  } catch (error) {
    console.error("에러 발생:", error);
    alert("펫을 받는 데 실패했습니다. 다시 시도해주세요.");
  }
};
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

  const [levelUpNotified, setLevelUpNotified] = useState(
    JSON.parse(localStorage.getItem("levelUpNotified")) || {}
  );

  useEffect(() => {
    if ((petExp === 5 || petExp === 10) && !levelUpNotified[petExp]) {
      alert("🎉 축하합니다! 펫이 레벨업하였습니다! 🎉");

      const updatedNotified = { ...levelUpNotified, [petExp]: true };
      setLevelUpNotified(updatedNotified);
      localStorage.setItem("levelUpNotified", JSON.stringify(updatedNotified)); // 현재 petExp 기록

      window.location.reload(); // 페이지 새로고침
    }
  }, [petExp, levelUpNotified]);



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
    refreshProfileData();
  }, [userInfo.tier, userInfo.petGrow]); // tier 또는 petGrow 값이 변경될 때 실행

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
          <span className="username">{userInfo.nickname || userInfo.username}({userInfo.username || "사용자"})</span>
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
                {tierEmojis[userInfo.tier] || ""}
              </span>
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-icon">📅</span>
            <span className="detail-text">
              마지막 업데이트: <span className="detail-value">{formatDate(userInfo.lastCommitted)}</span>
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
      {/* 🆕 추가된 버튼 섹션 */}
      <div className="button-section">
        <button
          className="get-new-pet-btn"
          onClick={handleGetNewPet}
          disabled={userInfo.petGrow !== "GROWN"}  // GROWN이 아닐 때 비활성화
        >
          🐣 새 펫 받기
        </button>
        <button className="view-pets-btn" onClick={() => navigate("/pets")}>
          🏡 펫 보러가기
        </button>
      </div>
    </div>
  );
};

export default Profile;
