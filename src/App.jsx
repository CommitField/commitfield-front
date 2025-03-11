// src/App.jsx
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Pets from "./pages/Pets";
import ErrorPage from "./error/ErrorPage";
import TestAPI from "./pages/TestAPI";
import GithubLogin from "./components/GithubLogin";
import ChatRoomList from "./components/ChatRoomList";
import CreateChatRoom from "./components/CreateChatRoom";
import ChatRoom from "./components/ChatRoom";

function ProtectedRoute({ children }) {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(true); // 기본값을 true로 설정

    // 개발 중에는 항상 인증된 것으로 처리
    return children;
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<GithubLogin />} />
                <Route path="/home" element={<Home />} />
                <Route path="/pets" element={<Pets />} />
                <Route path="/error" element={<ErrorPage />} />
                <Route path="/testapi" element={<TestAPI />} />
                <Route path="/protected" element={
                    <ProtectedRoute>
                        <div>보호된 페이지</div>
                    </ProtectedRoute>
                } />

                {/* 채팅 관련 라우트 추가 */}
                <Route path="/chat-rooms/*" element={<ChatRoomList />} />
                <Route path="/create-room" element={<CreateChatRoom />} />
            </Routes>
        </Router>
    );
}

export default App;