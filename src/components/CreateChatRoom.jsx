import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatService from '../services/ChatService';
import './ChatStyles.css';

const CreateChatRoom = () => {
    const [title, setTitle] = useState('');
    const [userCountMax, setUserCountMax] = useState(10);
    const [password, setPassword] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    // ESC 키 누를 때 닫기
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                navigate('/chat-rooms');
            }
        };

        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [navigate]);

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

        // 비공개방이면 비밀번호 검증
        if (isPrivate) {
            if (!password) {
                newErrors.password = '비밀번호를 입력해주세요.';
            } else if (password.length < 4) {
                newErrors.password = '비밀번호는 최소 4자 이상이어야 합니다.';
            } else if (password.length > 20) {
                newErrors.password = '비밀번호는 최대 20자까지 가능합니다.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            // 비공개방이 아니면 비밀번호 없이 전송
            const roomData = {
                title,
                userCountMax,
                ...(isPrivate && { password })
            };

            console.log('Creating room with:', roomData);
            const response = await ChatService.createRoom(roomData.title, roomData.userCountMax, roomData.password);
            console.log('Create room response:', response);

            if (response && !response.errorCode) {
                // 성공 메시지 표시
                alert('채팅방이 성공적으로 생성되었습니다.');

                // 로컬 스토리지를 사용하여 상태 갱신 트리거
                localStorage.setItem('chatRoomChanged', Date.now().toString());

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
        <div className="create-room-container">
            <div className="create-room-modal">
                <div className="create-room-header">
                    <h2>새 채팅방 만들기</h2>
                    <button
                        className="close-btn"
                        onClick={() => navigate('/chat-rooms')}
                        aria-label="닫기"
                    >
                        ×
                    </button>
                </div>

                <div className="create-room-form">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="title">채팅방 이름</label>
                            <input
                                id="title"
                                type="text"
                                className="form-control"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="채팅방 이름을 입력하세요"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="userCountMax">최대 인원 수</label>
                            <input
                                id="userCountMax"
                                type="number"
                                className={`form-control ${errors.userCountMax ? 'error' : ''}`}
                                value={userCountMax}
                                onChange={(e) => setUserCountMax(parseInt(e.target.value) || '')}
                                min={2}
                                max={100}
                            />
                            {errors.userCountMax && (
                                <p className="error-message">{errors.userCountMax}</p>
                            )}
                        </div>

                        <div className="checkbox-wrapper">
                            <input
                                id="isPrivate"
                                type="checkbox"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                            />
                            <label htmlFor="isPrivate" className="checkbox-label">비공개 채팅방</label>
                        </div>

                        {isPrivate && (
                            <div className="form-group">
                                <label className="form-label" htmlFor="password">비밀번호</label>
                                <input
                                    id="password"
                                    type="password"
                                    className={`form-control ${errors.password ? 'error' : ''}`}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="채팅방 비밀번호를 입력하세요"
                                    minLength={4}
                                    maxLength={20}
                                />
                                {errors.password && (
                                    <p className="error-message">{errors.password}</p>
                                )}
                            </div>
                        )}

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-cancel"
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
                                {loading ? '생성 중...' : '채팅방 생성'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateChatRoom;