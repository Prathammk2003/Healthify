# Healthify

A complete healthcare management solution featuring medication reminders, appointments, medical records, and notifications.

---

## Table of Contents
- [Features](#features)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Notification & Voice Call System](#notification--voice-call-system)
- [Testing & Troubleshooting](#testing--troubleshooting)
- [Deployment](#deployment)
- [Best Practices](#best-practices)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- **Medication Reminder System**: SMS and voice call notifications
- **Appointment Management**: Schedule and manage healthcare appointments
- **Medical Records**: Secure storage and access to medical records
- **User Profiles**: Personalized healthcare information
- **Multi-channel Notifications**: SMS, voice calls, and in-app notifications
- **Daily Health Tips**: Automated educational tips

---

## Directory Structure
```
healthcare-app/
├── src/                  # Source code (APIs, models, services, UI, schedulers)
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── constants/        # App constants
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Library utilities
│   ├── middleware/       # Middleware logic
│   ├── models/           # Mongoose models
│   ├── scheduler/        # Scheduler logic
│   ├── scripts/          # Utility scripts
│   ├── services/         # Service logic (notifications, etc.)
│   ├── utils/            # Utility functions
│   ├── medication-tools.js      # Medication notification tools
│   ├── medication-testing.js    # Testing scripts for notifications
│   ├── server.js                # Scheduler entry point
│   ├── start-services.js        # Start multiple services
│   └── test-scheduler.js        # Scheduler test script
├── public/               # Static assets
├── prisma/               # (If used) Database schema/migrations
├── logs/                 # Application logs
├── .vercel/              # Vercel deployment config
├── package.json          # Project metadata and scripts
├── .env.local.example    # Example environment file
├── README.md             # This file
└── ...
```

---

## Getting Started

### Prerequisites
- **Node.js** (v14 or higher)
- **MongoDB** (running and accessible)
- **Twilio account** (for SMS and voice notifications)

### Installation
1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd healthcare-app
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Set up environment variables**
   - Copy `.env.local.example` to `.env.local` and fill in your values:
     ```
     MONGO_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_secret
     TWILIO_ACCOUNT_SID=your_twilio_sid
     TWILIO_AUTH_TOKEN=your_twilio_auth_token
     TWILIO_PHONE_NUMBER=your_twilio_phone_number
     EMAIL_SERVICE=gmail
     EMAIL_USER=your_email@gmail.com
     EMAIL_PASSWORD=your_email_password
     ```

---

## Environment Variables
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT authentication
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number (E.164 format)
- `EMAIL_SERVICE` - Email provider (e.g., gmail)
- `EMAIL_USER` - Email address to send from
- `EMAIL_PASSWORD` - Email password or app password

> **Note:** Never commit your `.env.local` or sensitive credentials to version control. `.env*` is already in `.gitignore`.

---

## Running the App

- **Start the Next.js development server:**
  ```bash
  npm run dev
  ```
- **Start the reminder scheduler service:**
  ```bash
  npm run scheduler
  ```
- **Start both services at once:**
  ```bash
  npm run start:all
  ```
- **Build for production:**
  ```bash
  npm run build
  npm start
  ```
- **Lint the code:**
  ```bash
  npm run lint
  ```

### Available Scripts
- `dev` - Start Next.js in development mode
- `build` - Build the app for production
- `start` - Start the production server
- `scheduler` - Start the medication/appointment scheduler
- `start:all` - Start both Next.js and scheduler
- `test:sms` - Test SMS notification
- `test:voice` - Test voice call notification
- `reminder` - Test full medication reminder (SMS + voice)
- `test:scheduler` - Test the scheduler logic

---

## Notification & Voice Call System

### Medication Reminders
- **SMS and Voice Call**: Automated reminders for medications
- **Scheduling**: Flexible frequencies (daily, weekly, etc.)
- **Web Management**: Add/edit/delete reminders in the UI

### Appointment Reminders
- **Multi-interval notifications** (24h, 2h before)

### Daily Health Tips
- **Automated daily tips** via SMS/email

### How to Use
1. **Add your phone number** (E.164 format) in your profile
2. **Create medication reminders** in the app
3. **Enable voice call** for critical meds if desired
4. **Keep the scheduler running**

### Testing Notifications
- **Send a test SMS:**
  ```bash
  npm run test:sms "+1234567890"
  ```
- **Make a test voice call:**
  ```bash
  npm run test:voice "+1234567890"
  ```
- **Send a complete reminder:**
  ```bash
  npm run reminder "+1234567890" "Medication Name" "Dosage" true
  ```

### Troubleshooting
- Ensure phone numbers are in E.164 format
- Scheduler must be running for reminders
- Twilio trial accounts require verified numbers
- Check logs in `logs/app.log` for errors

---

## Deployment

### Deploy on Vercel
- The app is ready for [Vercel](https://vercel.com/) deployment.
- Do **not** commit the `.vercel` folder; it is in `.gitignore`.
- See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for more info.

### Other Deployment
- Ensure all environment variables are set in your deployment environment.
- Use `npm run build` and `npm start` for production.

---

## Best Practices
- **.env files**: Never commit secrets; `.env*` is in `.gitignore`.
- **Logs**: `logs/` is for runtime logs; do not commit log files.
- **Node modules**: `node_modules/` is not tracked.
- **Sensitive config**: `.vercel/` and other sensitive files are ignored.

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License
This project is licensed under the MIT License.
