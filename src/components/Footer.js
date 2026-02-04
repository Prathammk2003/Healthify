'use client';

import Link from 'next/link';
import { Github, Mail, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { role, isAuthenticated } = useAuth();
  
  // Check if the user is a doctor
  const isDoctor = role === 'doctor';

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Healthify</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Comprehensive healthcare management platform for patients, doctors, and admins.
            </p>
            <div className="flex space-x-4">
              <a href="https://github.com" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition">
                <Github size={20} />
              </a>
              <a href="mailto:contact@healthify.com" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links - Not shown to doctors */}
          {!isDoctor && (
            <div className="col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/appointments" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Appointments
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/nutrition" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Nutrition
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Services - Not shown to doctors */}
          {!isDoctor && (
            <div className="col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Services</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard/symptom-checker" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Symptom Checker
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/mental-health" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Mental Health
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/medications" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Medication Tracker
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/physical-fitness" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Physical Fitness
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Doctor links - Only shown to doctors */}
          {isDoctor && (
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Doctor Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard/doctor" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Doctor Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/patients" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Patient Management
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/doctor/daily-slots" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Appointment Slots
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/profile" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition">
                    Profile Settings
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Contact & Support */}
          <div className={`col-span-1 ${isDoctor ? 'md:col-span-1' : ''}`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact & Support</h3>
            <ul className="space-y-2">
              <li className="text-gray-600 dark:text-gray-400 text-sm">
                <span className="font-medium">Email:</span> support@healthify.com
              </li>
              <li className="text-gray-600 dark:text-gray-400 text-sm">
                <span className="font-medium">Phone:</span> +1 (555) 123-4567
              </li>
              <li className="text-gray-600 dark:text-gray-400 text-sm">
                <span className="font-medium">Hours:</span> 9am - 5pm, Mon-Fri
              </li>
              <li className="mt-4">
                <Link href="/help" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition">
                  Get Help
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            © {currentYear} Healthify. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition">
              Terms of Service
            </Link>
            <Link href="/accessibility" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition">
              Accessibility
            </Link>
          </div>
        </div>
        
        <div className="flex justify-center items-center mt-6">
          <p className="text-gray-500 dark:text-gray-500 text-xs flex items-center">
            Made with <Heart size={12} className="mx-1 text-red-500" /> by THE BOYS Team
          </p>
        </div>
      </div>
    </footer>
  );
} 