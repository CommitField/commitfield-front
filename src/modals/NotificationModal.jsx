import React from 'react';

const NotificationModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">알림</h2>
        </div>
        <div className="space-y-4">
          <div className="border-b pb-2">
            <p className="font-medium">새로운 커밋이 추가되었습니다</p>
            <p className="text-sm text-gray-500">방금 전</p>
          </div>
          <div className="border-b pb-2">
            <p className="font-medium">일일 커밋 목표를 달성했습니다!</p>
            <p className="text-sm text-gray-500">3시간 전</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;