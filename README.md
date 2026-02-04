# 🏥 Healthify - Advanced Healthcare Management System

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-6.13-green?style=for-the-badge&logo=mongodb)
![AI Powered](https://img.shields.io/badge/AI-Powered-orange?style=for-the-badge&logo=tensorflow)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**A complete healthcare management solution with AI-powered diagnostics, medication reminders, appointment scheduling, and predictive analytics.**

[Features](#-features) • [Tech Stack](#-technology-stack) • [Getting Started](#-getting-started) • [Documentation](#-documentation) • [API Routes](#-api-routes)

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the Application](#running-the-application)
- [AI/ML Capabilities](#-aiml-capabilities)
- [API Routes](#-api-routes)
- [Database Schema](#-database-schema)
- [Notification System](#-notification-system)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🎯 **Core Healthcare Features**
- ✅ **Patient Management** - Comprehensive patient profiles and medical records
- ✅ **Doctor Dashboard** - Appointment management and patient tracking
- ✅ **Appointment Scheduling** - Automated booking with multi-interval reminders
- ✅ **Medication Reminders** - SMS, Email, and Voice call notifications
- ✅ **Medical Records** - Secure storage and access control
- ✅ **Health Analytics** - Real-time health trend visualization

### 🤖 **AI-Powered Diagnostics**
- 🧠 **Brain Tumor Detection** - MRI scan analysis with ONNX models
- 💊 **Diabetes Prediction** - Risk assessment based on health metrics
- ❤️ **Stroke Risk Assessment** - Multi-factor analysis
- 🎗️ **Breast Cancer Classification** - Malignant vs Benign detection
- 📈 **ECG Analysis** - Heartbeat classification and cardiac anomaly detection
- 🩺 **AI Symptom Checker** - Medical image analysis pipeline
- 🥗 **Nutrition Planner** - RAG-powered meal planning with Gemini AI

### 📊 **Advanced Analytics**
- 📈 **Predictive Analytics** - Health trend forecasting
- ⚠️ **Risk Assessment** - Personalized health risk scoring
- 🧘 **Mental Health Tracking** - Mood and wellness monitoring
- 💪 **Physical Fitness** - Activity and exercise tracking
- 📊 **Health Trends Visualization** - Interactive charts with Chart.js

### 🔔 **Multi-Channel Notifications**
- 📧 **Email** - Nodemailer with Gmail SMTP
- 📱 **SMS** - Vonage (primary) + Twilio (fallback)
- 📞 **Voice Calls** - Twilio automated calls for critical medications
- 🔔 **In-App** - Real-time notification center
- ☀️ **Daily Health Tips** - Automated educational content (9 AM daily)

### 🔐 **Security & Authentication**
- 🔑 **NextAuth.js** - OAuth + Credentials authentication
- 🌐 **Google OAuth** - One-click social login
- 🔒 **JWT Tokens** - Secure session management
- 👥 **Role-Based Access** - Patient, Doctor, Admin roles
- 🛡️ **Middleware Protection** - Route-level authorization

---

## 🛠️ Technology Stack

### **Frontend**
```
Framework:      Next.js 15.5 (App Router)
UI Library:     React 19.0
Styling:        Tailwind CSS 3.4.17
UI Components:  Radix UI + Lucide Icons
Charts:         Chart.js 4.4.8
Forms:          React Hook Form 7.55.0
Notifications:  React Hot Toast 2.5.2
Build Tool:     Turbopack
```

### **Backend**
```
Runtime:        Node.js
API:            Next.js API Routes
Database:       MongoDB Atlas 6.13
ODM:            Mongoose 8.10.1
Authentication: NextAuth.js 4.24.11 + JWT
Scheduler:      Node-cron 3.0.3
Background:     Express 4.21.2 (Scheduler Service)
```

### **AI/ML Stack**
```
Model Runtime:  ONNX Runtime Node 1.22.0
AI Provider:    Ollama (Local) + Google Gemini 2.5
Image Models:   llava:7b (Vision)
Text Models:    llama3.2:3b (NLP)
Image Process:  Sharp 0.34.5
Models:         5 Trained ONNX Models
```

### **Notification Services**
```
SMS (Primary):  Vonage API 3.24.1
SMS (Fallback): Twilio 5.5.1
Voice Calls:    Twilio
Email:          Nodemailer 6.10.1 (Gmail)
Scheduling:     Node-cron (every minute)
```

### **Development Tools**
```
Package Manager: npm
Linting:         ESLint 9
Code Quality:    Prettier
Version Control: Git
Deployment:      Vercel-ready
```

---

## 🏗️ Architecture

### **High-Level System Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                   CLIENT (React/Next.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  AI Symptom  │  │  Appointments│      │
│  │  (Patient)   │  │  Checker     │  │  (Booking)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ HTTPS
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS SERVER (Port 3000)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         MIDDLEWARE (Auth + Role Check)               │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌───────────┐      ┌───────────┐      ┌───────────┐       │
│  │ API Routes│      │Pages (SSR)│      │  Static   │       │
│  │  (28 APIs)│      │           │      │  Assets   │       │
│  └───────────┘      └───────────┘      └───────────┘       │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ ONNX Models  │    │   MongoDB    │    │ Notification │
│ (5 Models)   │    │   Atlas      │    │   Services   │
│              │    │              │    │              │
│ • Brain MRI  │    │ • Users      │    │ • Vonage SMS │
│ • Diabetes   │    │ • Appts      │    │ • Twilio     │
│ • Stroke     │    │ • Meds       │    │ • Email      │
│ • Breast CA  │    │ • Profiles   │    │ • Voice      │
│ • ECG        │    │ • Health     │    │              │
└──────────────┘    └──────────────┘    └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│         SCHEDULER SERVICE (Separate Process)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │       Node-cron (Runs every minute)                  │   │
│  │  • Medication Reminders                              │   │
│  │  • Appointment Reminders (24h, 12h, 1h before)       │   │
│  │  • Daily Health Tips (9 AM)                          │   │
│  │  • Notification Deduplication                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v14 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **MongoDB** (Atlas account or local instance)
- **Git** ([Download](https://git-scm.com/))
- **Ollama** (optional, for local AI) ([Download](https://ollama.ai/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Prathammk2003/Healthify.git
   cd Healthify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.local.example .env.local
   ```

### Environment Setup

Configure your `.env.local` file with the following variables:

```env
# ==================== DATABASE ====================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/healthcare_app
FORCE_MOCK_DB=false

# ==================== AUTHENTICATION ====================
JWT_SECRET=your_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=http://localhost:3000

# ==================== GOOGLE OAUTH ====================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ==================== SMS SERVICES ====================
# Vonage (Primary SMS Provider)
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret
VONAGE_PHONE_NUMBER=your_vonage_phone

# Twilio (Fallback SMS + Voice Calls)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# ==================== EMAIL SERVICE ====================
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_PASSWORD=fallback_password

# ==================== AI/ML SERVICES ====================
# OpenAI (Optional)
OPENAI_API_KEY=sk-proj-...

# Google Gemini (For Nutrition RAG)
GEMINI_API_KEY=your_gemini_api_key

# Ollama (Local AI - Optional)
IMAGE_ANALYSIS_PROVIDER=ollama
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llava:7b
TEXT_ANALYSIS_PROVIDER=ollama
OLLAMA_TEXT_MODEL=llama3.2:3b
AI_PROVIDER=ollama

# ==================== KAGGLE (Dataset Downloads) ====================
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_api_key

# ==================== APPLICATION ====================
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Running the Application

#### **Option 1: Full Application (Recommended)** 🔥

Start both the Next.js app AND the scheduler service:

```bash
npm run start:all
```

- **Web App:** http://localhost:3000
- **Scheduler:** Running in background
- **Features:** All features enabled (reminders, notifications, AI)

#### **Option 2: Web Application Only** 🌐

Start only the Next.js development server:

```bash
npm run dev
```

- **Web App:** http://localhost:3000
- **Note:** Medication reminders and scheduled notifications won't work

#### **Option 3: Scheduler Only** ⏰

Start only the background scheduler service:

```bash
npm run scheduler
```

- **Use:** For testing notifications independently
- **Note:** Requires the main app to be running for full functionality

---

## 🧠 AI/ML Capabilities

### **Pre-trained ONNX Models**

Located in `trained_models_onnx/`:

| Model | Size | Purpose | Input | Output |
|-------|------|---------|-------|--------|
| `brain_tumor_classifier.onnx` | 53 KB | Brain tumor detection | MRI scans | Glioma, Meningioma, Pituitary, Normal |
| `diabetes_predictor.onnx` | 788 KB | Diabetes risk prediction | Health metrics | Risk score (0-1) |
| `stroke_risk_assessment.onnx` | 2.4 MB | Stroke risk assessment | Multi-factor data | Risk level |
| `breast_cancer_classifier.onnx` | 131 KB | Breast cancer classification | Mammogram features | Malignant/Benign |
| `ecg_heartbeat_classifier.onnx` | 29 MB | ECG analysis | ECG signal data | Cardiac anomalies |

### **AI-Powered Features**

1. **Medical Image Analysis**
   - Brain MRI tumor detection
   - Chest X-ray analysis
   - Skin lesion classification
   - Mammogram analysis

2. **Predictive Analytics**
   - Diabetes risk prediction
   - Stroke risk assessment
   - Heart disease detection
   - Health trend forecasting

3. **Natural Language Processing**
   - Symptom analysis from text
   - Medical report processing
   - Patient query understanding

4. **RAG-Powered Nutrition**
   - Personalized meal planning
   - Dietary recommendations
   - Nutrition education

### **Setting up Local AI (Ollama)**

```bash
# Install Ollama (https://ollama.ai/)

# Start Ollama service
ollama serve

# Pull required models
ollama pull llava:7b        # For image analysis
ollama pull llama3.2:3b     # For text analysis
```

---

## 📡 API Routes

### **Authentication APIs** (`/api/auth/`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email` - Email verification
- `POST /api/auth/set-password` - Password reset
- `ALL /api/auth/[...nextauth]` - NextAuth.js handler

### **Medical Analysis APIs**
- `POST /api/symptom-checker` - AI symptom analysis
- `POST /api/analyze-skin` - Skin condition analysis
- `POST /api/analyze-xray` - X-ray image analysis
- `POST /api/diagnostics` - General medical diagnostics
- `POST /api/multimodal` - Multi-modal medical analysis

### **Appointment APIs** (`/api/appointments/`)
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments` - Update appointment
- `DELETE /api/appointments` - Cancel appointment

### **Medication APIs** (`/api/medications/`)
- `GET /api/medications` - List medications
- `POST /api/medications` - Add medication
- `PUT /api/medications` - Update medication
- `DELETE /api/medications` - Remove medication
- `POST /api/medication-reminder` - Set reminder

### **Doctor APIs** (`/api/doctors/`)
- `GET /api/doctors` - List doctors
- `GET /api/doctors/appointments` - Doctor's appointments
- `GET /api/doctors/patients` - Doctor's patients
- `PUT /api/doctors/appointments` - Approve/reject appointment
- `GET /api/doctors/profile` - Doctor profile

### **Health Tracking APIs**
- `GET /api/mentalhealth` - Mental health records
- `POST /api/mentalhealth` - Log mental health entry
- `GET /api/physicalfitness` - Fitness data
- `POST /api/physicalfitness` - Log fitness activity
- `POST /api/nutrition` - AI nutrition planner

### **System APIs**
- `GET /api/notifications` - List notifications
- `PUT /api/notifications` - Mark as read
- `GET /api/user-profile` - User profile
- `PUT /api/user-profile` - Update profile
- `GET /api/stats` - System statistics
- `GET /api/analytics` - Health analytics

---

## 💾 Database Schema

### **Core Models**

#### **User Model**
```javascript
{
  email: String (unique),
  password: String (hashed),
  role: "patient" | "doctor" | "admin",
  isEmailVerified: Boolean,
  verificationToken: String,
  createdAt: Date
}
```

#### **UserProfile Model**
```javascript
{
  userId: ObjectId,
  fullName: String,
  phoneNumber: String,
  dateOfBirth: Date,
  gender: String,
  address: Object,
  emergencyContact: Object,
  medicalHistory: Array
}
```

#### **Appointment Model**
```javascript
{
  patientId: ObjectId,
  doctorId: ObjectId,
  dateTime: Date,
  status: "pending" | "approved" | "rejected" | "completed",
  notes: String,
  remindersSent: {
    hour24: Boolean,
    hour12: Boolean,
    hour1: Boolean
  }
}
```

#### **MedicationReminder Model**
```javascript
{
  userId: ObjectId,
  medicationName: String,
  dosage: String,
  frequency: "daily" | "twice_daily" | "weekly" | "monthly",
  scheduledTime: String,
  enableVoiceCall: Boolean,
  lastSent: Date
}
```

### **Full Schema List**

15 Mongoose models in `src/models/`:
- User, UserProfile, Doctor
- Appointment, TimeSlot
- MedicationReminder, Notification
- HealthTrend, HealthPrediction, RiskAssessment
- MentalHealth, PhysicalFitness
- AnalysisResult, Conversation, PatientRequest

---

## 🔔 Notification System

### **Multi-Channel Architecture**

```
┌─────────────────────────────────────────┐
│        Notification Trigger             │
│  • Medication time reached              │
│  • Appointment approaching              │
│  • Daily health tip scheduled           │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Scheduler (Node-cron)              │
│  • Runs every minute                    │
│  • Checks for pending notifications     │
│  • Prevents duplicates                  │
└─────────────────────────────────────────┘
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│   SMS    │ │  Email   │ │  Voice   │
│ (Vonage/ │ │(Nodemailer)│ (Twilio) │
│ Twilio)  │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘
       │          │          │
       └──────────┼──────────┘
                  ▼
┌─────────────────────────────────────────┐
│      Notification Record                │
│  • Saved to MongoDB                     │
│  • Delivery status tracked              │
│  • Displayed in app                     │
└─────────────────────────────────────────┘
```

### **Notification Types**

1. **Medication Reminders**
   - Sent at scheduled medication times
   - SMS + optional voice call
   - Daily, twice daily, weekly, monthly frequencies

2. **Appointment Reminders**
   - 24 hours before appointment
   - 12 hours before appointment
   - 1 hour before appointment
   - Email + SMS

3. **Daily Health Tips**
   - Sent at 9:00 AM daily
   - Educational health content
   - Email + SMS

4. **In-App Notifications**
   - Real-time updates
   - Appointment approvals/rejections
   - System messages

---

## 🧪 Testing

### **Built-in Test Scripts**

```bash
# Test SMS notification
npm run test:sms "+1234567890"

# Test voice call
npm run test:voice "+1234567890"

# Test complete medication reminder (SMS + Voice)
npm run test:reminder "+1234567890" "Aspirin" "100mg" true

# Test scheduler logic
npm run test:scheduler

# Test all notification types
npm run test:notifications
```

### **Manual Testing**

1. **Register a test user**
   - Go to http://localhost:3000/register
   - Create patient and doctor accounts

2. **Test appointment booking**
   - Login as patient
   - Book appointment with doctor
   - Login as doctor and approve

3. **Test medication reminders**
   - Add medication with current time
   - Wait for scheduler to trigger
   - Verify SMS/voice call received

4. **Test AI features**
   - Upload brain MRI scan
   - Use symptom checker
   - Try nutrition planner

---

## 📦 Deployment

### **Vercel Deployment** (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables from `.env.local`
   - Deploy!

3. **Set up Scheduler**
   - Deploy scheduler as separate service or
   - Use Vercel Cron Jobs

### **Environment Variables for Production**

Make sure to add ALL environment variables from `.env.local` to your Vercel project settings.

### **Important Notes**
- MongoDB Atlas is production-ready
- Update `NEXTAUTH_URL` to your production domain
- Use production credentials for Twilio/Vonage
- Enable Google OAuth for production domain

---

## 📂 Project Structure

```
healthcare-app/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # 28 API route modules
│   │   │   ├── auth/             # Authentication
│   │   │   ├── appointments/     # Appointments
│   │   │   ├── medications/      # Medications
│   │   │   ├── doctors/          # Doctor APIs
│   │   │   ├── symptom-checker/  # AI diagnosis
│   │   │   └── ...               # More APIs
│   │   ├── dashboard/            # Patient dashboard
│   │   │   ├── appointments/
│   │   │   ├── medications/
│   │   │   ├── symptom-checker/
│   │   │   └── doctor/           # Doctor dashboard
│   │   ├── auth/                 # Auth pages
│   │   ├── globals.css           # Global styles
│   │   ├── layout.js             # Root layout
│   │   └── page.js               # Landing page
│   │
│   ├── components/               # React components
│   │   ├── Navbar.js
│   │   ├── AuthProvider.js
│   │   ├── ui/                   # UI primitives
│   │   └── ...
│   │
│   ├── lib/                      # Core libraries
│   │   ├── db.js                 # MongoDB connection
│   │   ├── auth-utils.js         # Auth utilities
│   │   ├── medical-analysis-pipeline.js
│   │   ├── ai.js                 # AI utilities
│   │   ├── *.py                  # Python ML scripts
│   │   └── ...
│   │
│   ├── models/                   # Mongoose models (15)
│   │   ├── User.js
│   │   ├── Appointment.js
│   │   ├── MedicationReminder.js
│   │   └── ...
│   │
│   ├── services/                 # External services
│   │   └── notificationService.js
│   │
│   ├── scheduler/                # Background jobs
│   │   ├── index.js
│   │   └── reminder.js
│   │
│   ├── utils/                    # Utilities
│   ├── middleware.js             # Auth middleware
│   └── server.js                 # Scheduler entry
│
├── public/                       # Static assets
├── datasets/                     # Medical datasets (13)
├── trained_models_onnx/          # ONNX models (5)
├── _archive/                     # Archived code
├── logs/                         # Application logs
│
├── .env.local                    # Environment variables
├── package.json                  # Dependencies
├── next.config.mjs               # Next.js config
├── tailwind.config.mjs           # Tailwind config
└── README.md                     # This file
```

---

## 📜 Available npm Scripts

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Services
npm run scheduler        # Start scheduler service
npm run start:all        # Start app + scheduler
npm run start:services   # Start multiple services

# Testing
npm run test:sms         # Test SMS
npm run test:voice       # Test voice call
npm run test:reminder    # Test medication reminder
npm run test:scheduler   # Test scheduler logic

# Datasets
npm run setup:datasets       # Setup medical datasets
npm run download:datasets    # Download datasets
npm run check:datasets       # Verify datasets

# Medical Search
npm run install:search-deps  # Install search dependencies
npm run setup:search         # Setup search engine
npm run test:search          # Test search functionality
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Coding Standards**
- Use ESLint for code quality
- Follow React best practices
- Write meaningful commit messages
- Add comments for complex logic
- Test before submitting PR

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Next.js Team** - For the amazing framework
- **MongoDB** - For reliable database solutions
- **Twilio & Vonage** - For notification services
- **Google** - For Gemini AI API
- **Ollama** - For local AI inference
- **Open Source Community** - For invaluable tools and libraries

---

## 📞 Support

For support and questions:
- **GitHub Issues:** [Create an issue](https://github.com/Prathammk2003/Healthify/issues)
- **Email:** prathskulkarni2003@gmail.com
- **Repository:** [Healthify on GitHub](https://github.com/Prathammk2003/Healthify)

---

## 🗺️ Roadmap

### **Upcoming Features**
- [ ] Real-time chat between doctors and patients
- [ ] Video consultation integration
- [ ] Mobile app (React Native)
- [ ] Advanced AI diagnostics
- [ ] Wearable device integration
- [ ] Telemedicine platform
- [ ] Insurance claim management
- [ ] Prescription management system
- [ ] Lab report integration
- [ ] Multi-language support

---

## 📊 Project Stats

- **Total Files:** 500+
- **API Routes:** 28 modules
- **Database Models:** 15 schemas
- **AI Models:** 5 ONNX models
- **Datasets:** 13 medical datasets
- **Components:** 30+ React components
- **Dependencies:** 40+ npm packages

---

<div align="center">

**Made with ❤️ by [Pratham Kulkarni](https://github.com/Prathammk2003)**

**Star ⭐ this repository if you find it helpful!**

[![GitHub](https://img.shields.io/badge/GitHub-Prathammk2003-blue?style=for-the-badge&logo=github)](https://github.com/Prathammk2003)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/pratham-kulkarni)

</div>
