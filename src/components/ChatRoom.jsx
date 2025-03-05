// src/components/ChatRoom.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatService from '../services/ChatService';
import webSocketService from '../services/WebSocketService';

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
        isCreator: false // Add flag to track if current user is creator
    });
    const [connected, setConnected] = useState(false);
    const [isRoomCreator, setIsRoomCreator] = useState(false); // Track if user is room creator

    // Fetch room details including creator info
    const fetchRoomDetails = async () => {
        try {
            // This would need to be implemented in your API
            // For now we'll just check if user is in rooms they created
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
                // API가 성공했지만 데이터가 없는 경우 (이미 인터셉터에서 처리됨)
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

    // 메시지 전송 함수 - 오류 처리 개선
    // sendMessage 함수를 수정하여 로컬에서 메시지를 표시하도록 합니다
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
        // (백엔드에서 메시지를 다시 보내지 않을 경우 대비)
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

    // 채팅방 나가기 - Normal exit (just removes user from room)
    const leaveRoom = async () => {
        try {
            const response = await ChatService.leaveRoom(roomId);
            if (response.success) {
                // 웹소켓 연결 해제
                webSocketService.unsubscribeFromRoom(roomId);
                navigate('/chat-rooms', { replace: true });
            } else {
                alert(response.message || '채팅방을 나가는데 실패했습니다.');
            }
        } catch (err) {
            console.error('Error leaving room:', err);
            alert('채팅방을 나가는데 실패했습니다.');
        }
    };

    // 채팅방 삭제 - Only for creators, completely removes the room
    const deleteRoom = async () => {
        // Confirm before deleting
        if (!window.confirm('채팅방을 정말 삭제하시겠습니까? 모든 채팅 내용이 삭제됩니다.')) {
            return;
        }

        try {
            const response = await ChatService.deleteRoom(roomId);
            if (response.success) {
                // 웹소켓 연결 해제
                webSocketService.unsubscribeFromRoom(roomId);
                navigate('/chat-rooms', { replace: true });
            } else {
                alert(response.message || '채팅방 삭제에 실패했습니다.');
            }
        } catch (err) {
            console.error('Error deleting room:', err);
            alert('채팅방 삭제에 실패했습니다.');
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

    // UI 개선 - 연결 상태 표시기 추가
    return (
        <div className="container mx-auto h-screen flex flex-col p-4">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h1 className="text-xl font-bold">{roomInfo.title}</h1>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <span
                            className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
                        ></span>
                        <span className="text-sm text-gray-600 ml-2">
                            {connected ? '연결됨' : '연결 중...'}
                        </span>
                    </div>
                    <button
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        onClick={leaveRoom}
                    >
                        나가기
                    </button>
                    {isRoomCreator && (
                        <button
                            className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 text-sm"
                            onClick={deleteRoom}
                        >
                            삭제하기
                        </button>
                    )}
                </div>
            </div>

            {/* 기존 메시지 표시 UI는 그대로 유지 */}
            {loading && messages.length === 0 ? (
                <div className="flex-grow flex items-center justify-center">
                    <p>로딩 중...</p>
                </div>
            ) : error ? (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-red-500">{error}</p>
                </div>
            ) : (
                <div
                    className="flex-grow border rounded-lg p-4 overflow-y-auto mb-4 bg-gray-50"
                    ref={messageListRef}
                    onScroll={handleScroll}
                >
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <p className="text-gray-500">아직 메시지가 없습니다.</p>
                            <p className="text-gray-400 text-sm mt-2">첫 메시지를 보내보세요!</p>
                        </div>
                    ) : (
                        <>
                            {sortedDates.map(date => (
                                <div key={date}>
                                    <div className="flex justify-center my-3">
                                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                                            {date}
                                        </span>
                                    </div>
                                    {groupedMessages[date].map((msg) => (
                                        <div
                                            key={msg.chatMsgId || `${msg.userId}-${Date.now()}-${Math.random()}`}
                                            className={`mb-4 ${msg.userId === userInfo.id ? 'text-right' : 'text-left'}`}
                                        >
                                            {msg.userId !== userInfo.id && (
                                                <p className="text-sm text-gray-600 font-medium">{msg.nickname}</p>
                                            )}
                                            <div className="flex items-end">
                                                {msg.userId !== userInfo.id && <div className="flex-grow-0"></div>}
                                                <div
                                                    className={`inline-block rounded-lg px-4 py-2 max-w-xs break-words ${msg.userId === userInfo.id
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-white border border-gray-200 text-gray-800'
                                                        }`}
                                                >
                                                    {msg.message}
                                                </div>
                                                {msg.userId === userInfo.id && <div className="flex-grow-0"></div>}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {msg.sendAt ? formatTime(msg.sendAt) : ''}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>
            )}

            <form onSubmit={sendMessage} className="flex space-x-2">
                <input
                    type="text"
                    className="flex-grow p-2 border border-gray-300 rounded"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="메시지를 입력하세요"
                    maxLength={300}
                />
                <button
                    type="submit"
                    className={`px-4 py-2 rounded text-white ${!connected ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                    disabled={!newMessage.trim()}
                >
                    {!connected ? '전송 (API)' : '전송'}
                </button>
            </form>
        </div>
    );
};

export default ChatRoom;