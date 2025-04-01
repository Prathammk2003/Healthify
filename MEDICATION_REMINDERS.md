# Medication Reminders Guide

This guide explains how to use the medication reminders feature in the healthcare app.

## How to Send Medication Reminders

### Using the API

The medication reminder system works automatically based on scheduled times and the scheduler service.

### Using Command Line

For testing or manual reminders, you can use the command line:

```bash
# Format: npm run reminder [phone_number] [medication_name] [dosage] [enable_voice_call]
npm run reminder "+918197288544" "Amoxicillin" "500mg" true
```

Parameters:
- Phone number: Must be in E.164 format (+918197288544)
- Medication name: Name of the medication
- Dosage: Dosage information
- Enable voice call: Set to "true" to enable voice calling

## Automatic Reminders

For automatic reminders to work:

1. **Add medications with reminders**:
   - Go to the medications page
   - Add medications with specific times
   - The system will check for reminders every minute

2. **Ensure the scheduler is running**:
   - Run `npm run scheduler` or `npm run start:all` to start the scheduler service
   - This must be running for automatic reminders to work

3. **Update your profile**:
   - Ensure your phone number is in E.164 format
   - Set notification preferences

## Troubleshooting

If you're not receiving reminders:

1. **Check your phone number format**:
   - Must be in E.164 format (+918197288544)
   - Verify it in your profile

2. **Verify your number in Twilio**:
   - For trial accounts, your phone number must be verified
   - Go to https://www.twilio.com/console/phone-numbers/verified

3. **Check the scheduler**:
   - Make sure the scheduler service is running
   - Run `npm run start:all` to start both services

4. **Check medication times**:
   - Ensure times are in 24-hour format (HH:MM)
   - The time in your reminder must match the current time exactly

## Manual Testing

If you want to trigger reminders manually:

```bash
# Send a specific medication reminder
npm run reminder "+918197288544" "Ibuprofen" "400mg" true

# Test voice call only
npm run test:voice "+918197288544"

# Test SMS only
npm run test:sms "+918197288544" 
``` 