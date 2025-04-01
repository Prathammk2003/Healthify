"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Loader from "@/components/Loader";
import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { Bell, Calendar, PillIcon, Lightbulb, AlertTriangle, RefreshCw, Filter } from "lucide-react";

export default function NotificationsPage() {
  const { isAuthenticated, userId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchNotifications() {
      if (!isAuthenticated || !userId) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/notifications?showAll=${showAll}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }
        
        const data = await response.json();
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNotifications();
  }, [isAuthenticated, userId, showAll, refreshKey]);

  const refreshNotifications = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true;
    return notification.type === activeTab;
  });

  // Get counts for each type
  const getCounts = () => {
    const counts = {
      all: notifications.length,
      medication: notifications.filter(n => n.type === "medication").length,
      appointment: notifications.filter(n => n.type === "appointment").length,
      healthTip: notifications.filter(n => n.type === "healthTip").length
    };
    return counts;
  };
  
  const counts = getCounts();

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "appointment":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case "medication":
        return <PillIcon className="h-5 w-5 text-green-500" />;
      case "healthTip":
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get badge color based on notification status
  const getStatusBadge = (status) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500">Sent</Badge>;
      case "failed":
        return <Badge className="bg-red-500">Failed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  // Get channel icon and label
  const getChannelInfo = (channel) => {
    switch (channel) {
      case "sms":
        return { label: "SMS", className: "bg-purple-100 text-purple-800" };
      case "email":
        return { label: "Email", className: "bg-blue-100 text-blue-800" };
      case "push":
        return { label: "Push", className: "bg-orange-100 text-orange-800" };
      case "app":
        return { label: "In-App", className: "bg-green-100 text-green-800" };
      default:
        return { label: channel, className: "bg-gray-100 text-gray-800" };
    }
  };

  // Format notification time
  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "Unknown time";
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <AlertTriangle className="h-16 w-16 text-yellow-500" />
        <h2 className="mt-6 text-2xl font-bold">Authentication Required</h2>
        <p className="mt-2 text-gray-600">Please sign in to view your notifications.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <AlertTriangle className="h-16 w-16 text-red-500" />
        <h2 className="mt-6 text-2xl font-bold">Error Loading Notifications</h2>
        <p className="mt-2 text-gray-600">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="mr-3 h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setShowAll(!showAll)} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            {showAll ? "Show Relevant Only" : "Show All"}
          </Button>
          <Button 
            onClick={refreshNotifications} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-8 grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="appointment">Appointments ({counts.appointment})</TabsTrigger>
          <TabsTrigger value="medication">Medications ({counts.medication})</TabsTrigger>
          <TabsTrigger value="healthTip">Health Tips ({counts.healthTip})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-xl font-medium text-gray-600">No notifications found</h3>
              <p className="mt-2 text-center text-gray-500">
                You don't have any {activeTab !== "all" ? activeTab : ""} notifications {!showAll && "requiring attention"}.
              </p>
              {!showAll && (
                <Button 
                  onClick={() => setShowAll(true)} 
                  variant="outline" 
                  className="mt-4"
                >
                  Show All Notifications
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredNotifications.map((notification) => {
                const channelInfo = getChannelInfo(notification.channel);
                
                return (
                  <Card key={notification._id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getNotificationIcon(notification.type)}
                          <CardTitle className="ml-2 text-lg">
                            {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                          </CardTitle>
                        </div>
                        {getStatusBadge(notification.status)}
                      </div>
                      <CardDescription className="mt-2 text-xs">
                        {formatTime(notification.createdAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">{notification.messageContent}</p>
                    </CardContent>
                    <CardFooter className="border-t bg-gray-50 px-4 py-2">
                      <div className="flex w-full items-center justify-between">
                        <Badge variant="outline" className={`${channelInfo.className} text-xs`}>
                          {channelInfo.label}
                        </Badge>
                        {notification.metadata && notification.metadata.important && (
                          <Badge className="bg-red-500">Important</Badge>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 