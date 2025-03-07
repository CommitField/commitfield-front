import React, { useState, useEffect } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";

const Profile = ({ userInfo }) => {
  const [seasonCommitCount, setSeasonCommitCount] = useState(userInfo.seasonCommitCount);
  const [petExp, setPetExp] = useState(userInfo.petExp);
  const [maxExp] = useState(100); // 최대 경험치 (필요하면 변경 가능)

  // 경험치 바 계산
  const progress = (petExp / maxExp) * 100;

  useEffect(() => {
    // WebSocket 설정
    const socket = new SockJS("http://localhost:8090/ws");
    const client = Stomp.over(socket);

    client.connect({}, () => {
      console.log("WebSocket connected!");

      // 커밋 수 업데이트 메시지 수신
      client.subscribe(`/topic/commit/${userInfo.username}`, (message) => {
        const newCommitCount = JSON.parse(message.body);

        // 시즌 커밋 수 업데이트
        setSeasonCommitCount((prev) => prev + newCommitCount);

        // 펫 경험치 업데이트
        setPetExp((prev) => Math.min(prev + newCommitCount, maxExp)); // maxExp 넘지 않도록 제한
      });
    }, (error) => {
      console.error("WebSocket error:", error);
    });

    return () => {
      if (client) {
        client.disconnect(() => {
          console.log("WebSocket disconnected.");
        });
      }
    };
  }, [userInfo.username]);

  return (
    <div className="flex-box">
      <div className="profile-container">
        {/* 왼쪽: 펫 이미지 */}
        <div className="pet-box">
          <img
            src={`/pets/${userInfo.petGrow}_0_128.png`}
            alt="Pet"
            className="animated-pet"
          />
        </div>

        {/* 오른쪽: 사용자 정보 및 펫 정보 */}
        <div className="info-box">
          <div>
            <img src={userInfo.avatarUrl} alt="User Avatar" className="avatar" /> {userInfo.username}
          </div>
          <div>이번 시즌 커밋 수: {seasonCommitCount}</div>
          <div>티어: {userInfo.tier} / 마지막 커밋 날짜: {new Date(userInfo.lastCommitted).toLocaleDateString()}</div>

          {/* 펫 정보 */}
          <div>🐾 펫 정보</div>
          <div className="exp-bar">
            <div className="bar">
              <div style={{ width: '100%', height: '5px', backgroundColor: '#F3F3F3', borderRadius: '2px' }}>
                <div
                  style={{
                    width: `${progress}%`, // 경험치 비율 적용
                    height: '100%',
                    backgroundColor: '#FF69B4',
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>
            <div>{petExp} / {maxExp}</div>
          </div>
          <div>성장 단계: {userInfo.petGrow}</div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
