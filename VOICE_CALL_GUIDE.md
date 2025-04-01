# Voice Call Guide for Healthcare App

## Overview
The healthcare app now supports both SMS and voice call notifications for medication reminders. This feature uses Twilio's voice API to make automated phone calls to remind patients to take their medications.

## Requirements
1. Valid Twilio account credentials (SID, Auth Token, and Phone Number)
2. Phone numbers must be verified in your Twilio console if using a trial account
3. Phone numbers must be in E.164 format (e.g., +1234567890)

## Setup Instructions

### 1. Verify Your Phone Number (Trial Accounts Only)
If you're using a Twilio trial account, you must verify phone numbers that will receive calls:
1. Log in to your [Twilio Console](https://www.twilio.com/console)
2. Navigate to [Verified Caller IDs](https://www.twilio.com/console/phone-numbers/verified)
3. Click "Add a new Caller ID" and follow the verification process

### 2. Update Your Profile
1. Log in to the healthcare app
2. Update your profile with your phone number in E.164 format (e.g., +918197288544)
3. Make sure your profile is complete with all required information

### 3. Create Medication Reminders
1. Add medications in the medication management section
2. Set up reminders with specific times
3. Optional: Enable voice call notifications for specific medications

## Testing the Voice Call Feature

### Using Command Line Tools
For development and testing purposes, you can use the provided scripts:

```bash
# Test SMS only
npm run test:sms "+918197288544"

# Test Voice Call
npm run test:voice "+918197288544"

# Test complete reminder (SMS + voice call)
npm run reminder "+918197288544" "Medication Name" "Dosage" true
```

Replace the phone number with your verified number.

## Understanding Voice Call Flow
1. When a medication reminder is triggered:
   - An SMS message is sent first
   - If voice calls are enabled, a call is placed to the user's phone
2. Upon answering, the user will hear an automated message reminding them to take their medication
3. The call status and details are logged in the system

## Troubleshooting

### Common Error Codes
- **21211**: Invalid phone number format
  - Solution: Format numbers in E.164 format with country code (+1234567890)
- **21608**: Unverified phone number (trial accounts)
  - Solution: Verify the number in your Twilio console

### Server Setup
For voice calls to work, both services must be running:
1. Next.js web application
2. Scheduler service

You can start both services at once using:
```bash
npm run start:all
```

## Features & Limitations

### Current Features
- Voice calls for medication reminders
- Combined SMS and voice notification
- Configurable on per-medication basis
- Testing tools for verification

### Limitations
- Trial accounts can only call verified numbers
- Voice calls use a pre-recorded message
- International calls may have additional charges

For more information or support, contact the development team. 