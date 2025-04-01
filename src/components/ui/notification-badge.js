'use client';

import { useState, useEffect } from 'react';

export function NotificationBadge({ userId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchNotificationCount() {
      try {
        const token = localStorage.getItem('token');
        if (!token || !userId) return;

        const response = await fetch(`/api/notifications/count?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    }

    fetchNotificationCount();
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotificationCount, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  if (count === 0) return null;

  return (
    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </div>
  );
} 