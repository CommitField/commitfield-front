import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ChatService from '../services/ChatService';
import ChatRoom from './ChatRoom';
import PasswordModal from './PasswordModal';
import './ChatStyles.css';

const ChatRoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    // 비밀번호 처리를 위한 상태 변수
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [roomToJoin, setRoomToJoin] = useState(null);
    const [passwordError, setPasswordError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // 채팅방 목록 불러오기 함수
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

    // 채팅방 입장 처리 (기존 메서드 수정)
    const handleJoinRoom = async (roomId) => {
        try {
            // 이미 선택된 방이면 무시
            if (selectedRoomId === roomId) {
                return;
            }

            // 선택한 방 객체 찾기
            const selectedRoom = rooms.find(room => room.id === roomId);

            // 방이 존재하지 않으면 오류
            if (!selectedRoom) {
                alert('채팅방을 찾을 수 없습니다.');
                return;
            }

            // 비공개 방인지 확인
            if (selectedRoom.isPrivate) {
                // 비공개 방이면 비밀번호 모달 표시
                setPasswordError('');  // 이전 오류 메시지 초기화
                setRoomToJoin({
                    id: roomId,
                    title: selectedRoom.title || `채팅방 ${roomId}`
                });
                setShowPasswordModal(true);
                return;
            }

            // 비공개 방이 아니면 바로 입장
            await joinRoomDirectly(roomId);
        } catch (err) {
            console.error('Error checking room info:', err);
            alert('채팅방 정보를 가져오는데 실패했습니다.');
        }
    };


    // 비밀번호 없이 바로 입장
    const joinRoomDirectly = async (roomId) => {
        try {
            // 채팅방 ID를 상태에 저장
            setSelectedRoomId(roomId);

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

            // URL 업데이트 (히스토리에는 추가하지 않음)
            navigate(`/chat-rooms/${roomId}`, { replace: true });
        } catch (err) {
            console.error('Error joining room:', err);
            alert('채팅방 참여에 실패했습니다.');
        }
    };

    // 비밀번호 입력 후 제출 처리
    const handlePasswordSubmit = async (password) => {
        try {
            if (!roomToJoin) return;

            setPasswordError('');  // 오류 메시지 초기화

            // 비밀번호로 채팅방 입장 시도
            await ChatService.joinRoomWithPassword(roomToJoin.id, password);

            // 비밀번호 모달 닫기
            setShowPasswordModal(false);

            // 채팅방 입장
            setSelectedRoomId(roomToJoin.id);

            // URL 업데이트
            navigate(`/chat-rooms/${roomToJoin.id}`, { replace: true });

            // roomToJoin 초기화
            setRoomToJoin(null);
        } catch (err) {
            // 비밀번호 오류 처리
            setPasswordError(err.message || '비밀번호가 올바르지 않습니다.');
            // 로딩 상태 해제는 PasswordModal에서 처리
        }
    };

    // 비밀번호 모달 취소
    const handlePasswordCancel = () => {
        setShowPasswordModal(false);
        setRoomToJoin(null);
        setPasswordError('');
    };

    // 채팅방 나가기 콜백 함수 (ChatRoom 컴포넌트에서 호출)
    const handleLeaveRoom = () => {
        console.log('User left the room, clearing selected room');
        setSelectedRoomId(null);
        navigate('/chat-rooms', { replace: true });
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

    // 페이지 로드 시 현재 URL에서 roomId 확인
    useEffect(() => {
        const pathParts = location.pathname.split('/');
        const roomIdFromUrl = pathParts[pathParts.length - 1];

        // URL에 roomId가 있고 숫자인 경우 선택된 채팅방으로 설정
        if (roomIdFromUrl && !isNaN(roomIdFromUrl)) {
            setSelectedRoomId(parseInt(roomIdFromUrl));
        }
    }, [location]);

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
                {/* 새로고침/생성 버튼 */}
                <div className="chat-action-buttons">
                    <div className="refresh-btn" onClick={handleRefresh} title="새로고침">
                        <i className="fa-solid fa-arrows-rotate"></i>새로고침
                    </div>
                    <div className="create-room-btn" onClick={handleCreateRoom}>
                        <i className="fa-solid fa-plus"></i>생성
                    </div>
                </div>

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
                                className={`chat-room ${selectedRoomId === room.id ? 'active' : ''}`}
                                onClick={() => handleJoinRoom(room.id)}
                            >
                                <div className="profile-img">
                                    {/* 프로필 이미지 또는 잠금 아이콘 표시 */}
                                    {room.isPrivate && <i className="fa-solid fa-lock" style={{ color: '#e74c3c' }}></i>}
                                </div>
                                <div className="chat-info">
                                    <div className="chat-name">
                                        {room.title}
                                        {room.isPrivate && <span className="private-badge">비공개</span>}
                                    </div>
                                    <div className="room-stats">
                                        참여 인원: {room.currentUserCount}/{room.userCountMax}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 채팅창 영역 - 우측 검은 영역 */}
            <div className="chat-content-area">
                {selectedRoomId ? (
                    <ChatRoom
                        key={selectedRoomId}
                        roomId={selectedRoomId}
                        onLeaveRoom={handleLeaveRoom}
                        refreshRooms={handleRefresh}
                    />
                ) : (
                    <div className="empty-state">
                        <p>채팅방을 선택해주세요</p>
                    </div>
                )}
            </div>

            {/* 비밀번호 입력 모달 */}
            {showPasswordModal && roomToJoin && (
                <PasswordModal
                    roomTitle={roomToJoin.title}
                    onSubmit={handlePasswordSubmit}
                    onCancel={handlePasswordCancel}
                    error={passwordError}
                />
            )}
        </div>
    );
};

export default ChatRoomList;