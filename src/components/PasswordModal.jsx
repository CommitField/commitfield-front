import { useState, useEffect } from 'react';
import './ChatStyles.css';

const PasswordModal = ({ onSubmit, onCancel, roomTitle, error: externalError }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 외부에서 오는 오류 메시지 적용
    useEffect(() => {
        if (externalError) {
            setError(externalError);
            setLoading(false);
        }
    }, [externalError]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!password.trim()) {
            setError('비밀번호를 입력해주세요.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 부모 컴포넌트에서 제공된 onSubmit 함수 호출
            await onSubmit(password);
            // 성공 시에는 부모 컴포넌트에서 모달을 닫음
        } catch (err) {
            // 오류는 외부 오류로 처리하므로 여기서는 별도로 처리하지 않음
            // 오류 발생 시에도 부모 컴포넌트에서 loading 상태를 관리
        }
    };

    // ESC 키 누를 때 모달 닫기
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };

        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onCancel]);

    // 모달 외부 클릭 시 닫기
    const handleOutsideClick = (e) => {
        if (e.target.className === 'password-modal-container') {
            onCancel();
        }
    };

    return (
        <div className="password-modal-container" onClick={handleOutsideClick}>
            <div className="password-modal">
                <div className="password-modal-header">
                    <h2>비밀번호 입력</h2>
                    <button
                        className="close-btn"
                        onClick={onCancel}
                        aria-label="닫기"
                    >
                        ×
                    </button>
                </div>

                <div className="password-modal-content">
                    <p className="room-info">"{roomTitle}" 채팅방은 비밀번호로 보호되어 있습니다.</p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="room-password">비밀번호</label>
                            <input
                                id="room-password"
                                type="password"
                                className={`form-control ${error ? 'error' : ''}`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="채팅방 비밀번호를 입력하세요"
                                autoFocus
                                disabled={loading}
                            />
                            {error && (
                                <p className="error-message">{error}</p>
                            )}
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-cancel"
                                onClick={onCancel}
                                disabled={loading}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        확인 중...
                                    </>
                                ) : '입장하기'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PasswordModal;