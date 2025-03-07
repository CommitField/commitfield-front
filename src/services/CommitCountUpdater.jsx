import React, { useState, useEffect } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";

const CommitCountUpdater = ({ username }) => {
  const [commitCount, setCommitCount] = useState(0);

  useEffect(() => {
      if (!username) {
        console.log("Username is not available yet.");
        return;
      }

      // WebSocket 연결 설정
      const socket = new SockJS("http://localhost:8090/ws"); // 서버의 WebSocket 엔드포인트 URL
      const stompClient = Stomp.over(socket);

      // 연결 성공 시 실행되는 콜백 함수
      stompClient.connect({}, () => {
        console.log("WebSocket connected!");

        // WebSocket 연결 성공 후에 커밋 수 업데이트를 받을 채널을 구독
        stompClient.subscribe(`/topic/commit/${username}`, (message) => {
          const newCommitCount = JSON.parse(message.body);
          setCommitCount(newCommitCount);
        });
      }, (error) => {
        console.error("WebSocket connection error:", error);
      });

      // 컴포넌트 언마운트 시 WebSocket 연결 종료
      return () => {
        if (stompClient) {
          stompClient.disconnect(() => {
            console.log("WebSocket disconnected.");
          });
        }
      };
    }, [username]);

  return (
    <div>
      <div>업데이트 커밋 수: {commitCount}</div>
      {/* 추가로 커밋 수 관련 그래픽이나 정보를 여기서 출력할 수 있음 */}
    </div>
  );
};

export default CommitCountUpdater;