// src/components/Toast.tsx
import { useEffect, useState } from 'react';
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

  const bgColor = {
    info: '#3B82F6',
    warning: '#F59E0B',
    error: '#EF4444',
  }[message.type];

  return (
    <div
      style={{
        background: bgColor,
        color: 'white',
        padding: '12px 20px',
        borderRadius: 8,
        marginBottom: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minWidth: 250,
        maxWidth: 350,
      }}
    >
      <span>{message.message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          marginLeft: 12,
          fontSize: 16,
          opacity: 0.8,
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default function ToastContainer({ messages, onClose }: ToastContainerProps) {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        {messages.map((msg) => (
          <ToastItem key={msg.id} message={msg} onClose={() => onClose(msg.id)} />
        ))}
      </div>
    </div>,
    document.body
  );
}