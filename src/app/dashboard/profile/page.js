'use client';

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  User,
  Mail,
  Key,
  AlertCircle,
  Phone,
  MapPin,
  Calendar,
  Stethoscope,
  Settings,
  Shield,
  Camera,
  Edit3,
  Save,
  CheckCircle2,
  Activity,
  Heart,
  Sparkles,
  Target,
  Lock
} from 'lucide-react';
import { DOCTOR_SPECIALIZATIONS } from '@/constants/specializations';

export default function ProfilePage() {
  const { isAuthenticated, userId, verifyToken, role } = useAuth();
  const [profile, setProfile] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate particles on client side to prevent hydration mismatch
    const particleData = [...Array(12)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDelay: Math.random() * 20,
      animationDuration: 15 + Math.random() * 10
    }));
    setParticles(particleData);

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');

        // Check if user is authenticated and has a userId
        if (!isAuthenticated || !userId) {
          setLoading(false);
          setError('You must be logged in to view your profile');
          return;
        }

        // Verify token is valid before proceeding
        if (!verifyToken()) {
          setLoading(false);
          setError('Your session has expired. Please log in again.');
          return;
        }

        // Get token from localStorage and sessionStorage
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          setError('Authentication token missing. Please log in again.');
          return;
        }

        // Fetch user account info
        const response = await fetch('/api/user-profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          // Token is invalid or expired
          setLoading(false);
          setError('Your session has expired. Please log in again.');
          return;
        }

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
        } else if (profileResponse.status === 401) {
          // Token is invalid or expired
          setError('Your session has expired. Please log in again.');
        }

        // If user is a doctor, fetch doctor profile
        if (role === 'doctor') {
          try {
            const doctorResponse = await fetch('/api/doctors', {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });

            if (doctorResponse.ok) {
              const doctorData = await doctorResponse.json();
              setDoctorProfile(doctorData.doctor);
            }
          } catch (error) {
            console.error('Error fetching doctor profile:', error);
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data: ' + (err.message || ''));
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
  }, [isAuthenticated, userId, verifyToken, role]);

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

  const handleUpdateDoctorSpecialization = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const specialization = e.target.specialization.value;

      // Get the secondary specializations (if any were selected)
      const secondarySpecializationsSelect = e.target.secondarySpecializations;
      const secondarySpecializations = [];
      if (secondarySpecializationsSelect) {
        for (let i = 0; i < secondarySpecializationsSelect.options.length; i++) {
          if (secondarySpecializationsSelect.options[i].selected) {
            secondarySpecializations.push(secondarySpecializationsSelect.options[i].value);
          }
        }
      }

      const response = await fetch('/api/doctors/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          specialization,
          secondarySpecializations,
          qualifications: doctorProfile?.qualifications || '',
          yearsOfExperience: doctorProfile?.yearsOfExperience || 0,
          bio: doctorProfile?.bio || ''
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update specialization');
      }

      const data = await response.json();
      setDoctorProfile(data.doctor);
      setSuccessMessage('Doctor specialization updated successfully');
    } catch (err) {
      console.error('Error updating specialization:', err);
      setError(err.message || 'Failed to update specialization');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 py-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
                <User className="h-10 w-10 text-white relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
              </div>
              <div className="absolute inset-0 w-20 h-20 mx-auto border-2 border-blue-300 rounded-full animate-pulse-ring"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">Loading Your Profile</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Please wait while we fetch your information...</p>
            <div className="flex justify-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && error.includes('session has expired')) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-yellow-500 mr-3" />
            <div>
              <p className="font-bold">Session Expired</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={() => window.location.href = '/login'}
                className="mt-3 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
              >
                Log In Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>

        {/* Floating particles */}
        <div className="particles">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="particle"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.animationDelay}s`,
                animationDuration: `${particle.animationDuration}s`
              }}
            />
          ))}
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-500">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-500"></div>

          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm hover:bg-white/30 transition-all duration-300 hover:scale-110">
                    <Settings className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-5xl font-bold mb-2 text-shimmer">Profile Settings</h1>
                    <p className="text-xl text-white/90">
                      Manage your account and personal information
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2 hover:text-white transition-colors">
                    <User className="h-5 w-5" />
                    <span>Personal Details</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-blue-200 transition-colors">
                    <Shield className="h-5 w-5 text-blue-300" />
                    <span>Secure & Private</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-indigo-200 transition-colors">
                    <Activity className="h-5 w-5 text-indigo-300" />
                    <span>Role: {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'}</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-105">
                    <Heart className="h-16 w-16 text-white animate-pulse" />
                  </div>
                  {/* Pulse rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse-ring"></div>
                  <div className="absolute inset-2 rounded-full border border-white/10 animate-pulse-ring" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced floating elements */}
          <div className="absolute top-4 right-4 opacity-20">
            <div className="w-20 h-20 border-2 border-white rounded-full animate-ping"></div>
          </div>
          <div className="absolute bottom-4 left-4 opacity-20">
            <div className="w-16 h-16 border border-white rounded-full animate-bounce"></div>
          </div>
          <div className="absolute top-1/2 right-1/4 opacity-10">
            <div className="w-8 h-8 bg-white rounded-full animate-float"></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
          <div className="relative z-10 flex items-center">
            <AlertCircle className="mr-3 h-5 w-5 animate-pulse" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
          <div className="relative z-10 flex items-center">
            <CheckCircle2 className="mr-3 h-5 w-5 animate-pulse" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Account Information */}
        <div className="group relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-all duration-500"></div>

          <div className="relative z-10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-md">
                <User className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Account Information
              </h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    <User className="h-4 w-4" />
                    Full Name
                  </label>
                  <div className="relative group/input">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within/input:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      name="name"
                      defaultValue={profile?.name}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-300/50 dark:focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-300 hover:shadow-md"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </label>
                  <div className="relative group/input">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within/input:text-blue-500 transition-colors" />
                    <input
                      type="email"
                      name="email"
                      defaultValue={profile?.email}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-300/50 dark:focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-300 hover:shadow-md"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="group/btn w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Save className="h-5 w-5 group-hover/btn:rotate-12 transition-transform" />
                Update Account
              </button>
            </form>
          </div>
        </div>

        {/* Contact Information */}
        <div className="group relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 group-hover:from-emerald-500/10 group-hover:to-teal-500/10 transition-all duration-500"></div>

          <div className="relative z-10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-md">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                Contact Information
              </h2>
            </div>

            <form onSubmit={handleUpdateContactInfo} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </label>
                  <div className="relative group/input">
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within/input:text-emerald-500 transition-colors" />
                    <input
                      type="tel"
                      name="contactNumber"
                      defaultValue={userProfile?.contactNumber}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-300/50 dark:focus:ring-emerald-500/50 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all duration-300 hover:shadow-md"
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                  <div className="mt-3 p-3 bg-emerald-50/80 dark:bg-emerald-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-2">📱 Phone Number Format:</p>
                    <ul className="text-sm text-emerald-600 dark:text-emerald-400 space-y-1">
                      <li>• Include country code (e.g., +1 for US)</li>
                      <li>• Remove spaces and special characters</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    <MapPin className="h-4 w-4" />
                    Address
                  </label>
                  <div className="relative group/input">
                    <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within/input:text-emerald-500 transition-colors" />
                    <input
                      type="text"
                      name="address"
                      defaultValue={userProfile?.address}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-300/50 dark:focus:ring-emerald-500/50 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all duration-300 hover:shadow-md"
                      placeholder="Enter your complete address"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="group/btn w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Save className="h-5 w-5 group-hover/btn:rotate-12 transition-transform" />
                Update Contact Info
              </button>
            </form>
          </div>
        </div>

        {/* Doctor Specialization - Only shown for doctors */}
        {role === 'doctor' && (
          <div className="group relative overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 lg:col-span-2">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500"></div>

            <div className="relative z-10 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-md">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Doctor Specialization
                </h2>
              </div>

              <form onSubmit={handleUpdateDoctorSpecialization} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                      <Stethoscope className="h-4 w-4" />
                      Primary Specialization
                    </label>
                    <div className="relative group/input">
                      <Stethoscope className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within/input:text-purple-500 transition-colors z-10" />
                      <select
                        name="specialization"
                        defaultValue={doctorProfile?.specialization || ''}
                        className="w-full pl-12 pr-4 py-4 border border-gray-200/50 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm text-gray-700 focus:ring-2 focus:ring-purple-300/50 focus:border-purple-400 transition-all duration-300 hover:shadow-md appearance-none"
                        required
                      >
                        <option value="">Select your specialization</option>
                        {DOCTOR_SPECIALIZATIONS.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Target className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                      <Sparkles className="h-4 w-4" />
                      Secondary Specializations
                    </label>
                    <p className="text-sm text-purple-600 mb-3 bg-purple-50/80 p-2 rounded-xl border border-purple-200/50">
                      🎯 Hold Ctrl/Cmd key to select multiple specializations
                    </p>
                    <select
                      name="secondarySpecializations"
                      defaultValue={doctorProfile?.secondarySpecializations || []}
                      className="w-full p-4 border border-gray-200/50 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm text-gray-700 focus:ring-2 focus:ring-purple-300/50 focus:border-purple-400 transition-all duration-300 hover:shadow-md"
                      multiple
                      size={4}
                    >
                      {DOCTOR_SPECIALIZATIONS.map((spec) => (
                        <option key={spec} value={spec} className="py-2">
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="group/btn w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Save className="h-5 w-5 group-hover/btn:rotate-12 transition-transform" />
                  Update Specialization
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Change Password */}
        <div className="group relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 lg:col-span-2">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 dark:from-red-500/10 dark:to-orange-500/10 group-hover:from-red-500/10 group-hover:to-orange-500/10 transition-all duration-500"></div>

          <div className="relative z-10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow-md">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
                Change Password
              </h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    <Key className="h-4 w-4" />
                    Current Password
                  </label>
                  <div className="relative group/input">
                    <Key className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within/input:text-red-500 transition-colors" />
                    <input
                      type="password"
                      name="currentPassword"
                      className="w-full pl-12 pr-4 py-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-red-300/50 dark:focus:ring-red-500/50 focus:border-red-400 dark:focus:border-red-500 transition-all duration-300 hover:shadow-md"
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    <Lock className="h-4 w-4" />
                    New Password
                  </label>
                  <div className="relative group/input">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within/input:text-red-500 transition-colors" />
                    <input
                      type="password"
                      name="newPassword"
                      className="w-full pl-12 pr-4 py-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-red-300/50 dark:focus:ring-red-500/50 focus:border-red-400 dark:focus:border-red-500 transition-all duration-300 hover:shadow-md"
                      placeholder="Enter new password"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    <Shield className="h-4 w-4" />
                    Confirm Password
                  </label>
                  <div className="relative group/input">
                    <Shield className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within/input:text-red-500 transition-colors" />
                    <input
                      type="password"
                      name="confirmPassword"
                      className="w-full pl-12 pr-4 py-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-red-300/50 dark:focus:ring-red-500/50 focus:border-red-400 dark:focus:border-red-500 transition-all duration-300 hover:shadow-md"
                      placeholder="Confirm new password"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="group/btn w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Lock className="h-5 w-5 group-hover/btn:rotate-12 transition-transform" />
                Change Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 