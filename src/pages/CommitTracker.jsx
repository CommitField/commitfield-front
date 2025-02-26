import React, { useState, useEffect } from "react";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";

const CommitTracker = () => {
  const [commits, setCommits] = useState(0);
  const [user, setUser] = useState("");

  useEffect(() => {
    // WebSocket 연결 설정
    const socket = new SockJS("http://localhost:8090/ws");
    const stompClient = Stomp.over(socket);

    stompClient.connect({}, () => {
      stompClient.subscribe("/topic/commits", (message) => {
        const commitData = JSON.parse(message.body);
        setUser(commitData.user);
        setCommits(commitData.commits);
      });
    });

    return () => {
      if (stompClient) {
        stompClient.disconnect();
      }
    };
  }, []);

  return (
    <div>
      <h2>실시간 커밋 트래커</h2>
      {user && <p>{user} 님의 커밋 횟수: {commits}</p>}
    </div>
  );
};

export default CommitTracker;
