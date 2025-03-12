import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatService from '../services/ChatService';
import webSocketService from '../services/WebSocketService';
import './ChatStyles.css';

// Define API_BACKEND_URL
const API_BACKEND_URL = 'http://localhost:8090';

const ChatRoom = ({ roomId: propRoomId, onLeaveRoom, refreshRooms }) => {
    const { roomId: paramRoomId } = useParams();
    const roomId = propRoomId || paramRoomId; // 속성으로 받은 값 우선, 없으면 URL 파라미터 사용
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
    const roomIdInt = parseInt(roomId);
    const [wsConnectionRetries, setWsConnectionRetries] = useState(0);
    const maxWsRetries = 5;
    const prevRoomIdRef = useRef(null);
    const [showParticipants, setShowParticipants] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);

    // Cache key for stored messages
    const getChatStorageKey = (roomId) => `chat_messages_${roomId}`;

    // Fetch room details including creator info
    const fetchRoomDetails = async () => {
        try {
            const createdRooms = await ChatService.getMyCreatedRooms();
            if (createdRooms && createdRooms.data) {
                const isCreator = createdRooms.data.some(room => room.id === roomIdInt);
                setIsRoomCreator(isCreator);

                // 룸 정보 가져오기
                const roomData = createdRooms.data.find(room => room.id === roomIdInt);
                if (roomData) {
                    setRoomInfo({
                        title: roomData.title || '채팅방',
                        userCount: roomData.currentUserCount || 0,
                        maxUserCount: roomData.userCountMax || 0,
                        isCreator: isCreator
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching room details:', err);
            // 에러 발생 시 기본 정보로 설정
            setIsRoomCreator(false);
        }
    };

    // Save chat messages to localStorage
    const saveChatMessages = (roomId, messages) => {
        try {
            if (messages && messages.length > 0) {
                // Only save the most recent 100 messages to prevent exceeding storage limits
                const messagesToSave = messages.slice(-100);
                localStorage.setItem(getChatStorageKey(roomId), JSON.stringify(messagesToSave));
            }
        } catch (error) {
            console.error('Error saving chat messages to localStorage:', error);
        }
    };

    // Load chat messages from localStorage
    const loadCachedMessages = (roomId) => {
        try {
            const cachedMessages = localStorage.getItem(getChatStorageKey(roomId));
            if (cachedMessages) {
                return JSON.parse(cachedMessages);
            }
        } catch (error) {
            console.error('Error loading cached chat messages:', error);
        }
        return null;
    };

    // 메시지 목록을 로드하는 함수
    const loadMessages = async () => {
        try {
            console.log('Loading messages for room:', roomId, 'lastId:', lastMessageId);
            setLoading(true);

            // First check if we have cached messages
            const cachedMessages = loadCachedMessages(roomId);
            if (cachedMessages && lastMessageId === null) {
                console.log('Using cached messages');
                setMessages(cachedMessages);
            }

            const response = await ChatService.getChatMessages(roomId, lastMessageId);
            console.log('Messages response:', response);

            if (response && response.success) {
                if (lastMessageId === null) {
                    // Replace existing messages only if we got new messages from server
                    if (response.data && response.data.length > 0) {
                        setMessages(response.data || []);
                        // Save to localStorage
                        saveChatMessages(roomId, response.data);
                    }
                } else {
                    // 추가 메시지 로드 (페이지네이션)
                    const newMessages = [...response.data, ...messages];
                    setMessages(newMessages);
                    // Save combined messages to localStorage
                    saveChatMessages(roomId, newMessages);
                }

                // 마지막 메시지 ID 업데이트
                if (response.data && response.data.length > 0) {
                    const firstMessageId = response.data[0].chatMsgId;
                    setLastMessageId(firstMessageId);
                }

                setError(null);
            } else {
                if (lastMessageId === null && (!cachedMessages || cachedMessages.length === 0)) {
                    setMessages([]);

                    // 응답이 성공이 아니지만 오류가 아닌 경우 (예: 메시지가 없는 경우)
                    if (response && response.message) {
                        console.log('No messages or other condition:', response.message);
                    }
                }
            }
        } catch (err) {
            console.error('Error loading messages:', err);

            if (lastMessageId === null && (!cachedMessages || cachedMessages.length === 0)) {
                // 초기 로드 실패만 에러로 표시
                setError('메시지를 불러오는데 실패했습니다.');
                setMessages([]); // 빈 메시지 배열로 설정
            }
        } finally {
            setLoading(false);
        }
    };

    // 메시지 전송 함수
    const sendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim()) return;

        const messageText = newMessage;
        setNewMessage('');

        try {
            // 현재 사용자 정보 가져오기
            const userResponse = await fetch(`${API_BACKEND_URL}/api/user/chatinfo`, {
                credentials: 'include'
            });
            const userData = await userResponse.json();

            if (!userData || !userData.id) {
                throw new Error('사용자 정보를 가져올 수 없습니다.');
            }

            // 새 메시지 객체 생성
            const newMsg = {
                chatMsgId: `local-${Date.now()}`,
                userId: userData.id,
                username: userData.username,
                nickname: userData.nickname || userData.username,
                avatarUrl: userData.avatarUrl, // 프로필 이미지 URL 추가
                message: messageText,
                sendAt: new Date().toISOString()
            };

            // 메시지 목록에 바로 추가 (낙관적 UI 업데이트)
            setMessages(prev => [...prev, newMsg]);

            // 웹소켓으로 메시지 전송
            const wsSuccess = await webSocketService.sendMessage(
                roomIdInt,
                messageText,
                userData.id,
                userData.username,
                userData.nickname || userData.username
            );

            if (!wsSuccess) {
                // 웹소켓 전송 실패 시 REST API로 시도
                const response = await ChatService.sendMessage(roomId, messageText);
                if (!response.success) {
                    throw new Error('메시지 전송 실패');
                }
            }
        } catch (err) {
            console.error('Error sending message:', err);
            alert(err.message || '메시지 전송에 실패했습니다.');
            
            // 실패한 메시지 표시
            setMessages(prev => 
                prev.map(msg => 
                    msg.chatMsgId === `local-${Date.now()}` 
                        ? { ...msg, failed: true, failReason: '전송 실패' } 
                        : msg
                )
            );
        }
    };

    // 채팅방 나가기 함수
    const leaveRoom = async () => {
        // 이미 액션이 진행 중이면 중복 실행 방지
        if (actionInProgress) return;

        // Confirm before deleting
        if (!window.confirm('채팅방을 정말 나가시겠습니까?')) {
            return;
        }

        setActionInProgress(true); // 액션 시작

        // 먼저 UI 업데이트
        if (onLeaveRoom) {
            onLeaveRoom();
        }

        try {
            // 백그라운드에서 서버 요청 처리
            await ChatService.leaveRoom(roomId);

            // 웹소켓 연결 해제
            webSocketService.unsubscribeFromRoom(roomIdInt);

            // 목록 새로고침
            if (refreshRooms) {
                refreshRooms();
            }
        } catch (err) {
            console.error('Error leaving room:', err);
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

        // 먼저 UI 업데이트
        if (onLeaveRoom) {
            onLeaveRoom();
        }

        try {
            // 백그라운드에서 서버 요청 처리
            await ChatService.deleteRoom(roomId);

            // 웹소켓 연결 해제
            webSocketService.unsubscribeFromRoom(roomIdInt);

            // 채팅방 삭제 시 로컬 스토리지의 메시지도 삭제
            localStorage.removeItem(getChatStorageKey(roomId));

            // 목록 새로고침
            if (refreshRooms) {
                refreshRooms();
            }
        } catch (err) {
            console.error('Error deleting room:', err);
        }
    };

    // 현재 로그인한 사용자 정보 가져오기
    const getCurrentUser = async () => {
        try {
            const response = await fetch(`${API_BACKEND_URL}/api/user/chatinfo`, {
                credentials: 'include'
            });
            const userData = await response.json();

            if (!userData || !userData.id) {
                throw new Error('사용자 정보를 가져올 수 없습니다.');
            }

            setUserInfo({
                id: userData.id,
                nickname: userData.nickname || userData.username
            });
        } catch (err) {
            console.error('Failed to get current user:', err);
            alert('사용자 정보를 가져올 수 없습니다. 로그인 페이지로 이동합니다.');
            navigate('/', { replace: true });
        }
    };

    // 웹소켓 메시지 핸들러 수정
    const handleWebSocketMessage = (message) => {
        console.log('WebSocket message received:', message);

        if (message.type === 'SYSTEM' || message.type === 'SUBSCRIBE_ACK' || message.type === 'UNSUBSCRIBE_ACK') {
            return;
        }

        if (message.type === 'ERROR') {
            return;
        }

        const messageRoomId = parseInt(message.roomId);
        if (messageRoomId !== roomIdInt) {
            return;
        }

        // 현재 사용자가 보낸 메시지인지 확인
        if (message.isLocalMessage || parseInt(message.userId) === parseInt(userInfo.id)) {
            console.log('Ignoring own message:', message);
            return;
        }

        setMessages(prevMessages => {
            // 중복 메시지 확인
            const isDuplicate = prevMessages.some(msg => 
                msg.chatMsgId === message.id ||
                (msg.message === message.message &&
                 parseInt(msg.userId) === parseInt(message.userId) &&
                 Math.abs(new Date(msg.sendAt) - new Date(message.sendAt)) < 1000)
            );

            if (isDuplicate) {
                console.log('Duplicate message ignored:', message);
                return prevMessages;
            }

            const newMessage = {
                chatMsgId: message.id || Date.now(),
                userId: parseInt(message.userId),
                nickname: message.nickname || message.from || '알 수 없는 사용자',
                avatarUrl: message.avatarUrl, // avatarUrl 추가
                message: message.message,
                sendAt: message.sendAt || new Date().toISOString()
            };

            const updatedMessages = [...prevMessages, newMessage];
            saveChatMessages(roomId, updatedMessages);
            return updatedMessages;
        });
    };

    // 웹소켓 연결 상태 변경 핸들러
    const handleConnectionChange = (isConnected) => {
        setConnected(isConnected);
        console.log('WebSocket connection status:', isConnected);

        // 연결이 되면 재시도 카운터 초기화
        if (isConnected) {
            setWsConnectionRetries(0);
        }
    };

    // 구독 시도 함수
    const trySubscribeToRoom = async () => {
        if (wsConnectionRetries >= maxWsRetries) {
            console.error(`Maximum WebSocket connection retries (${maxWsRetries}) reached`);
            return false;
        }

        try {
            // WebSocket 연결 확인
            const isConnected = await webSocketService.ensureConnection();
            if (!isConnected) {
                console.warn('WebSocket not connected, retry later');
                setWsConnectionRetries(prev => prev + 1);
                return false;
            }

            // 방 구독 시도
            const success = await webSocketService.subscribeToRoom(roomIdInt);
            console.log('Room subscription success:', success);

            if (success) {
                return true;
            } else {
                // 구독 실패 시 재시도 카운터 증가
                setWsConnectionRetries(prev => prev + 1);
                return false;
            }
        } catch (err) {
            console.error('Error subscribing to room:', err);
            setWsConnectionRetries(prev => prev + 1);
            return false;
        }
    };

    // Add effect to fetch room details
    useEffect(() => {
        fetchRoomDetails();
    }, [roomId]);


    // 새 메시지 추가 시 조건부 스크롤 처리
    useEffect(() => {
        if (messageListRef.current) {
            // 스크롤이 맨 아래에 있는지 확인
            const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
            const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;

            // 본인이 보낸 새 메시지이거나 스크롤이 이미 맨 아래에 있는 경우만 자동 스크롤
            const isOwnNewMessage = messages.length > 0 &&
                messages[messages.length - 1].userId === userInfo.id &&
                messages[messages.length - 1].chatMsgId?.toString().startsWith('local-');

            if (isScrolledToBottom || isOwnNewMessage) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [messages]);

    const prevMessagesRef = useRef([]);

    // 메시지 목록 상단에 도달하면 이전 메시지 로드
    const handleScroll = () => {
        if (messageListRef.current) {
            const { scrollTop } = messageListRef.current;
            if (scrollTop === 0 && !loading && messages.length > 0) {
                // 스크롤 위치 기억
                const scrollHeight = messageListRef.current.scrollHeight;

                // 이전 메시지 로드
                loadMessages().then(() => {
                    // 이전 위치 유지 (새 메시지가 위에 추가되면 스크롤 위치 조정)
                    if (messageListRef.current) {
                        const newScrollHeight = messageListRef.current.scrollHeight;
                        messageListRef.current.scrollTop = newScrollHeight - scrollHeight;
                    }
                });
            }
        }
    };

    useEffect(() => {
        // Check if room ID has changed
        if (prevRoomIdRef.current !== roomId) {
            // Reset state for the new room
            setLastMessageId(null);
            setMessages([]);
            setLoading(true);
            setError(null);

            // Update the ref
            prevRoomIdRef.current = roomId;
        }

        getCurrentUser();
        loadMessages();

        // 웹소켓 연결 및 채팅방 구독
        // 연결 상태 변경 이벤트 리스너 등록
        const unsubscribeFromConnection = webSocketService.onConnectionChange(handleConnectionChange);

        // 메시지 수신 이벤트 리스너 등록
        const unsubscribeFromMessages = webSocketService.onMessage(handleWebSocketMessage);

        // 웹소켓 연결 및 구독 시도
        const initialSubscription = async () => {
            await webSocketService.connect();

            // 구독 시도
            const subscriptionSuccess = await trySubscribeToRoom();

            if (!subscriptionSuccess) {
                // 첫 시도 실패 시 재시도 로직
                let retryAttempt = 0;
                const maxRetries = 3;
                const retryInterval = 2000; // 2초

                const retrySubscription = setInterval(async () => {
                    retryAttempt++;
                    console.log(`Retrying subscription to room ${roomId}, attempt ${retryAttempt}`);

                    const retrySuccess = await trySubscribeToRoom();
                    if (retrySuccess || retryAttempt >= maxRetries) {
                        console.log(`Subscription retry ${retrySuccess ? 'succeeded' : 'failed after max attempts'}`);
                        clearInterval(retrySubscription);
                    }
                }, retryInterval);

                // 컴포넌트 언마운트 시 인터벌 정리
                return () => clearInterval(retrySubscription);
            }
        };

        initialSubscription();

        // 컴포넌트 언마운트 시 이벤트 리스너 제거 및 구독 해제
        return () => {
            if (unsubscribeFromMessages) {
                unsubscribeFromMessages();
            }
            if (unsubscribeFromConnection) {
                unsubscribeFromConnection();
            }
            webSocketService.unsubscribeFromRoom(roomIdInt);
        };
    }, [roomId]);

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

    // 참여자 목록 조회 함수 수정
    const fetchParticipants = async () => {
        try {
            setLoadingParticipants(true);
            const response = await ChatService.getRoomUsers(roomIdInt);
           
                setParticipants(response.data);
            
        } catch (err) {
            console.error('Error fetching participants:', err);
            alert('참여자 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoadingParticipants(false);
        }
    };

    // 모달 토글 함수
    const toggleParticipants = () => {
        if (!showParticipants) {
            fetchParticipants();
        }
        setShowParticipants(!showParticipants);
    };

    return (
        <div className="chat-window">
            {/* 채팅 헤더 */}
            <div className="chat-header">
                <div className="room-info-container">
                    <div className="room-title">{roomInfo.title}</div>

                    {/* 제목 옆에 삭제/나가기 버튼 배치 */}
                    <div className="header-actions">
                        {/* 참여자 목록 버튼 추가 */}
                        <button
                            className="action-btn"
                            onClick={toggleParticipants}
                        >
                            <i className="fa-solid fa-users"></i>
                            참여자
                        </button>

                        <button
                            className={`action-btn ${actionInProgress ? 'disabled' : ''}`}
                            onClick={leaveRoom}
                            disabled={actionInProgress}
                        >
                            <i className="fa-solid fa-right-from-bracket"></i>
                            {actionInProgress ? '처리중' : '나가기'}
                        </button>

                        {isRoomCreator && (
                            <button
                                className={`action-btn delete ${actionInProgress ? 'disabled' : ''}`}
                                onClick={deleteRoom}
                                disabled={actionInProgress}
                            >
                                <i className="fa-solid fa-trash"></i>
                                {actionInProgress ? '처리중' : '삭제하기'}
                            </button>
                        )}

                        <div className="connection-status">
                            <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></div>
                            <span>{connected ? '연결됨' : '연결 중...'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 참여자 목록 모달 */}
            {showParticipants && (
                <div className="participants-modal" onClick={() => setShowParticipants(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>참여자 목록 ({participants.length}명)</h3>
                            <button 
                                onClick={() => setShowParticipants(false)}
                                className="close-btn"
                                aria-label="닫기"
                            >
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            {loadingParticipants ? (
                                <div className="loading">
                                    <div className="loading-spinner"></div>
                                    <span>참여자 목록을 불러오는 중...</span>
                                </div>
                            ) : participants.length === 0 ? (
                                <div className="empty-list">참여자가 없습니다.</div>
                            ) : (
                                <ul className="participants-list">
                                    {participants.map((user, index) => (
                                        <li key={index} className="participant-item">
                                            <div className="participant-avatar">
                                                {user.imageUrl ? (
                                                    <img src={user.imageUrl} alt={user.nickname} />
                                                ) : (
                                                    <i className="fa-solid fa-user"></i>
                                                )}
                                            </div>
                                            <span className="participant-name">{user.nickname || '알 수 없는 사용자'}</span>
                                            <span 
                                                className={`online-status ${user.status ? 'online' : 'offline'}`}
                                                title={user.status ? '온라인' : '오프라인'}
                                            ></span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                            className={`message ${msg.userId === userInfo.id ? 'sent' : 'received'} ${msg.failed ? 'failed' : ''}`}
                                        >
                                            <div className="avatar">
                                                {msg.avatarUrl ? (
                                                    <img 
                                                        src={msg.avatarUrl} 
                                                        alt={msg.nickname} 
                                                        className="user-avatar"
                                                    />
                                                ) : (
                                                    <i className="fas fa-user"></i>
                                                )}
                                            </div>
                                            <div className="content">
                                                <div className="sender">{msg.nickname}</div>
                                                <div className="bubble">{msg.message}</div>
                                                <div className="time">
                                                    {msg.sendAt ? formatTime(msg.sendAt) : ''}
                                                    {msg.failed && <span className="error-badge" title={msg.failReason}>!</span>}
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
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="메시지를 입력하세요"
                    maxLength={300}
                    disabled={actionInProgress || !connected}
                />
                <button
                    type="submit"
                    className="send-btn"
                    disabled={!newMessage.trim() || actionInProgress || !connected}
                >
                    <i className="fa-solid fa-paper-plane"></i>
                    전송
                </button>
            </form>
        </div>
    );
};

export default ChatRoom;