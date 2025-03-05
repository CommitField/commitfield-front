// src/components/ChatRoomList.jsx - Updated with proper handling of room lists
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatService from '../services/ChatService';

const ChatRoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'created', 'joined'
    const navigate = useNavigate();

    useEffect(() => {
        loadRooms();
    }, [activeTab]);

    const loadRooms = async () => {
        setLoading(true);
        try {
            let response;
            switch (activeTab) {
                case 'created':
                    response = await ChatService.getMyCreatedRooms();
                    break;
                case 'joined':
                    response = await ChatService.getMyJoinedRooms();
                    break;
                default:
                    response = await ChatService.getRoomList();
            }

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
            
            // Navigate to the room
            navigate(`/chat/${roomId}`);
        } catch (err) {
            console.error('Error joining room:', err);
            alert('채팅방 참여에 실패했습니다.');
        }
    };

    const handleCreateRoom = () => {
        navigate('/create-room');
    };

    // Check if room list is empty
    const isRoomsEmpty = rooms.length === 0;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">채팅방 목록</h1>

            <div className="mb-6">
                <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={handleCreateRoom}
                >
                    새 채팅방 만들기
                </button>
            </div>

            <div className="flex mb-4 border-b">
                <button
                    className={`px-4 py-2 ${activeTab === 'all' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    전체 채팅방
                </button>
                <button
                    className={`px-4 py-2 ${activeTab === 'created' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
                    onClick={() => setActiveTab('created')}
                >
                    내가 만든 채팅방
                </button>
                <button
                    className={`px-4 py-2 ${activeTab === 'joined' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
                    onClick={() => setActiveTab('joined')}
                >
                    참여 중인 채팅방
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">로딩 중...</div>
            ) : error ? (
                <div className="text-center py-8 text-gray-500">{error}</div>
            ) : isRoomsEmpty ? (
                <div className="text-center py-8 text-gray-500">채팅방이 없습니다.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleJoinRoom(room.id)}
                        >
                            <h2 className="text-xl font-semibold mb-2">{room.title}</h2>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>참여 인원: {room.currentUserCount}/{room.userCountMax}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChatRoomList;