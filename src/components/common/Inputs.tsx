import React from 'react';
import { cn } from '@/lib/utils';

interface WaveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  className?: string;
}

export const WaveInput: React.FC<WaveInputProps> = ({ label, className, ...props }) => {
  return (
    <div className={cn("wave-group", className)}>
      <input 
        required 
        autoComplete="off" 
        className="input" 
        placeholder=" "
        {...props} 
      />
      <span className="bar"></span>
      <label className="label">
        {label.split('').map((char, index) => (
          <span 
            key={index} 
            className="label-char" 
            style={{ '--index': index } as React.CSSProperties}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </label>
    </div>
  );
};
