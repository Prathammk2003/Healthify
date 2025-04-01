import React from "react";
import { cn } from "@/lib/utils";

// Define button variants as a function to be used by other components
export function buttonVariants({ variant = 'default', size = 'default', className = "" }) {
  // Button variants
  const variants = {
    default: "bg-blue-600 !text-white hover:bg-blue-700 focus:ring-blue-500 btn-text-fix",
    outline: "bg-white !text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500 btn-text-dark-fix",
    ghost: "bg-transparent !text-gray-700 hover:bg-gray-100 focus:ring-gray-500 btn-text-dark-fix",
    destructive: "bg-red-600 !text-white hover:bg-red-700 focus:ring-red-500 btn-text-fix",
  };

  // Button sizes
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-8 py-1 px-3 text-sm",
    lg: "h-12 py-3 px-6 text-lg",
    icon: "h-10 w-10 p-2",
  };

  return cn(
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className
  );
}

export function Button({ children, variant = 'default', size = 'default', className = "", ...props }) {
  return (
    <button
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {children}
    </button>
  );
} 