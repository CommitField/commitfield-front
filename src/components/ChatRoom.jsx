import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatService from '../services/ChatService';
import webSocketService from '../services/WebSocketService';
import './ChatStyles.css';

const ChatRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastMessageId, setLastMessageId] = useState(null);
    const messagesEndRef = useRef(null);
    const messageListRef = useRef(null);
    const [userInfo, setUserInfo] = useState({ id: null, nickname: '' });
    const [roomInfo, setRoomInfo] = useState({
        title: '채팅방',
        userCount: 0,
        maxUserCount: 0,
        isCreator: false
    });
    const [connected, setConnected] = useState(false);
    const [isRoomCreator, setIsRoomCreator] = useState(false);
    const [actionInProgress, setActionInProgress] = useState(false);

    // Fetch room details including creator info
    const fetchRoomDetails = async () => {
        try {
            const createdRooms = await ChatService.getMyCreatedRooms();
            const isCreator = createdRooms.data?.some(room => room.id === parseInt(roomId));
            setIsRoomCreator(isCreator);
        } catch (err) {
            console.error('Error fetching room details:', err);
        }
    };

    // 메시지 목록을 로드하는 함수
    const loadMessages = async () => {
        try {
            console.log('Loading messages for room:', roomId, 'lastId:', lastMessageId);
            setLoading(true);

            const response = await ChatService.getChatMessages(roomId, lastMessageId);
            console.log('Messages response:', response);

            if (response.success) {
                if (lastMessageId === null) {
                    // 초기 로드
                    setMessages(response.data || []);
                } else {
                    // 추가 메시지 로드 (페이지네이션)
                    setMessages(prevMessages => [...response.data, ...prevMessages]);
                }

                // 마지막 메시지 ID 업데이트
                if (response.data && response.data.length > 0) {
                    const firstMessageId = response.data[0].chatMsgId;
                    setLastMessageId(firstMessageId);
                }

                setError(null);
            } else {
                if (lastMessageId === null) {
                    setMessages([]);
                }
            }
        } catch (err) {
            console.error('Error loading messages:', err);

            if (lastMessageId === null) {
                // 초기 로드 실패만 에러로 표시
                setError('메시지를 불러오는데 실패했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 메시지 전송 함수
    const sendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim()) return;

        // 먼저 입력 필드 초기화 (UX 향상)
        const messageText = newMessage;
        setNewMessage('');

        // 웹소켓으로 메시지 전송
        const success = webSocketService.sendMessage(
            roomId,
            messageText,
            userInfo.id,
            userInfo.nickname
        );

        console.log('Message sent via WebSocket, success:', success);

        // 웹소켓 전송 여부와 상관없이 항상 로컬에 메시지 추가
        const newMsg = {
            chatMsgId: `local-${Date.now()}`, // 로컬 메시지 ID
            userId: userInfo.id,
            nickname: userInfo.nickname,
            message: messageText,
            sendAt: new Date().toISOString()
        };

        // 메시지 목록에 추가
        setMessages(prevMessages => [...prevMessages, newMsg]);

        if (!success) {
            // 웹소켓 실패 시 REST API로 시도
            try {
                const response = await ChatService.sendMessage(roomId, messageText);
                if (!response.success) {
                    console.error('API message send failed:', response);
                    alert(response.message || '메시지 전송에 실패했습니다.');
                }
            } catch (err) {
                console.error('Error sending message:', err);
                alert('메시지 전송에 실패했습니다.');
            }
        }
    };

    // 채팅방 나가기 함수
    const leaveRoom = async () => {
        // 이미 액션이 진행 중이면 중복 실행 방지
        if (actionInProgress) return;

        setActionInProgress(true); // 액션 시작

        try {
            const response = await ChatService.leaveRoom(roomId);
            if (response.success) {
                // 웹소켓 연결 해제
                webSocketService.unsubscribeFromRoom(roomId);

                // localStorage에 이벤트 기록 (목록 새로고침용)
                localStorage.setItem('chatRoomChanged', Date.now().toString());

                // 리다이렉트 방법 강화: React Router와 window.location 모두 사용
                try {
                    // 1. React Router의 navigate 사용 시도
                    navigate('/chat-rooms', { replace: true });

                    // 2. 페이지 이동이 실패할 경우를 대비해 직접 URL 이동
                    setTimeout(() => {
                        // 현재 URL과 이동할 URL을 비교하여 이동이 안 된 경우에만 실행
                        if (!window.location.pathname.includes('/chat-rooms')) {
                            console.log('React Router 이동 실패, window.location 사용');
                            window.location.href = '/chat-rooms';
                        }
                    }, 300);
                } catch (navError) {
                    console.error('Navigation error:', navError);
                    // 어떤 이유로든 navigate가 실패하면 window.location 사용
                    window.location.href = '/chat-rooms';
                }
            } else {
                alert(response.message || '채팅방을 나가는데 실패했습니다.');
                setActionInProgress(false); // 실패 시 액션 상태 초기화
            }
        } catch (err) {
            console.error('Error leaving room:', err);
            alert('채팅방을 나가는데 실패했습니다.');
            setActionInProgress(false); // 실패 시 액션 상태 초기화
        }
    };

    // 채팅방 삭제 함수
    const deleteRoom = async () => {
        // 이미 액션이 진행 중이면 중복 실행 방지
        if (actionInProgress) return;

        // Confirm before deleting
        if (!window.confirm('채팅방을 정말 삭제하시겠습니까? 모든 채팅 내용이 삭제됩니다.')) {
            return;
        }

        setActionInProgress(true); // 액션 시작

        try {
            const response = await ChatService.deleteRoom(roomId);
            if (response.success) {
                // 웹소켓 연결 해제
                webSocketService.unsubscribeFromRoom(roomId);

                // localStorage에 이벤트 기록 (목록 새로고침용)
                localStorage.setItem('chatRoomChanged', Date.now().toString());

                // 리다이렉트 방법 강화: React Router와 window.location 모두 사용
                try {
                    // 1. React Router의 navigate 사용 시도
                    navigate('/chat-rooms', { replace: true });

                    // 2. 페이지 이동이 실패할 경우를 대비해 직접 URL 이동
                    setTimeout(() => {
                        // 현재 URL과 이동할 URL을 비교하여 이동이 안 된 경우에만 실행
                        if (!window.location.pathname.includes('/chat-rooms')) {
                            console.log('React Router 이동 실패, window.location 사용');
                            window.location.href = '/chat-rooms';
                        }
                    }, 300);
                } catch (navError) {
                    console.error('Navigation error:', navError);
                    // 어떤 이유로든 navigate가 실패하면 window.location 사용
                    window.location.href = '/chat-rooms';
                }
            } else {
                alert(response.message || '채팅방 삭제에 실패했습니다.');
                setActionInProgress(false); // 실패 시 액션 상태 초기화
            }
        } catch (err) {
            console.error('Error deleting room:', err);
            alert('채팅방 삭제에 실패했습니다.');
            setActionInProgress(false); // 실패 시 액션 상태 초기화
        }
    };

    // Add effect to fetch room details
    useEffect(() => {
        fetchRoomDetails();
    }, [roomId]);

    // 현재 로그인한 사용자 정보 가져오기
    const getCurrentUser = () => {
        // 이 부분은 실제 애플리케이션에서 로그인한 사용자 정보를 가져오는 방식에 따라 다를 수 있음
        // OAuth2 사용자 정보 가져오기 (localStorage나 sessionStorage에서)
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
            try {
                const user = JSON.parse(userInfoStr);
                setUserInfo({
                    id: user.id,
                    nickname: user.nickname || '사용자'
                });
            } catch (err) {
                console.error('Error parsing user info:', err);
                // 기본값 설정
                setUserInfo({
                    id: 1, // 테스트용 임시 ID
                    nickname: '사용자'
                });
            }
        } else {
            // 사용자 정보가 없으면 기본값 설정
            setUserInfo({
                id: 1, // 테스트용 임시 ID
                nickname: '사용자'
            });
        }
    };

    // 웹소켓 메시지 핸들러
    const handleWebSocketMessage = (message) => {
        console.log('WebSocket message received:', message);

        // 시스템 메시지 처리
        if (message.type === 'SYSTEM') {
            // 시스템 메시지는 서비스 알림으로 표시 (옵션)
            console.log('System message:', message.message);
            return;
        }

        // 메시지 형식 처리
        const newMessage = {
            chatMsgId: message.id || message.chatMsgId || Date.now(),
            userId: message.userId,
            nickname: message.from || message.nickname || '알 수 없는 사용자',
            message: message.message || message.content || '',
            sendAt: message.sendAt || new Date().toISOString()
        };

        // 중복 메시지 방지
        setMessages(prevMessages => {
            // 이미 동일한 ID의 메시지가 있는지 확인
            const exists = prevMessages.some(msg => msg.chatMsgId === newMessage.chatMsgId);
            if (exists) return prevMessages;
            return [...prevMessages, newMessage];
        });
    };

    // 웹소켓 연결 상태 변경 핸들러
    const handleConnectionChange = (isConnected) => {
        setConnected(isConnected);
        console.log('WebSocket connection status:', isConnected);
    };

    useEffect(() => {
        getCurrentUser();
        loadMessages();

        // 웹소켓 연결 및 채팅방 구독
        webSocketService.connect();

        // 메시지 수신 이벤트 리스너 등록
        const unsubscribeFromMessages = webSocketService.onMessage(handleWebSocketMessage);

        // 연결 상태 변경 이벤트 리스너 등록
        const unsubscribeFromConnection = webSocketService.onConnectionChange(setConnected);

        // 채팅방 구독 시도
        setTimeout(() => {
            const success = webSocketService.subscribeToRoom(roomId);
            console.log('Room subscription success:', success);
        }, 1000); // 약간의 지연을 두어 연결이 설정될 시간을 줌

        // 컴포넌트 언마운트 시 이벤트 리스너 제거 및 구독 해제
        return () => {
            if (unsubscribeFromMessages) {
                unsubscribeFromMessages();
            }
            if (unsubscribeFromConnection) {
                unsubscribeFromConnection();
            }
            webSocketService.unsubscribeFromRoom(roomId);
        };
    }, [roomId]);

    // 메시지 목록이 바뀔 때마다 스크롤을 최하단으로 이동
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 메시지 목록 상단에 도달하면 이전 메시지 로드
    const handleScroll = () => {
        if (messageListRef.current) {
            const { scrollTop } = messageListRef.current;
            if (scrollTop === 0 && !loading && messages.length > 0) {
                // 이전 메시지 로드
                loadMessages();
            }
        }
    };

    // 메시지 시간 형식화
    const formatTime = (dateTimeString) => {
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            console.error('Error formatting time:', error);
            return '00:00';
        }
    };

    // 메시지 날짜 형식화
    const formatDate = (dateTimeString) => {
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleDateString();
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Unknown date';
        }
    };

    // 메시지를 날짜별로 그룹화
    const groupMessagesByDate = (msgs) => {
        const grouped = {};

        msgs.forEach(msg => {
            if (!msg.sendAt) {
                // sendAt이 없는 경우 처리
                const defaultDate = formatDate(new Date());
                if (!grouped[defaultDate]) {
                    grouped[defaultDate] = [];
                }
                grouped[defaultDate].push(msg);
                return;
            }

            const date = formatDate(msg.sendAt);
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(msg);
        });

        return grouped;
    };

    const groupedMessages = groupMessagesByDate(messages);
    const sortedDates = Object.keys(groupedMessages).sort((a, b) => {
        return new Date(a) - new Date(b);
    });

    return (
        <div className="chat-layout">
            {/* 사이드바는 상위 컴포넌트에서 렌더링한다고 가정 */}
            
            {/* 채팅 창 */}
            <div className="chat-window">
                {/* 채팅 헤더 */}
                <div className="chat-header">
                    <div className="room-title">{roomInfo.title}</div>
                    <div className="actions">
                        <div className="connection-status">
                            <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></div>
                            <span>{connected ? '연결됨' : '연결 중...'}</span>
                        </div>
                        <button 
                            className={`action-btn ${actionInProgress ? 'disabled' : ''}`}
                            onClick={leaveRoom}
                            disabled={actionInProgress}
                        >
                            <i className="fa-solid fa-right-from-bracket"></i>
                            {actionInProgress ? '처리 중...' : '나가기'}
                        </button>
                        {isRoomCreator && (
                            <button 
                                className={`action-btn delete ${actionInProgress ? 'disabled' : ''}`}
                                onClick={deleteRoom}
                                disabled={actionInProgress}
                            >
                                <i className="fa-solid fa-trash"></i>
                                {actionInProgress ? '처리 중...' : '삭제하기'}
                            </button>
                        )}
                    </div>
                </div>

                {/* 채팅 메시지 영역 */}
                {loading && messages.length === 0 ? (
                    <div className="loading">
                        <div className="loading-spinner"></div>
                        <p>로딩 중...</p>
                    </div>
                ) : error ? (
                    <div className="empty-chat">
                        <p className="text-red-500">{error}</p>
                    </div>
                ) : (
                    <div
                        className="chat-messages"
                        ref={messageListRef}
                        onScroll={handleScroll}
                    >
                        {messages.length === 0 ? (
                            <div className="empty-chat">
                                <p className="main-message">아직 메시지가 없습니다.</p>
                                <p className="sub-message">첫 메시지를 보내보세요!</p>
                            </div>
                        ) : (
                            <>
                                {sortedDates.map(date => (
                                    <div key={date}>
                                        <div className="date-divider">
                                            <span>{date}</span>
                                        </div>
                                        {groupedMessages[date].map((msg) => (
                                            <div
                                                key={msg.chatMsgId || `${msg.userId}-${Date.now()}-${Math.random()}`}
                                                className={`message ${msg.userId === userInfo.id ? 'sent' : 'received'}`}
                                            >
                                                <div className="avatar">
                                                    {/* 실제 사용자 아바타가 있으면 추가 */}
                                                </div>
                                                <div className="content">
                                                    <div className="sender">{msg.nickname}</div>
                                                    <div className="bubble">{msg.message}</div>
                                                    <div className="time">
                                                        {msg.sendAt ? formatTime(msg.sendAt) : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                )}

                {/* 채팅 입력 영역 */}
                <form onSubmit={sendMessage} className="chat-input">
                    <button type="button" className="emoji-btn">
                        <i className="fa-regular fa-face-smile"></i>
                    </button>
                    <button type="button" className="attach-btn">
                        <i className="fa-solid fa-paperclip"></i>
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="메시지를 입력하세요"
                        maxLength={300}
                        disabled={actionInProgress}
                    />
                    <button
                        type="submit"
                        className="send-btn"
                        disabled={!newMessage.trim() || actionInProgress}
                    >
                        <i className="fa-solid fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatRoom;