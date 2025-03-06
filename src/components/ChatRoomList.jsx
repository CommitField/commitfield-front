import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Route, Routes } from 'react-router-dom';
import ChatService from '../services/ChatService';
import ChatRoom from './ChatRoom'; // 채팅방 컴포넌트 import
import './ChatStyles.css';

const ChatRoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'created', 'joined'
    const [refreshTrigger, setRefreshTrigger] = useState(0); // 목록 새로고침을 위한 트리거
    const navigate = useNavigate();
    const location = useLocation();

    // 채팅방 목록 불러오기 함수 - 페이지네이션 제거
    const loadRooms = async () => {
        setLoading(true);
        try {
            let response;
            const forceRefresh = true; // 매번 최신 데이터 가져오기
            switch (activeTab) {
                case 'created':
                    response = await ChatService.getMyCreatedRooms(0, 100, forceRefresh);
                    break;
                case 'joined':
                    response = await ChatService.getMyJoinedRooms(0, 100, forceRefresh);
                    break;
                default:
                    response = await ChatService.getRoomList(0, 100, forceRefresh);
            }

            console.log(`${activeTab} 채팅방 목록 응답:`, response);

            // Handle API response
            if (response.data && Array.isArray(response.data)) {
                setRooms(response.data || []);
                setError(null);
            } else if (response.success && response.data) {
                setRooms(response.data || []);
                setError(null);
            } else {
                // Error handling
                setRooms([]);
                setError(response.message || '데이터를 불러오는데 실패했습니다.');
            }
        } catch (err) {
            console.error('Error loading rooms:', err);
            setError('채팅방 목록을 불러오는데 실패했습니다.');
            setRooms([]);
        } finally {
            setLoading(false);
        }
    };

    // 채팅방 입장 처리
    const handleJoinRoom = async (roomId) => {
        try {
            // Check if we're in the "all" tab and not already joined
            if (activeTab === 'all') {
                // Get joined rooms to check if already joined
                const joinedResponse = await ChatService.getMyJoinedRooms();
                const joinedRooms = joinedResponse.data || [];
                const isAlreadyJoined = joinedRooms.some(room => room.id === roomId);

                if (!isAlreadyJoined) {
                    // Call join API if not already joined
                    await ChatService.joinRoom(roomId);
                }
            }

            // Navigate to the room directly in the current view
            navigate(`/chat-rooms/${roomId}`);
        } catch (err) {
            console.error('Error joining room:', err);
            alert('채팅방 참여에 실패했습니다.');
        }
    };

    const handleCreateRoom = () => {
        navigate('/create-room');
    };

    // 탭 변경 시 목록 새로고침
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // 로컬 스토리지로부터 채팅방 생성/변경/삭제 이벤트 감지
    useEffect(() => {
        const checkForChanges = () => {
            // 참여 방 새로고침 플래그 확인
            const refreshJoinedOnly = localStorage.getItem('refreshJoinedOnly');

            // 방 변경 이벤트
            const roomChanged = localStorage.getItem('chatRoomChanged');
            if (roomChanged) {
                if (refreshJoinedOnly === 'true') {
                    // 현재 '참여 중인 채팅방' 탭이거나 참여 방만 업데이트하는 경우
                    if (activeTab === 'joined') {
                        console.log('참여 중인 채팅방 목록만 새로고침');
                        setRefreshTrigger(prev => prev + 1);
                    }
                    localStorage.removeItem('refreshJoinedOnly');
                } else {
                    // 일반적인 모든 탭 새로고침
                    console.log('모든 탭 새로고침');
                    setRefreshTrigger(prev => prev + 1);
                }

                localStorage.removeItem('chatRoomChanged');
            }
        };

        // 컴포넌트 마운트 시 확인
        checkForChanges();

        // 스토리지 이벤트 리스너 등록
        const handleStorageChange = () => {
            checkForChanges();
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [activeTab]);

    // 목록 로드 효과
    useEffect(() => {
        loadRooms();
    }, [activeTab, refreshTrigger, location.pathname]);

    // 페이지 재방문 시 목록 새로고침
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadRooms();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [activeTab]);

    // 수동 새로고침 버튼 핸들러
    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // Check if room list is empty
    const isRoomsEmpty = rooms.length === 0;

    return (
        <div className="chat-layout">
            {/* 채팅방 목록 컨테이너 */}
            <div className="chat-list-container">
                {/* 채팅방 목록 헤더 */}
                <div className="chat-tabs">
                    <div
                        className={`chat-tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => handleTabChange('all')}
                    >
                        전체 채팅방
                    </div>
                    <div
                        className={`chat-tab ${activeTab === 'created' ? 'active' : ''}`}
                        onClick={() => handleTabChange('created')}
                    >
                        내가 만든 채팅방
                    </div>
                    <div
                        className={`chat-tab ${activeTab === 'joined' ? 'active' : ''}`}
                        onClick={() => handleTabChange('joined')}
                    >
                        참여 중인 채팅방
                    </div>
                </div>

                {/* 채팅방 목록 */}
                {loading ? (
                    <div className="loading">
                        <div className="loading-spinner"></div>
                        <p>로딩 중...</p>
                    </div>
                ) : error ? (
                    <div className="empty-chat">
                        <p className="main-message">{error}</p>
                    </div>
                ) : isRoomsEmpty ? (
                    <div className="empty-chat">
                        <p className="main-message">채팅방이 없습니다.</p>
                    </div>
                ) : (
                    <div className="chat-rooms">
                        {/* 채팅방 개수 표시 */}
                        <div className="room-count">
                            총 {rooms.length}개의 채팅방이 있습니다.
                        </div>

                        {/* 채팅방 목록 */}
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="chat-room"
                                onClick={() => handleJoinRoom(room.id)}
                            >
                                <div className="profile-img">
                                    {/* 프로필 이미지가 있다면 여기에 표시 */}
                                </div>
                                <div className="chat-info">
                                    <div className="chat-name">
                                        {room.title}
                                    </div>
                                    <div className="room-stats">
                                        참여 인원: {room.currentUserCount}/{room.userCountMax}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 채팅방 생성 버튼 */}
                <div className="create-room-btn" onClick={handleCreateRoom}>
                    <i className="fa-solid fa-plus"></i>
                </div>

                {/* 새로고침 버튼 */}
                <div className="refresh-btn" onClick={handleRefresh} title="새로고침">
                    <i className="fa-solid fa-arrows-rotate"></i>
                </div>
            </div>

            {/* 채팅창 영역 - 우측 검은 영역 */}
            <div className="chat-content-area">
                <Routes>
                    <Route path="/:roomId" element={<ChatRoom />} />
                    <Route path="/" element={
                        <div className="empty-state">
                            <p>채팅방을 선택해주세요</p>
                        </div>
                    } />
                </Routes>
            </div>
        </div>
    );
};

export default ChatRoomList;