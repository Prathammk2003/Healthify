import React from 'react';

export function Tabs({ value, defaultValue, onValueChange, className = "", children, ...props }) {
  const [selectedTab, setSelectedTab] = React.useState(value || defaultValue);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedTab(value);
    }
  }, [value]);

  const handleTabChange = (newValue) => {
    if (value === undefined) {
      setSelectedTab(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  // Avoid passing custom props to DOM elements
  const { value: _, defaultValue: __, onValueChange: ___, ...domProps } = props;

  return (
    <div className={`space-y-4 ${className}`} {...domProps}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        
        return React.cloneElement(child, {
          selectedTab,
          onTabChange: handleTabChange,
        });
      })}
    </div>
  );
}

export function TabsList({ children, className = "", ...props }) {
  return (
    <div 
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-800 ${className}`} 
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ children, value, selectedTab, onTabChange, className = "", ...props }) {
  const isSelected = selectedTab === value;
  
  // Create click handler without passing the prop directly
  const handleClick = React.useCallback(() => {
    if (onTabChange) {
      onTabChange(value);
    }
  }, [onTabChange, value]);
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isSelected 
          ? "bg-white text-gray-900 shadow-sm" 
          : "text-gray-600 hover:text-gray-900"
      } ${className}`}
      role="tab"
      aria-selected={isSelected}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, value, selectedTab, className = "", ...props }) {
  if (selectedTab !== value) return null;
  
  return (
    <div
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-gray-800 ${className}`}
      role="tabpanel"
      {...props}
    >
      {children}
    </div>
  );
} 