/**
 * Utilities for formatting data in the application
 */

/**
 * Formats a phone number to E.164 format (required for Twilio)
 * 
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - The formatted phone number
 */
export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  // If already in E.164 format, return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Strip non-numeric characters
  const numericOnly = phoneNumber.replace(/\D/g, '');
  
  // Add + prefix
  return '+' + numericOnly;
}

/**
 * Formats a date to a human-readable string
 * 
 * @param {Date|string} date - Date object or date string to format
 * @param {string} format - Format style ('short', 'medium', 'long', or 'full')
 * @returns {string} - Formatted date string
 */
export function formatDate(date, format = 'medium') {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: format
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toString();
  }
}

/**
 * Formats a time string to a human-readable format
 * 
 * @param {string} time - Time string in 24-hour format (HH:MM)
 * @param {boolean} use12Hour - Whether to use 12-hour format with AM/PM
 * @returns {string} - Formatted time string
 */
export function formatTime(time, use12Hour = true) {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    return time;
  }
  
  if (use12Hour) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Formats a medication dosage to a standardized format
 * 
 * @param {string|number} amount - The dosage amount
 * @param {string} unit - The dosage unit (mg, ml, etc.)
 * @returns {string} - Formatted dosage string
 */
export function formatDosage(amount, unit = '') {
  if (!amount) return '';
  
  // If amount contains unit, use that
  if (typeof amount === 'string' && /[a-zA-Z]/.test(amount)) {
    return amount;
  }
  
  return `${amount}${unit ? ' ' + unit : ''}`;
} 