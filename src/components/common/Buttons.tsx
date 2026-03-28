import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
}

/**
 * 1. 退出登录按钮 (红圆扩展)
 */
export const LogoutButton: React.FC<ButtonProps> = ({ className, ...props }) => {
  return (
    <button className={cn("btn-logout-uiverse", className)} {...props}>
      <div className="sign">
        <svg viewBox="0 0 512 512">
          <path d="M377.9 105.9L469.1 197.1c12.5 12.5 12.5 32.8 0 45.3l-91.2 91.2c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L369.4 256H192c-17.7 0-32-14.3-32-32s14.3-32 32-32h177.4l-36.7-36.7c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0zM160 96c17.7 0 32 14.3 32 32s-14.3 32-32 32H96v224h64c17.7 0 32 14.3 32 32s-14.3 32-32 32H96c-35.3 0-64-28.7-64-64V160c0-35.3 28.7-64 64-64h64z"></path>
        </svg>
      </div>
      <div className="btn-text">退出登录</div>
    </button>
  );
};

/**
 * 2. 删除按钮 (红矩形带图标扩展)
 */
export const DeleteButton: React.FC<ButtonProps & { text?: string }> = ({ className, text = "删 除", ...props }) => {
  return (
    <button className={cn("btn-delete-uiverse", className)} {...props}>
      <p className="btn-text">{text}</p>
      <span className="icon">
        <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
          <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
        </svg>
      </span>
    </button>
  );
};

/**
 * 3. 通用 3D 按钮
 */
interface ThemeButtonProps extends ButtonProps {
  variant?: 'amber' | 'red' | 'gray';
}

export const ThemeButton: React.FC<ThemeButtonProps> = ({ 
  children, 
  variant = 'amber', 
  className, 
  ...props 
}) => {
  const variantClass = variant === 'amber' ? 'btn-3d-amber' : variant === 'red' ? 'btn-3d-red' : 'btn-3d-gray';
  
  return (
    <button 
      className={cn("btn-3d-uiverse", variantClass, className)} 
      {...props}
    >
      <span className="button_top">
        {children}
      </span>
    </button>
  );
};

/**
 * 4. 状态切换开关 (Uiverse 风格)
 */
interface StatusToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const StatusToggle: React.FC<StatusToggleProps> = ({ checked, onChange, disabled, className = "" }) => {
  const id = React.useId();
  return (
    <div className={cn("btn-toggle-container", className)}>
      <input 
        id={id}
        type="checkbox" 
        className="btn-toggle-input" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <label htmlFor={id} className="btn-toggle-switch">
        <span className="btn-toggle-slider"></span>
      </label>
    </div>
  );
};

/**
 * 5. 返回按钮 (3D 灰色风格)
 */
export const BackButton: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => {
  return (
    <ThemeButton variant="gray" onClick={onClick} className={cn("!p-0", className)}>
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        <span className="text-[13px]">返回清单</span>
      </div>
    </ThemeButton>
  );
};

/**
 * 6. 刷新按钮 (带旋转动画)
 */
export const RefreshButton: React.FC<ButtonProps> = ({ children, className, ...props }) => {
  return (
    <button className={cn("btn-refresh-uiverse", className)} {...props}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-90 transition-transform">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 16h5v5"/>
      </svg>
      {children || '刷新'}
    </button>
  );
};
