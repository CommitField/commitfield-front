import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home";
import ErrorPage from "./error/ErrorPage";
import GithubLogin from "./components/GithubLogin";

function ProtectedRoute({ children }) {
    const navigate = useNavigate();

    useEffect(() => {
        fetch("/api/protected-endpoint")
            .then(response => {
                if (response.status === 403) {
                    navigate("/error");  // 403이면 에러 페이지로 이동
                }
            })
            .catch(() => navigate("/error"));  // 기타 네트워크 오류 시에도 에러 페이지로 이동
    }, [navigate]);

    return children;
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<GithubLogin />} />
                <Route path="/error" element={<ErrorPage />} />
                <Route path="/protected" element={
                    <ProtectedRoute>
                        <div>보호된 페이지</div>
                    </ProtectedRoute>
                } />
            </Routes>
        </Router>
    );
}

export default App;