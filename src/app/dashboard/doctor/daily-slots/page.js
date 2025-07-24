'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';

export default function DailyTimeSlots() {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  
  // For new slot creation
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [interval, setInterval] = useState(30);
  
  // For selected date info
  const [existingSlots, setExistingSlots] = useState([]);
  
  useEffect(() => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, []);
  
  useEffect(() => {
    if (date) {
      fetchSlotsForDate(date);
    }
  }, [date]);
  
  const fetchSlotsForDate = async (selectedDate) => {
    setIsFetchingSlots(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Not authenticated');
        setIsFetchingSlots(false);
        return;
      }
      
      const res = await fetch(`/api/doctors/slots/date?date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setExistingSlots(data.slots || []);
      } else {
        setMessage(data.error || 'Failed to fetch slots');
        setExistingSlots([]);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setMessage('Error fetching slots');
      setExistingSlots([]);
    } finally {
      setIsFetchingSlots(false);
    }
  };
  
  const generateTimeSlots = () => {
    if (!startTime || !endTime || !interval) {
      setMessage('Please fill in all fields');
      return;
    }
    
    // Convert times to minutes for calculation
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    if (startMinutes >= endMinutes) {
      setMessage('End time must be after start time');
      return;
    }
    
    // Generate time slots
    const generatedSlots = [];
    
    for (let minutes = startMinutes; minutes + interval <= endMinutes; minutes += interval) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      generatedSlots.push({
        time: timeString,
        duration: interval,
      });
    }
    
    setSlots(generatedSlots);
  };
  
  const handleCreateSlots = async () => {
    if (slots.length === 0) {
      setMessage('Please generate time slots first');
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Not authenticated');
        setIsLoading(false);
        return;
      }
      
      const res = await fetch('/api/doctors/slots/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date,
          slots,
          overrideExisting: false // By default, just add to existing slots
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage('Time slots created successfully!');
        // Reset generated slots
        setSlots([]);
        // Refresh existing slots
        fetchSlotsForDate(date);
      } else {
        setMessage(data.error || 'Failed to create time slots');
      }
    } catch (error) {
      console.error('Error creating slots:', error);
      setMessage('Error creating time slots');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteSlot = async (slotId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Not authenticated');
        return;
      }
      
      const res = await fetch(`/api/doctors/slots/${slotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage('Slot deleted successfully');
        // Update the UI by removing the deleted slot
        setExistingSlots(existingSlots.filter(slot => slot.id !== slotId));
      } else {
        setMessage(data.error || 'Failed to delete slot');
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
      setMessage('Error deleting slot');
    }
  };
  
  const formatTime = (time) => {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    
    return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Daily Time Slots</h1>
      
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Create Daily Time Slots</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                />
              </div>
              
              <div>
                <label className="block font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block font-medium text-gray-700 mb-2">Time Interval (minutes)</label>
              <select
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </div>
            
            <div className="pt-4">
              <Button
                type="button"
                onClick={generateTimeSlots}
                className="w-full"
              >
                Generate Time Slots
              </Button>
            </div>
            
            {slots.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-700 mb-2">Generated Time Slots</h3>
                <div className="border rounded-md p-4 bg-gray-50">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot, index) => (
                      <div key={index} className="bg-white p-2 text-center rounded border text-sm">
                        {formatTime(slot.time)}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={handleCreateSlots}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Creating...' : 'Create These Slots'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Existing Time Slots for {date}
          </h2>
          
          {isFetchingSlots ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading time slots...</p>
            </div>
          ) : existingSlots.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">No time slots found for this date</p>
              <p className="text-gray-500 text-sm mt-2">Generate slots using the form on the left</p>
            </div>
          ) : (
            <div>
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Duration
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {existingSlots.map((slot) => (
                      <tr key={slot.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(slot.time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {slot.duration} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium 
                            ${slot.isBooked 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-green-100 text-green-700'}`}
                          >
                            {slot.isBooked ? 'Booked' : 'Available'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {!slot.isBooked && (
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 