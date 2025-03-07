import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatService from '../services/ChatService';
import './ChatStyles.css';

const CreateChatRoom = () => {
    const [title, setTitle] = useState('');
    const [userCountMax, setUserCountMax] = useState(10);
    const [password, setPassword] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
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

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            // 파일 정보 로깅
            console.log('Selected file:', {
                name: selectedFile.name,
                type: selectedFile.type,
                size: selectedFile.size
            });

            // 파일 크기 검사 (5MB)
            if (selectedFile.size > 5 * 1024 * 1024) {
                setErrors({ ...errors, file: '파일 크기는 5MB를 초과할 수 없습니다.' });
                return;
            }
            
            // 이미지 파일 타입 검사
            if (!selectedFile.type.startsWith('image/')) {
                setErrors({ ...errors, file: '이미지 파일만 업로드 가능합니다.' });
                return;
            }

            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setErrors({ ...errors, file: null });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            console.log('Submitting form with file:', file);
            const response = await ChatService.createRoom(title, userCountMax, file);
            
            if (response && !response.errorCode) {
                alert('채팅방이 성공적으로 생성되었습니다.');
                localStorage.setItem('chatRoomChanged', Date.now().toString());
                navigate('/chat-rooms', { replace: true });
            } else {
                alert(response.message || '채팅방 생성에 실패했습니다.');
            }
        } catch (err) {
            console.error('Error in handleSubmit:', err);
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

                        <div className="form-group">
                            <label className="form-label">채팅방 이미지</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="form-control"
                            />
                            {errors.file && <p className="error-message">{errors.file}</p>}
                            {previewUrl && (
                                <div className="image-preview">
                                    <img 
                                        src={previewUrl} 
                                        alt="미리보기" 
                                        style={{ maxWidth: '200px', maxHeight: '200px' }}
                                    />
                                </div>
                            )}
                        </div>

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