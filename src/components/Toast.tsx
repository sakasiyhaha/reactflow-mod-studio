// src/components/Toast.tsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'error';
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onClose: (id: number) => void;
}

function ToastItem({ message, onClose }: { message: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeClass = {
    info: 'toast-info',
    warning: 'toast-warning',
    error: 'toast-error',
  }[message.type];

  return (
    <div className={`toast-item ${typeClass}`}>
      <span>{message.message}</span>
      <button onClick={onClose}>✕</button>
    </div>
  );
}

export default function ToastContainer({ messages, onClose }: ToastContainerProps) {
  return createPortal(
    <div className="toast-container">
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onClose={() => onClose(msg.id)} />
      ))}
    </div>,
    document.body
  );
}