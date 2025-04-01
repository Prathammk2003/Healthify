import React from "react";

export function Badge({ children, variant = 'default', className, ...props }) {
  const variantStyles = {
    default: 'bg-blue-500 text-white',
    outline: 'bg-gray-100 text-gray-800 border border-gray-300',
    destructive: 'bg-red-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant] || variantStyles.default} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  );
}
 