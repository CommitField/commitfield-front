import { useState, useEffect } from "react";

const Home = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetch("/login")
            .then((response) => {
                if (!response.ok) throw new Error("Not logged in");
                return response.json();
            })
            .then((data) => {
                if (data.login) {
                    setUser(data.login);  // 로그인된 경우 GitHub ID 저장
                } else {
                    setUser(null);  // 로그인되지 않은 경우 null 처리
                }
            })
            .catch(() => {
                setUser(null);  // 에러 발생 시 null 처리
            });
    }, []);

    const handleLogout = async () => {
        await fetch("/logout", { method: "POST" });
        setUser(null);
    };

    return (
        <div style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            textAlign: "center"
        }}>
            <h1>GitHub OAuth2 로그인 테스트</h1>
            {user ? (
                <>
                    <h2>{user}님 환영합니다!</h2>
                    <button onClick={handleLogout}>로그아웃</button>
                </>
            ) : (
                <button onClick={() => window.location.href = "http://localhost:8090/oauth2/authorization/github"}>
                    GitHub 로그인
                </button>
            )}
        </div>
    );
};

export default Home;
