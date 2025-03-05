// src/components/CreateChatRoom.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatService from '../services/ChatService';

const CreateChatRoom = () => {
    const [title, setTitle] = useState('');
    const [userCountMax, setUserCountMax] = useState(10);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors = {};

        if (!title.trim()) {
            newErrors.title = '채팅방 제목을 입력해주세요.';
        } else if (title.trim().length < 2) {
            newErrors.title = '채팅방 제목은 최소 2자 이상이어야 합니다.';
        } else if (title.trim().length > 20) {
            newErrors.title = '채팅방 제목은 최대 20자까지 가능합니다.';
        }

        if (!userCountMax) {
            newErrors.userCountMax = '최대 인원 수를 입력해주세요.';
        } else if (userCountMax < 2) {
            newErrors.userCountMax = '최대 인원 수는 최소 2명 이상이어야 합니다.';
        } else if (userCountMax > 100) {
            newErrors.userCountMax = '최대 인원 수는 100명까지 가능합니다.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // CreateChatRoom.jsx의 handleSubmit 함수 수정
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            console.log('Creating room with:', { title, userCountMax });
            const response = await ChatService.createRoom(title, userCountMax);
            console.log('Create room response:', response);

            // 서버 응답 확인 간소화
            if (response && !response.errorCode) {
                alert('채팅방이 성공적으로 생성되었습니다.');

                // React Router의 navigate 사용하고 새로고침 시켜서
                // 목록을 다시 불러오도록 함
                navigate('/chat-rooms', { replace: true });
                window.location.reload(); // 강제 새로고침
            } else {
                alert(response.message || '채팅방 생성에 실패했습니다.');
            }
        } catch (err) {
            console.error('Error creating room:', err);
            alert(err.message || '채팅방 생성에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-md">
            <h1 className="text-2xl font-bold mb-6">새 채팅방 만들기</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-gray-700 mb-2" htmlFor="title">
                        채팅방 이름
                    </label>
                    <input
                        id="title"
                        type="text"
                        className={`w-full p-2 border rounded ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="채팅방 이름을 입력하세요"
                        minLength={2}
                        maxLength={20}
                    />
                    {errors.title && (
                        <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                    )}
                </div>

                <div>
                    <label className="block text-gray-700 mb-2" htmlFor="userCountMax">
                        최대 인원 수
                    </label>
                    <input
                        id="userCountMax"
                        type="number"
                        className={`w-full p-2 border rounded ${errors.userCountMax ? 'border-red-500' : 'border-gray-300'}`}
                        value={userCountMax}
                        onChange={(e) => setUserCountMax(parseInt(e.target.value) || '')}
                        min={2}
                        max={100}
                    />
                    {errors.userCountMax && (
                        <p className="text-red-500 text-sm mt-1">{errors.userCountMax}</p>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700"
                        onClick={() => navigate('/chat-rooms')}
                        disabled={loading}
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        disabled={loading}
                    >
                        {loading ? '생성 중...' : '생성하기'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateChatRoom;