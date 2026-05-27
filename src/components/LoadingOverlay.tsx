// src/components/LoadingOverlay.tsx
import React from 'react';
import { createPortal } from 'react-dom';

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, text = '加载中...' }) => {
  if (!visible) return null;
  return createPortal(
    <div className="loading-overlay">
      <div className="loading-spinner" />
      <div className="loading-text">{text}</div>
    </div>,
    document.body
  );
};

export default LoadingOverlay;