import React, { useEffect, useRef } from "react";

const notifications = [
  { id: 1, message: "🚀 새로운 시즌 '겨울'이 시작되었습니다! 랭킹 경쟁을 준비하세요!", time: "1초전" },
  { id: 2, message: "🔥 홍길동님의 연속 커밋이 10일째 이어지고 있습니다!", time: "어제" },
  { id: 3, message: "😢 홍길동님의 연속 커밋 기록이 끊겼습니다. 다음번엔 더 오래 유지해봐요!", time: "2025.02.10" },
  { id: 4, message: "🎉 홍길동님이 '새싹' 업적을 달성했습니다!", time: "2025.02.01" },
];

const NotificationModal = ({ onClose }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose(); // 모달 바깥 클릭 시 닫기
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div ref={modalRef} className="notification-modal">
      <div className="modal-content">
        <div className="notification-list">
          {notifications.map((notif, index) => (
            <div key={notif.id} className="notification-item">
              <div>
                <p>{notif.message}</p>
                <span>{notif.time}</span>
              </div>
            </div>
          ))}
          <div className="noti-more">더보기</div>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;