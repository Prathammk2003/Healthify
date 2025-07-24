import React from 'react';
import { cn } from '@/lib/utils';

const Alert = React.forwardRef(({ className, variant = "default", children, ...props }, ref) => {
  const variantClasses = {
    default: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive border-destructive/50 dark:border-destructive",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-400",
    success: "bg-green-100 text-green-800 border-green-400",
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));

AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));

AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription }; 