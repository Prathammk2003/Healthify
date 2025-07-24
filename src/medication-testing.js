/**
 * Medication Testing Script
 * 
 * This script provides easy testing for medication reminders.
 * It allows you to send SMS, make voice calls, or test complete reminders.
 */

import { sendSMS, makeVoiceCall } from './medication-tools.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Command line argument parsing
const [,, command, phoneNumber, medicationName, dosage, enableVoiceCallArg] = process.argv;
const enableVoiceCall = enableVoiceCallArg === 'true';

console.log(`
╔════════════════════════════════════════════════╗
║       MEDICATION REMINDER TESTING TOOL         ║
╚════════════════════════════════════════════════╝
`);

// Function to display help information
function showHelp() {
  console.log(`
Usage: node medication-testing.js <command> <phoneNumber> [medicationName] [dosage] [enableVoiceCall]

Commands:
  sms        Send a test SMS reminder
  voice      Make a test voice call reminder
  reminder   Send a complete reminder (SMS + optional voice call)
  help       Show this help message

Examples:
  node medication-testing.js sms +1234567890
  node medication-testing.js voice +1234567890
  node medication-testing.js reminder +1234567890 "Ibuprofen" "400mg" true

Environment Setup:
  TWILIO_ACCOUNT_SID:   ${process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Missing'}
  TWILIO_AUTH_TOKEN:    ${process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Missing'}
  TWILIO_PHONE_NUMBER:  ${process.env.TWILIO_PHONE_NUMBER ? '✓ Set' : '✗ Missing'}
  `);
}

// Main function
async function runTest() {
  try {
    if (!command || command === 'help') {
      showHelp();
      return;
    }
    
    if (!phoneNumber) {
      console.error('❌ Error: Phone number is required');
      showHelp();
      return;
    }
    
    switch (command) {
      case 'sms':
        console.log(`⏳ Testing SMS to ${phoneNumber}...`);
        const smsResult = await sendSMS({
          phoneNumber,
          message: medicationName 
            ? `Reminder: It's time to take your ${medicationName} ${dosage ? `(${dosage})` : ''}.`
            : 'This is a test medication reminder.'
        });
        
        if (smsResult.success) {
          console.log('✅ SMS sent successfully!');
          if (smsResult.mock) {
            console.log('   (Using mock implementation - no actual SMS sent)');
          } else if (smsResult.sid) {
            console.log(`   Message SID: ${smsResult.sid}`);
          }
        } else {
          console.error(`❌ SMS failed: ${smsResult.error}`);
        }
        break;
        
      case 'voice':
        console.log(`⏳ Testing voice call to ${phoneNumber}...`);
        const voiceResult = await makeVoiceCall({
          phoneNumber,
          medicationName
        });
        
        if (voiceResult.success) {
          console.log('✅ Voice call initiated successfully!');
          if (voiceResult.mock) {
            console.log('   (Using mock implementation - no actual call made)');
          } else if (voiceResult.sid) {
            console.log(`   Call SID: ${voiceResult.sid}`);
          }
        } else {
          console.error(`❌ Voice call failed: ${voiceResult.error}`);
        }
        break;
        
      case 'reminder':
        if (!medicationName) {
          console.error('❌ Error: Medication name is required for complete reminders');
          return;
        }
        
        console.log(`
⏳ Sending complete reminder...
   Phone: ${phoneNumber}
   Medication: ${medicationName}
   Dosage: ${dosage || 'Not specified'}
   Voice Call: ${enableVoiceCall ? 'Enabled' : 'Disabled'}
`);
        
        // Send SMS first
        const reminderSmsResult = await sendSMS({
          phoneNumber,
          message: `Reminder: It's time to take your ${medicationName} ${dosage ? `(${dosage})` : ''}.`
        });
        
        if (reminderSmsResult.success) {
          console.log('✅ SMS reminder sent successfully!');
        } else {
          console.error(`❌ SMS reminder failed: ${reminderSmsResult.error}`);
        }
        
        // Then make voice call if enabled
        if (enableVoiceCall) {
          console.log('⏳ Making follow-up voice call...');
          const reminderCallResult = await makeVoiceCall({
            phoneNumber,
            medicationName
          });
          
          if (reminderCallResult.success) {
            console.log('✅ Voice call reminder initiated successfully!');
          } else {
            console.error(`❌ Voice call reminder failed: ${reminderCallResult.error}`);
          }
        }
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error running test:', error);
  }
}

// Run the test
runTest()
  .then(() => console.log('\n✨ Test completed'))
  .catch(err => console.error('\n❌ Test failed with error:', err))
  .finally(() => process.exit(0)); 