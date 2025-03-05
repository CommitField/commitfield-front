import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatService from '../services/ChatService';
import './ChatStyles.css';

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

    // 개선된 handleSubmit 함수 - 강제 새로고침 제거
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

            if (response && !response.errorCode) {
                // 성공 메시지 표시
                alert('채팅방이 성공적으로 생성되었습니다.');
                
                // 강제 새로고침 대신 상태 관리 통해 업데이트되도록 함
                // localStorage를 사용하여 상태 갱신 트리거
                localStorage.setItem('chatRoomCreated', Date.now().toString());
                
                // 채팅방 목록으로 이동
                navigate('/chat-rooms', { replace: true });
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
        <div className="chat-layout">
            {/* 사이드바는 상위 컴포넌트에서 렌더링한다고 가정 */}
            
            <div className="chat-window">
                <div className="chat-header">
                    <div className="room-title">새 채팅방 만들기</div>
                    <button 
                        className="action-btn"
                        onClick={() => navigate('/chat-rooms')}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div className="create-room-form">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="title">채팅방 이름</label>
                            <input
                                id="title"
                                type="text"
                                className={errors.title ? 'error' : ''}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="채팅방 이름을 입력하세요"
                                minLength={2}
                                maxLength={20}
                            />
                            {errors.title && (
                                <p className="error-message">{errors.title}</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="userCountMax">최대 인원 수</label>
                            <input
                                id="userCountMax"
                                type="number"
                                className={errors.userCountMax ? 'error' : ''}
                                value={userCountMax}
                                onChange={(e) => setUserCountMax(parseInt(e.target.value) || '')}
                                min={2}
                                max={100}
                            />
                            {errors.userCountMax && (
                                <p className="error-message">{errors.userCountMax}</p>
                            )}
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/chat-rooms')}
                                disabled={loading}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? '생성 중...' : '생성하기'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateChatRoom;