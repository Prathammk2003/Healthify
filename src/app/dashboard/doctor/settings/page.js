'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';

const weekdays = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export default function DoctorAvailability() {
  const [availability, setAvailability] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [slotDuration, setSlotDuration] = useState(30); // Default 30 minutes
  
  useEffect(() => {
    fetchDoctorAvailability();
  }, []);
  
  const fetchDoctorAvailability = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Not authenticated');
        setIsLoading(false);
        return;
      }
      
      const res = await fetch('/api/doctors/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (res.ok) {
        // Initialize availability with existing data or defaults
        const existingAvailability = data.doctor?.availability || [];
        
        // Make sure all weekdays are included
        const fullAvailability = weekdays.map(day => {
          const existing = existingAvailability.find(a => a.day.toLowerCase() === day);
          return existing || {
            day,
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: false
          };
        });
        
        setAvailability(fullAvailability);
      } else {
        setMessage(data.error || 'Failed to fetch doctor profile');
      }
    } catch (error) {
      setMessage('Error fetching doctor availability');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAvailabilityChange = (index, field, value) => {
    const updatedAvailability = [...availability];
    updatedAvailability[index] = {
      ...updatedAvailability[index],
      [field]: value
    };
    setAvailability(updatedAvailability);
  };
  
  const toggleDayAvailability = (index) => {
    const updatedAvailability = [...availability];
    updatedAvailability[index] = {
      ...updatedAvailability[index],
      isAvailable: !updatedAvailability[index].isAvailable
    };
    setAvailability(updatedAvailability);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Not authenticated');
        setIsLoading(false);
        return;
      }
      
      // Filter to only include available days
      const availabilityToSave = availability
        .filter(day => day.isAvailable)
        .map(({ day, startTime, endTime }) => ({ day, startTime, endTime }));
      
      const res = await fetch('/api/doctors/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          availability: availabilityToSave,
          slotDuration
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage('Availability updated successfully!');
      } else {
        setMessage(data.error || 'Failed to update availability');
      }
    } catch (error) {
      setMessage('Error updating availability');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatTime = (time) => {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    
    return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  };
  
  if (isLoading && availability.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Availability Settings</h1>
        <div className="text-center py-10">
          <p className="text-gray-500">Loading your availability settings...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Availability Settings</h1>
      
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}
      
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium">Set Your Weekly Availability</h2>
          <p className="text-sm text-gray-600 mt-1">
            Define the days and hours you're available for appointments. Your settings will be used to generate available time slots.
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="mb-6">
              <label className="block font-medium text-gray-700 mb-2">
                Appointment Duration (minutes)
              </label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                This will be the default duration for all of your appointment slots.
              </p>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {availability.map((day, index) => (
                    <tr key={day.day} className={!day.isAvailable ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {day.day}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={day.isAvailable}
                            onChange={() => toggleDayAvailability(index)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={(e) => handleAvailabilityChange(index, 'startTime', e.target.value)}
                          disabled={!day.isAvailable}
                          className={`border rounded p-2 ${!day.isAvailable ? 'bg-gray-100 text-gray-500' : ''}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={(e) => handleAvailabilityChange(index, 'endTime', e.target.value)}
                          disabled={!day.isAvailable}
                          className={`border rounded p-2 ${!day.isAvailable ? 'bg-gray-100 text-gray-500' : ''}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                {isLoading ? 'Saving...' : 'Save Availability'}
              </Button>
            </div>
          </div>
        </form>
      </div>
      
      <div className="mt-8 p-6 bg-white shadow-sm rounded-lg border border-gray-200">
        <h2 className="text-lg font-medium mb-4">Time Slots Preview</h2>
        <p className="text-sm text-gray-600 mb-4">
          Based on your settings, appointment slots will be created with {slotDuration} minute durations during these hours:
        </p>
        
        <div className="space-y-2">
          {availability
            .filter(day => day.isAvailable)
            .map(day => {
              // Calculate number of slots
              const startTime = day.startTime.split(':').map(Number);
              const endTime = day.endTime.split(':').map(Number);
              
              const startMinutes = startTime[0] * 60 + startTime[1];
              const endMinutes = endTime[0] * 60 + endTime[1];
              const totalMinutes = endMinutes - startMinutes;
              const numSlots = Math.floor(totalMinutes / slotDuration);
              
              return (
                <div key={day.day} className="p-4 border rounded-md">
                  <h3 className="font-medium capitalize mb-2">{day.day}</h3>
                  <p>
                    {formatTime(day.startTime)} to {formatTime(day.endTime)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {numSlots} slots of {slotDuration} minutes each
                  </p>
                </div>
              );
            })}
            
          {availability.filter(day => day.isAvailable).length === 0 && (
            <p className="text-gray-500 italic">
              No days set as available. Please enable at least one day.
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 