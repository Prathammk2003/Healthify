'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Mail, Calendar, Pill, CheckCircle, XCircle, Clock, Filter, Brain } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const getIconForType = (type) => {
  switch (type) {
    case 'medication':
    case 'refill':
      return Pill;
    case 'appointment':
      return Calendar;
    case 'result':
    case 'healthTip':
      return Bell;
    case 'email':
      return Mail;
    case 'mentalHealth':
      return Brain;
    default:
      return Bell;
  }
};

const getColorForType = (type) => {
  switch (type) {
    case 'medication':
    case 'refill':
      return 'from-green-500 to-emerald-500';
    case 'appointment':
      return 'from-blue-500 to-cyan-500';
    case 'result':
      return 'from-yellow-500 to-orange-500';
    case 'healthTip':
      return 'from-purple-500 to-indigo-500';
    case 'email':
      return 'from-red-500 to-pink-500';
    default:
      return 'from-gray-500 to-slate-500';
  }
};

export default function NotificationsPage() {
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [mentalHealthReminder, setMentalHealthReminder] = useState(null);

  // Check if user has completed today's mental health check-in
  useEffect(() => {
    const checkMentalHealthCheckIn = async () => {
      if (!userId) return;

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`/api/mentalhealth/progress?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();

          // Check if the latest entry is from today
          if (data && data.length > 0) {
            const latestEntry = data[0];
            const entryDate = new Date(latestEntry.timestamp);
            const today = new Date();

            // Check if entry is from today
            const isToday = entryDate.getDate() === today.getDate() &&
              entryDate.getMonth() === today.getMonth() &&
              entryDate.getFullYear() === today.getFullYear();

            if (!isToday) {
              // Create a reminder notification
              setMentalHealthReminder({
                id: 'mental-health-reminder',
                title: 'Daily Mental Health Check-in',
                message: 'Take a moment to track your mental wellbeing today. It only takes 2 minutes!',
                type: 'mentalHealth',
                timestamp: new Date(),
                read: false,
                icon: Bell,
                color: 'from-pink-500 to-rose-500',
                actionLink: '/dashboard/mental-health'
              });
            } else {
              setMentalHealthReminder(null);
            }
          } else {
            // No entries at all, show reminder
            setMentalHealthReminder({
              id: 'mental-health-reminder',
              title: 'Start Your Mental Health Journey',
              message: 'Complete your first mental health check-in and start tracking your wellbeing!',
              type: 'mentalHealth',
              timestamp: new Date(),
              read: false,
              icon: Bell,
              color: 'from-pink-500 to-rose-500',
              actionLink: '/dashboard/mental-health'
            });
          }
        }
      } catch (error) {
        console.error('Error checking mental health status:', error);
      }
    };

    checkMentalHealthCheckIn();
  }, [userId]);

  // Fetch notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId) return;

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        const response = await fetch(`/api/notifications`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }

        const data = await response.json();

        // Convert API response to the format expected by the UI
        const formattedNotifications = data.notifications.map(notification => {
          // Determine the title based on type if not explicitly provided
          let defaultTitle = 'Notification';
          switch (notification.type) {
            case 'medication': defaultTitle = 'Medication Reminder'; break;
            case 'appointment': defaultTitle = 'Appointment Reminder'; break;
            case 'healthTip': defaultTitle = 'Health Tip'; break;
            case 'result': defaultTitle = 'Lab Result Ready'; break;
            case 'refill': defaultTitle = 'Medication Refill'; break;
            case 'mentalHealth': defaultTitle = 'Mental Health Check-in'; break;
          }

          return {
            id: notification._id,
            title: notification.title || defaultTitle,
            message: notification.message || notification.messageContent || 'No details provided',
            type: notification.type,
            timestamp: new Date(notification.createdAt),
            read: notification.status === 'read' || notification.read === true,
            icon: getIconForType(notification.type),
            color: getColorForType(notification.type)
          };
        });

        setNotifications(formattedNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);

        // Fallback to mock data if API fails
        const mockNotifications = [
          {
            id: 1,
            title: 'Medication Reminder',
            message: 'Time to take your Metformin 500mg',
            type: 'medication',
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            read: false,
            icon: Pill,
            color: 'from-green-500 to-emerald-500'
          },
          {
            id: 2,
            title: 'Appointment Reminder',
            message: 'Your cardiology appointment is tomorrow at 10:30 AM',
            type: 'appointment',
            timestamp: new Date(Date.now() - 7200000), // 2 hours ago
            read: false,
            icon: Calendar,
            color: 'from-blue-500 to-cyan-500'
          },
          {
            id: 3,
            title: 'Health Tip',
            message: 'Did you know? Regular exercise can reduce risk of heart disease by up to 35%',
            type: 'tip',
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            read: true,
            icon: Bell,
            color: 'from-purple-500 to-indigo-500'
          },
          {
            id: 4,
            title: 'Lab Results Ready',
            message: 'Your cholesterol test results are now available in your medical records',
            type: 'result',
            timestamp: new Date(Date.now() - 172800000), // 2 days ago
            read: true,
            icon: Mail,
            color: 'from-yellow-500 to-orange-500'
          },
          {
            id: 5,
            title: 'Medication Refill Reminder',
            message: 'Your prescription for Lisinopril is running low. Please refill soon.',
            type: 'refill',
            timestamp: new Date(Date.now() - 259200000), // 3 days ago
            read: true,
            icon: Pill,
            color: 'from-red-500 to-pink-500'
          }
        ];

        setNotifications(mockNotifications);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userId]);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationId: id })
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);

      // Fallback: update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ all: true })
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);

      // Fallback: update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  // Prepend mental health reminder if it exists and filter allows it
  const allNotifications = mentalHealthReminder && (filter === 'all' || filter === 'unread')
    ? [mentalHealthReminder, ...filteredNotifications]
    : filteredNotifications;

  const unreadCount = notifications.filter(n => !n.read).length + (mentalHealthReminder ? 1 : 0);

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card-3d p-8">
            <div className="animate-pulse flex flex-col space-y-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="glass-card-3d p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Stay updated with your health reminders and important alerts
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{unreadCount} unread</span>
              </div>

              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
              >
                Mark All Read
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="glass-card-3d p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Filter:</span>
            <div className="flex space-x-2">
              {['all', 'unread', 'read'].map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${filter === filterType
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-600/50'
                    }`}
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {allNotifications.length === 0 ? (
            <div className="glass-card-3d p-12 text-center">
              <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No notifications
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                You're all caught up! Check back later for new updates.
              </p>
            </div>
          ) : (
            allNotifications.map((notification) => {
              const IconComponent = notification.icon;
              const NotificationCard = (
                <div
                  key={notification.id}
                  className={`glass-card-3d p-6 transition-all duration-300 hover-lift ${!notification.read ? 'ring-2 ring-blue-500/30' : ''
                    } ${notification.actionLink ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Icon with gradient background */}
                    <div className={`p-3 rounded-full bg-gradient-to-r ${notification.color}`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`font-semibold text-lg ${notification.read
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-900 dark:text-white'
                            }`}>
                            {notification.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                        </div>

                        {!notification.read && !notification.actionLink && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="ml-4 p-1 text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                            title="Mark as read"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{formatTimeAgo(notification.timestamp)}</span>
                        {!notification.read && (
                          <span className="ml-4 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                            Unread
                          </span>
                        )}
                        {notification.actionLink && (
                          <span className="ml-auto text-pink-600 dark:text-pink-400 font-medium hover:underline">
                            Take Action →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );

              return notification.actionLink ? (
                <Link key={notification.id} href={notification.actionLink}>
                  {NotificationCard}
                </Link>
              ) : (
                NotificationCard
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}