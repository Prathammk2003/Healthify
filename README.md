# Healthcare App

A complete healthcare management solution featuring medication reminders, appointments, medical records, and notifications.

## Features

- **Medication Reminder System**: SMS and voice call notifications
- **Appointment Management**: Schedule and manage healthcare appointments
- **Medical Records**: Secure storage and access to medical records
- **User Profiles**: Personalized healthcare information
- **Multi-channel Notifications**: SMS, voice calls, and in-app notifications

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- Twilio account for SMS and voice notifications

### Installation

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

### Running the App

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

## Voice Call Feature

For detailed instructions on setting up and using the voice call feature, please refer to the [Voice Call Guide](VOICE_CALL_GUIDE.md).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Healthcare App Features

### Notification System

The Healthcare App includes a comprehensive notification system for patient engagement and reminders:

#### Key Features

- **Medication Reminders**: Automatic SMS and email notifications when it's time to take prescribed medications
- **Appointment Reminders**: Notifications sent at multiple intervals (24 hours before, 2 hours before) for upcoming appointments
- **Daily Health Tips**: Educational health tips sent once daily to encourage healthy behaviors
- **Multi-Channel Support**: Delivers notifications via SMS (using Twilio) and email
- **Notification Tracking**: Prevents duplicate notifications and tracks delivery status
- **Personalized Content**: Dynamic content tailored to each user's specific appointments and medications

#### Configuration

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

#### Running the Scheduler

The notification scheduler runs automatically with the application, checking for reminders that need to be sent at regular intervals. The scheduler handles:

- Daily reset of medication reminders at midnight
- Checking for medication reminders every minute
- Checking for appointment reminders every minute
- Sending daily health tips at 9 AM

You can monitor scheduler activity in the server logs when running the application.
