import React from 'react';

export function Table({ className, ...props }) {
  return (
    <table 
      className={`w-full caption-bottom text-sm text-gray-800 ${className || ''}`}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }) {
  return (
    <thead 
      className={`[&_tr]:border-b ${className || ''}`}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }) {
  return (
    <tbody 
      className={`[&_tr:last-child]:border-0 ${className || ''}`}
      {...props}
    />
  );
}

export function TableFooter({ className, ...props }) {
  return (
    <tfoot
      className={`border-t bg-gray-100/50 font-medium text-gray-700 ${className || ''}`}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={`border-b transition-colors hover:bg-gray-100/50 data-[state=selected]:bg-gray-100 ${className || ''}`}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={`h-12 px-4 text-left align-middle font-medium text-gray-700 [&:has([role=checkbox])]:pr-0 ${className || ''}`}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td
      className={`p-4 align-middle text-gray-800 [&:has([role=checkbox])]:pr-0 ${className || ''}`}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }) {
  return (
    <caption
      className={`mt-4 text-sm text-gray-600 ${className || ''}`}
      {...props}
    />
  );
} 