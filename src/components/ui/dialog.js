import React from 'react';

export function Dialog({ children, open, onOpenChange }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative">
        {children}
      </div>
      {onOpenChange && (
        <div 
          className="absolute inset-0" 
          onClick={() => onOpenChange(false)}
        />
      )}
    </div>
  );
}

export function DialogTrigger({ children, onClick }) {
  return (
    <div onClick={onClick} className="cursor-pointer">
      {children}
    </div>
  );
}

export function DialogContent({ children, className, ...props }) {
  return (
    <div 
      className={`fixed z-50 w-full max-w-lg overflow-hidden rounded-lg bg-white p-6 shadow-lg sm:max-w-lg text-gray-800 ${className || ''}`}
      onClick={e => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return (
    <div
      className={`mb-4 flex flex-col space-y-1.5 text-center sm:text-left text-gray-800 ${className || ''}`}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={`mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className || ''}`}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }) {
  return (
    <h3
      className={`text-lg font-semibold leading-none tracking-tight text-gray-900 ${className || ''}`}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }) {
  return (
    <p
      className={`text-sm text-gray-600 ${className || ''}`}
      {...props}
    />
  );
} 