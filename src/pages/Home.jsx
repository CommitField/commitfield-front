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
                setUser(data.login);  // GitHub ID만 저장
            })
            .catch(() => {
                setUser(null);
            });
    }, []);

    const handleLogout = async () => {
        await fetch("/logout", { method: "POST" });
        setUser(null);
    };

    return (
        <div>
            <h1>GitHub OAuth2 로그인 테스트</h1>
            {user ? (
                <>
                    <h2>{user}님 환영합니다!</h2>
                    <button onClick={handleLogout}>로그아웃</button>
                </>
            ) : (
                <button onClick={() => window.location.href = "/oauth2/authorization/github"}>
                  GitHub 로그인
                </button>
            )}
        </div>
    );
};

export default Home;
