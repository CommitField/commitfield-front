import React, { useEffect, useRef } from "react";

const NotificationModal = ({ notifications, onClose }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
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
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div key={notif.id} className="notification-item">
                <p>{notif.message}</p>
                <span>{notif.createdAt}</span>
              </div>
            ))
          ) : (
            <div className="no-notifications">새로운 알림이 없습니다.</div>
          )}
          {notifications.length > 3 && <div className="noti-more">더보기</div>}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
