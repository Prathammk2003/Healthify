'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { User, Mail, Key, AlertCircle, Phone, MapPin, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { isAuthenticated, userId } = useAuth();
  const [profile, setProfile] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated || !userId) return;

      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Fetch user account info
        const response = await fetch('/api/user-profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setProfile(data);
        
        // Fetch detailed user profile (including contact number)
        const profileResponse = await fetch(`/api/user-profile/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUserProfile(profileData.profile);
        } else if (profileResponse.status === 404) {
          // Profile not found, create a default one
          console.log('Profile not found, creating default profile');
          await createDefaultProfile(token);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    const createDefaultProfile = async (token) => {
      try {
        const defaultProfile = {
          firstName: profile?.name?.split(' ')[0] || 'First',
          lastName: profile?.name?.split(' ')[1] || 'Last',
          dateOfBirth: new Date('1990-01-01').toISOString().split('T')[0],
          contactNumber: '1234567890',
          address: 'Default Address',
          medicalHistory: []
        };

        const response = await fetch(`/api/user-profile/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(defaultProfile)
        });

        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.profile);
          setSuccessMessage('Default profile created. Please update your information.');
        } else {
          throw new Error('Failed to create default profile');
        }
      } catch (error) {
        console.error('Error creating default profile:', error);
        setError('Failed to create default profile');
      }
    };

    fetchProfile();
  }, [isAuthenticated, userId]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: e.target.name.value,
          email: e.target.email.value
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      const data = await response.json();
      setProfile(data);
      setSuccessMessage('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleUpdateContactInfo = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const contactNumber = e.target.contactNumber.value;
      const address = e.target.address.value;
      
      // If userProfile doesn't exist, create a default one
      if (!userProfile) {
        const defaultProfile = {
          firstName: profile?.name?.split(' ')[0] || 'First',
          lastName: profile?.name?.split(' ')[1] || 'Last',
          dateOfBirth: new Date().toISOString().split('T')[0],
          contactNumber: contactNumber || '1234567890',
          address: address || 'Default Address',
          medicalHistory: []
        };
        
        const response = await fetch(`/api/user-profile/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(defaultProfile)
        });

        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.profile);
          setSuccessMessage('Profile created and contact information updated successfully');
          return;
        }
      }
      
      // Update existing profile
      const response = await fetch(`/api/user-profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: userProfile?.firstName || profile?.name?.split(' ')[0] || 'First',
          lastName: userProfile?.lastName || profile?.name?.split(' ')[1] || 'Last',
          dateOfBirth: userProfile?.dateOfBirth || new Date().toISOString().split('T')[0],
          contactNumber: contactNumber,
          address: address,
          medicalHistory: userProfile?.medicalHistory || []
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update contact information');
      }

      const data = await response.json();
      setUserProfile(data.profile);
      setSuccessMessage('Contact information updated successfully');
    } catch (err) {
      console.error('Error updating contact info:', err);
      setError(err.message || 'Failed to update contact information');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const currentPassword = e.target.currentPassword.value;
    const newPassword = e.target.newPassword.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user-profile/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccessMessage('Password changed successfully');
      e.target.reset();
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.message || 'Failed to change password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <AlertCircle className="h-16 w-16 text-yellow-500" />
        <h2 className="mt-6 text-2xl font-bold">Authentication Required</h2>
        <p className="mt-2 text-gray-600">Please sign in to view your profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Profile Settings</h1>

      {error && (
        <div className="mb-6 flex items-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
          <AlertCircle className="mr-2 h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 flex items-center rounded-lg border border-green-200 bg-green-50 p-4 text-green-600">
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* Account Information */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Account Information</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  defaultValue={profile?.name}
                  className="w-full rounded-md border border-gray-300 pl-10 py-2 text-gray-900"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  defaultValue={profile?.email}
                  className="w-full rounded-md border border-gray-300 pl-10 py-2 text-gray-900"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Update Account
            </button>
          </form>
        </div>

        {/* Contact Information - New Section */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Contact Information</h2>
          <form onSubmit={handleUpdateContactInfo} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="contactNumber"
                  defaultValue={userProfile?.contactNumber}
                  className="w-full rounded-md border border-gray-300 pl-10 py-2 text-gray-900"
                  placeholder="+1234567890"
                  required
                />
              </div>
              <div className="mt-2 ml-2 text-gray-600 text-sm">
                <ul className="list-disc list-inside">
                  <li>Include the country code (e.g., +1 for US)</li>
                  <li>Remove any spaces or special characters</li>
                </ul>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="address"
                  defaultValue={userProfile?.address}
                  className="w-full rounded-md border border-gray-300 pl-10 py-2 text-gray-900"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Update Contact Info
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">Current Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  name="currentPassword"
                  className="w-full rounded-md border border-gray-300 pl-10 py-2 text-gray-900"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  name="newPassword"
                  className="w-full rounded-md border border-gray-300 pl-10 py-2 text-gray-900"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">Confirm New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  className="w-full rounded-md border border-gray-300 pl-10 py-2 text-gray-900"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Change Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 