import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatService from '../services/ChatService';
import webSocketService from '../services/WebSocketService';
import './ChatStyles.css';

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

        // 먼저 입력 필드 초기화 (UX 향상)
        const messageText = newMessage;
        setNewMessage('');

        // 새 메시지 객체 생성
        const newMsg = {
            chatMsgId: `local-${Date.now()}`, // 로컬 메시지 ID
            userId: userInfo.id,
            nickname: userInfo.nickname,
            message: messageText,
            sendAt: new Date().toISOString()
        };

        // 메시지 목록에 바로 추가 (낙관적 UI 업데이트)
        const updatedMessages = [...messages, newMsg];
        setMessages(updatedMessages);

        // 로컬 스토리지에 메시지 저장
        saveChatMessages(roomId, updatedMessages);

        // 메시지 전송 시도 
        try {
            // 1. 웹소켓으로 먼저 시도
            const wsSuccess = await webSocketService.sendMessage(
                roomIdInt,
                messageText,
                userInfo.id,
                userInfo.nickname
            );

            console.log('Message sent via WebSocket, success:', wsSuccess);

            // 2. 웹소켓 실패 시 REST API로 시도
            if (!wsSuccess) {
                console.log('WebSocket send failed, trying REST API');
                try {
                    const response = await ChatService.sendMessage(roomId, messageText);
                    if (!response || !response.success) {
                        console.error('API message send failed:', response);
                        throw new Error(response?.message || '메시지 전송에 실패했습니다.');
                    }
                } catch (apiErr) {
                    console.error('REST API send failed:', apiErr);
                    // 실패 알림 표시 (기존 메시지는 유지)
                    const failedMessages = messages.map(msg =>
                        msg.chatMsgId === newMsg.chatMsgId
                            ? { ...msg, failed: true, failReason: '전송 실패' }
                            : msg
                    );
                    setMessages(failedMessages);

                    // Update localStorage with failed status
                    saveChatMessages(roomId, failedMessages);

                    // 사용자에게 알림
                    alert(apiErr.message || '메시지 전송에 실패했습니다.');
                }
            }
        } catch (err) {
            console.error('Error in message send flow:', err);
            // 실패 표시 추가
            const failedMessages = messages.map(msg =>
                msg.chatMsgId === newMsg.chatMsgId
                    ? { ...msg, failed: true, failReason: '전송 실패' }
                    : msg
            );
            setMessages(failedMessages);

            // Update localStorage with failed status
            saveChatMessages(roomId, failedMessages);

            // 사용자에게 알림
            alert('메시지 전송에 실패했습니다.');
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

    // 웹소켓 메시지 핸들러 - 일반 웹소켓용
    const handleWebSocketMessage = (message) => {
        console.log('WebSocket message received:', message);

        // 시스템 메시지 처리
        if (message.type === 'SYSTEM' || message.type === 'SUBSCRIBE_ACK' || message.type === 'UNSUBSCRIBE_ACK') {
            // 시스템 메시지는 상태 표시만 하고 채팅에 추가하지 않음
            console.log('System/Control message:', message.message);
            return;
        }

        // 에러 메시지 처리
        if (message.type === 'ERROR') {
            console.error('WebSocket error message:', message.message);
            // alert(message.message || '채팅 오류가 발생했습니다.');
            return;
        }

        // 채팅방 ID 확인
        const messageRoomId = message.roomId ? parseInt(message.roomId) : null;
        if (messageRoomId && messageRoomId !== roomIdInt) {
            console.log('Message for different room ignored:', messageRoomId);
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
            // 로컬 메시지 ID (local-*)로 시작하는 임시 메시지 대체
            const isLocalMessage = prevMessages.some(msg =>
                msg.chatMsgId?.toString().startsWith('local-') &&
                msg.message === newMessage.message &&
                msg.userId === newMessage.userId
            );

            let updatedMessages;
            if (isLocalMessage) {
                // 임시 메시지를 서버 메시지로 대체
                updatedMessages = prevMessages.map(msg =>
                    (msg.chatMsgId?.toString().startsWith('local-') &&
                        msg.message === newMessage.message &&
                        msg.userId === newMessage.userId)
                        ? newMessage
                        : msg
                );
            } else {
                // 이미 동일한 ID의 메시지가 있는지 확인
                const exists = prevMessages.some(msg =>
                    msg.chatMsgId === newMessage.chatMsgId &&
                    !msg.chatMsgId?.toString().startsWith('local-')
                );

                if (exists) return prevMessages;
                updatedMessages = [...prevMessages, newMessage];
            }

            // 로컬 스토리지에 업데이트된 메시지 저장
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

    return (
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
                                            className={`message ${msg.userId === userInfo.id ? 'sent' : 'received'} ${msg.failed ? 'failed' : ''}`}
                                        >
                                            <div className="avatar">
                                                {/* 실제 사용자 아바타가 있으면 추가 */}
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
                    <i className="fa-solid fa-paper-plane">전송</i>
                </button>
            </form>
        </div>
    );
};

export default ChatRoom;