# Healthcare App Documentation

This document combines all documentation for the Healthcare App.

---

# Table of Contents
1. [Introduction and Features](#introduction-and-features)
2. [Getting Started](#getting-started)
3. [Medication Reminders System](#medication-reminders-system)
4. [Voice Call Guide](#voice-call-guide)
5. [Additional Instructions](#additional-instructions)
6. [Notification System](#notification-system)

---

# Introduction and Features

A complete healthcare management solution featuring medication reminders, appointments, medical records, and notifications.

## Features

- **Medication Reminder System**: SMS and voice call notifications
- **Appointment Management**: Schedule and manage healthcare appointments
- **Medical Records**: Secure storage and access to medical records
- **User Profiles**: Personalized healthcare information
- **Multi-channel Notifications**: SMS, voice calls, and in-app notifications

---

# Getting Started

## Prerequisites

- Node.js (v14+)
- MongoDB
- Twilio account for SMS and voice notifications

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with the following variables:
   ```
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

## Running the App

Start the Next.js development server:
```bash
npm run dev
```

Start the reminder scheduler service:
```bash
npm run scheduler
```

Start both services at once:
```bash
npm run start:all
```

## Testing Notifications

The app includes a unified medication notification testing tool to verify your Twilio integration:

### Send a Test SMS
```bash
npm run test:sms "+1234567890"
```

### Make a Test Voice Call
```bash
npm run test:voice "+1234567890"
```

### Send a Complete Medication Reminder (SMS + Voice)
```bash
npm run reminder "+1234567890" "Medication Name" "Dosage" true
```

You can also use the medication tools directly with more options:
```bash
node src/medication-tools.js [command] [phoneNumber] [medicationName] [dosage] [enableVoiceCall]
```

Available commands:
- `sms` - Send a test SMS message
- `voice` - Make a test voice call
- `reminder` - Send a medication reminder (SMS + optional voice call)
- `help` - Show the help message

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

# Medication Reminders System

This section explains how to use the medication reminders feature in the healthcare app.

## Features

- **SMS Notifications**: Get text message reminders when it's time to take your medications
- **Voice Call Notifications**: Receive phone calls for critical medications
- **Scheduling Options**: Daily, Twice Daily, Weekly, Monthly, or As Needed frequencies
- **Web Management**: Add, edit, and remove medication reminders through the web interface

## Using the Medication Reminder System

### Adding Medication Reminders

1. Log in to your account
2. Go to the "Medications" page from the dashboard
3. Click the "Add Medication" button
4. Fill out the form with:
   - Medication name
   - Dosage
   - Frequency
   - Time (when to take the medication)
   - Optional notes
   - Enable voice call option for critical medications

### Managing Medication Reminders

- **View**: See all your medication reminders on the Medications page
- **Edit**: Click the edit icon to modify any reminder details
- **Delete**: Click the delete icon to remove a reminder

## Receiving Reminders

For reminders to work:

1. **Add Your Phone Number**: Ensure your profile has your phone number in E.164 format (+1234567890)
2. **Keep the App Running**: The scheduler service must be running to send reminders
3. **Take Medications**: Mark medications as taken to avoid duplicate reminders

## Testing the System

For development or manual testing purposes, you can use the following commands:

```bash
# Test sending an SMS reminder
npm run test:sms +1234567890

# Test making a voice call reminder
npm run test:voice +1234567890

# Test a complete reminder (SMS + optional voice call)
npm run reminder +1234567890 "Ibuprofen" "400mg" true
```

Replace `+1234567890` with your actual phone number. The last parameter (`true`) enables voice call.

## Troubleshooting

If you're not receiving reminders:

1. **Check Your Phone Number**: Must be in E.164 format (+1234567890)
2. **Verify the Scheduler**: Make sure it's running with `npm run start:all`
3. **Check Medication Times**: Time must match exactly the current time to trigger
4. **Check Twilio Settings**: For development, ensure Twilio credentials are set

## Running the Services

To start both the web app and the reminder scheduler:

```bash
npm run start:all
```

To start just the scheduler service:

```bash
npm run scheduler
```

## Voice Call Information

Voice calls are implemented using Twilio's voice API. When a voice call is triggered:

1. The system will call your phone number
2. When you answer, you'll hear an automated message about your medication
3. The call will end automatically after the message completes

**Note**: For trial Twilio accounts, you must verify your phone number first in the Twilio console.

---

# Voice Call Guide

## Overview
The healthcare app supports both SMS and voice call notifications for medication reminders. This feature uses Twilio's voice API to make automated phone calls to remind patients to take their medications.

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

---

# Additional Instructions

To associate patients with a doctor, run: 
```bash
node src/scripts/associate-patients.js <doctorUserId> [numberOfPatients]
```

---

# Notification System

The Healthcare App includes a comprehensive notification system for patient engagement and reminders:

## Key Features

- **Medication Reminders**: Automatic SMS and email notifications when it's time to take prescribed medications
- **Appointment Reminders**: Notifications sent at multiple intervals (24 hours before, 2 hours before) for upcoming appointments
- **Daily Health Tips**: Educational health tips sent once daily to encourage healthy behaviors
- **Multi-Channel Support**: Delivers notifications via SMS (using Twilio) and email
- **Notification Tracking**: Prevents duplicate notifications and tracks delivery status
- **Personalized Content**: Dynamic content tailored to each user's specific appointments and medications

## Configuration

To enable the notification system, you'll need to set up the following environment variables:

1. **SMS Notifications via Twilio**:
   - `TWILIO_ACCOUNT_SID`: Your Twilio account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio auth token
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number

2. **Email Notifications**:
   - `EMAIL_SERVICE`: Email service provider (e.g., "gmail")
   - `EMAIL_USER`: Email address to send from
   - `EMAIL_PASSWORD`: Email password or app-specific password

See the `.env.local.example` file for a complete list of required environment variables.

## Running the Scheduler

The notification scheduler runs automatically with the application, checking for reminders that need to be sent at regular intervals. The scheduler handles:

- Daily reset of medication reminders at midnight
- Checking for medication reminders every minute
- Checking for appointment reminders every minute
- Sending daily health tips at 9 AM

You can monitor scheduler activity in the server logs when running the application. 