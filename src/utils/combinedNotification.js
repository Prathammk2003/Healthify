import { sendSMS, sendEmail } from '../services/notificationService.js';

/**
 * Send both SMS and Email notifications
 * 
 * @param {Object} options - Notification options
 * @param {string} options.smsTo - Phone number for SMS (optional)
 * @param {string} options.emailTo - Email address for email (optional)
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Message content for both SMS and email
 * @param {string} options.html - HTML content for email (optional)
 * @returns {Promise<Object>} - Results of both notifications
 */
async function sendCombinedNotification({ smsTo, emailTo, subject, message, html }) {
  const results = {
    sms: null,
    email: null
  };

  // Send SMS if phone number provided
  if (smsTo) {
    try {
      console.log(`📱 Sending SMS to ${smsTo}`);
      results.sms = await sendSMS({
        phoneNumber: smsTo,
        message: message
      });
      console.log(`✅ SMS sent successfully via ${results.sms.provider}`);
    } catch (error) {
      console.error(`❌ Failed to send SMS to ${smsTo}:`, error.message);
      results.sms = { success: false, error: error.message };
    }
  }

  // Send Email if email address provided
  if (emailTo) {
    try {
      console.log(`📧 Sending Email to ${emailTo}`);
      results.email = await sendEmail({
        email: emailTo,
        subject: subject,
        text: message,
        html: html || `<p>${message}</p>`
      });
      console.log(`✅ Email sent successfully (Message ID: ${results.email.messageId})`);
    } catch (error) {
      console.error(`❌ Failed to send Email to ${emailTo}:`, error.message);
      results.email = { success: false, error: error.message };
    }
  }

  return results;
}

export { sendCombinedNotification };