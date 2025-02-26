import React, { useState, useEffect } from "react";

const TestAPI = () => {
  const [commits, setCommits] = useState(null);
  const username = "whale22";

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetch(`http://localhost:8090/api/commit-count/${username}`, { signal })
      .then((response) => response.json())
      .then((data) => {
          console.log(data);
          setCommits(data);
          })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Error:", error);
        }
      });

    return () => controller.abort();  // 👈 컴포넌트 언마운트 시 요청 취소!
  }, []);

  return (
    <div>
      <h2>테스트 API</h2>
      {commits ? <p>커밋 수: {commits}</p> : <p>로딩 중...</p>}
    </div>
  );
};

export default TestAPI;
