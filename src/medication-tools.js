/**
 * Medication Tools Module
 * 
 * This module provides functionality for medication reminders via SMS and voice calls.
 */

import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Twilio client if credentials are available
let twilioClient;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized successfully in medication-tools.js');
  } else {
    console.warn('⚠️ Twilio credentials not found in environment variables');
  }
} catch (error) {
  console.error('❌ Error initializing Twilio client:', error);
}

/**
 * Send an SMS message for medication reminder
 * @param {Object} params - SMS parameters
 * @param {string} params.phoneNumber - The recipient's phone number
 * @param {string} params.message - The SMS message content
 * @returns {Promise<Object>} - Result of the SMS operation
 */
export async function sendSMS({ phoneNumber, message }) {
  try {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    
    if (!message) {
      throw new Error('Message content is required');
    }
    
    // Format phone number if needed
    let formattedPhoneNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedPhoneNumber = `+91${phoneNumber.replace(/\D/g, '')}`;
    }
    
    console.log(`📱 Attempting to send SMS to ${formattedPhoneNumber}`);
    
    // Check for Twilio credentials
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn('⚠️ Missing Twilio credentials - using mock implementation');
      console.log(`[MOCK] SMS to ${formattedPhoneNumber}: ${message}`);
      return { success: true, mock: true };
    }
    
    // Ensure Twilio client is initialized
    if (!twilioClient) {
      twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    
    // Send the SMS
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhoneNumber
    });
    
    console.log(`✅ SMS sent successfully to ${formattedPhoneNumber} (SID: ${result.sid})`);
    return { success: true, sid: result.sid, status: result.status };
  } catch (error) {
    console.error(`❌ Error sending SMS: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Make a voice call for medication reminder
 * @param {Object} params - Call parameters
 * @param {string} params.phoneNumber - The recipient's phone number
 * @param {string} params.medicationName - Optional medication name for customized message
 * @returns {Promise<Object>} - Result of the voice call operation
 */
export async function makeVoiceCall({ phoneNumber, medicationName }) {
  try {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    
    // Format phone number if needed
    let formattedPhoneNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedPhoneNumber = `+91${phoneNumber.replace(/\D/g, '')}`;
    }
    
    console.log(`📞 Attempting to make a voice call to ${formattedPhoneNumber}`);
    
    // Check for Twilio credentials
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn('⚠️ Missing Twilio credentials - using mock implementation');
      console.log(`[MOCK] Voice call to ${formattedPhoneNumber}`);
      return { success: true, mock: true };
    }
    
    // Ensure Twilio client is initialized
    if (!twilioClient) {
      twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    
    // Default TwiML URL for medication reminder
    let twimlURL = 'https://handler.twilio.com/twiml/EH8ccdbd7f0b05764809dd5e3d96c7e76f';
    
    // Make the call
    const call = await twilioClient.calls.create({
      url: twimlURL,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhoneNumber
    });
    
    console.log(`✅ Voice call initiated successfully to ${formattedPhoneNumber} (SID: ${call.sid})`);
    return { success: true, sid: call.sid, status: call.status };
  } catch (error) {
    console.error(`❌ Error making voice call: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Command-line interface for testing
if (process.argv.length > 2) {
  const command = process.argv[2];
  const phoneNumber = process.argv[3];
  const medicationName = process.argv[4];
  const dosage = process.argv[5];
  const enableVoiceCall = process.argv[6] === 'true';
  
  const runTest = async () => {
    switch (command) {
      case 'sms':
        console.log(`Testing SMS to ${phoneNumber}`);
        await sendSMS({
          phoneNumber,
          message: medicationName 
            ? `Reminder: It's time to take your ${medicationName} (${dosage || 'as prescribed'}).` 
            : 'This is a test medication reminder from your healthcare app.'
        });
        break;
        
      case 'voice':
        console.log(`Testing voice call to ${phoneNumber}`);
        await makeVoiceCall({
          phoneNumber,
          medicationName
        });
        break;
        
      case 'reminder':
        console.log(`Sending complete reminder to ${phoneNumber}`);
        const smsResult = await sendSMS({
          phoneNumber,
          message: `Reminder: It's time to take your ${medicationName} (${dosage || 'as prescribed'}).`
        });
        
        if (enableVoiceCall) {
          const callResult = await makeVoiceCall({
            phoneNumber,
            medicationName
          });
          console.log('Call result:', callResult);
        }
        break;
        
      case 'help':
      default:
        console.log(`
Usage: node medication-tools.js [command] [phoneNumber] [medicationName] [dosage] [enableVoiceCall]

Commands:
  sms       Send a test SMS message
  voice     Make a test voice call
  reminder  Send a medication reminder (SMS + optional voice call)
  help      Show this help message

Examples:
  node medication-tools.js sms +1234567890
  node medication-tools.js voice +1234567890
  node medication-tools.js reminder +1234567890 "Ibuprofen" "400mg" true
        `);
    }
  };
  
  runTest()
    .then(() => console.log('Test completed'))
    .catch(err => console.error('Test failed:', err))
    .finally(() => process.exit(0));
} 