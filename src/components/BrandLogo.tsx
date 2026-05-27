// src/components/BrandLogo.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSitemap } from '@fortawesome/free-solid-svg-icons';

const BrandLogo: React.FC = () => {
  return (
    <div className="brand-logo">
      <FontAwesomeIcon icon={faSitemap} className="brand-logo-icon" />
      <span className="brand-logo-text">NodeFlow<span style={{ fontWeight: 400 }}>Pro</span></span>
    </div>
  );
};

export default BrandLogo;