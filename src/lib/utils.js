import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string into a readable format
 * @param {string} dateString - date string in ISO format (YYYY-MM-DD)
 * @returns {string} formatted date (e.g., "Jan 1, 2023")
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a time string into a readable format
 * @param {string} timeString - time string in 24-hour format (HH:MM)
 * @returns {string} formatted time (e.g., "2:30 PM")
 */
export function formatTime(timeString) {
  if (!timeString) return '';
  
  // Parse the time string (HH:MM)
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12; // Convert 0 to 12
  
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
} 