import React from 'react';

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassContainer = ({ children, className = '' }: GlassContainerProps) => (
  <div className={`backdrop-blur-md bg-white/5 border border-white/10 rounded-xl ${className}`}>
    {children}
  </div>
);
