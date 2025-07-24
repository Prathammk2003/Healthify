'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { DOCTOR_SPECIALIZATIONS } from '@/constants/specializations';

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState({
    specialization: '',
    secondarySpecializations: [],
    qualifications: '',
    yearsOfExperience: 0,
    bio: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDoctorProfile();
  }, []);

  // Fetch doctor profile
  const fetchDoctorProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Not authenticated. Please log in.');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/doctors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok && data.doctor) {
        setProfile({
          specialization: data.doctor.specialization || '',
          secondarySpecializations: data.doctor.secondarySpecializations || [],
          qualifications: data.doctor.qualifications || '',
          yearsOfExperience: data.doctor.yearsOfExperience || 0,
          bio: data.doctor.bio || ''
        });
      } else {
        setMessage(data.error || 'Failed to fetch profile');
      }
    } catch (error) {
      setMessage('Error fetching profile data');
      console.error('Profile fetch error:', error);
    }
    setIsLoading(false);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: name === 'yearsOfExperience' ? parseInt(value) || 0 : value
    }));
  };

  // Handle secondary specialization selection
  const handleSecondarySpecChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setProfile(prev => ({
      ...prev,
      secondarySpecializations: selected
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Not authenticated. Please log in.');
        setIsSaving(false);
        return;
      }

      const res = await fetch('/api/doctors/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Profile updated successfully!');
      } else {
        setMessage(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setMessage('Error updating profile');
      console.error('Update error:', error);
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Doctor Profile</h1>
      
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Primary Specialization</label>
            <select
              name="specialization"
              value={profile.specialization}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              required
            >
              <option value="">Select your specialization</option>
              {DOCTOR_SPECIALIZATIONS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">Secondary Specializations</label>
            <p className="text-sm text-gray-500 mb-2">Hold Ctrl/Cmd key to select multiple</p>
            <select
              name="secondarySpecializations"
              value={profile.secondarySpecializations}
              onChange={handleSecondarySpecChange}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              multiple
              size={5}
            >
              {DOCTOR_SPECIALIZATIONS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">Qualifications</label>
            <input
              type="text"
              name="qualifications"
              value={profile.qualifications}
              onChange={handleChange}
              placeholder="e.g. MBBS, MD"
              className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">Years of Experience</label>
            <input
              type="number"
              name="yearsOfExperience"
              value={profile.yearsOfExperience}
              onChange={handleChange}
              min="0"
              className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">Bio</label>
            <textarea
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              placeholder="Tell patients about yourself and your experience"
              className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              rows={5}
            />
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Profile'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 