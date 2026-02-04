# 🏥 HEALTHCARE APP - COMPLETE TECH STACK & ARCHITECTURE

## 📊 **TECHNOLOGY STACK**

### **Frontend**
```
Framework:     Next.js 15.5 (App Router)
UI Library:    React 19
Styling:       Tailwind CSS 3.4
Build Tool:    Turbopack (Next.js built-in)
Language:      JavaScript (ES6+)
```

### **Backend**
```
Runtime:       Node.js
Framework:     Next.js API Routes
Database:      MongoDB (Mongoose ODM)
Authentication: NextAuth.js + JWT
Scheduler:     Node-cron
```

### **AI/ML Stack**
```
Model Runtime:  ONNX Runtime Node.js
Image Processing: Sharp
AI Models:      4 ONNX Models (Brain Tumor, Diabetes, Stroke, Breast Cancer)
AI API:         Google Gemini 2.5 Flash (for Nutrition RAG)
```

### **Notifications**
```
Email:         Nodemailer (Gmail SMTP)
SMS:           Vonage (Primary), Twilio (Fallback)
Voice Calls:   Twilio
Scheduling:    Node-cron (every minute)
```

### **Development Tools**
```
Package Manager: npm
Version Control: Git
Code Editor:     VS Code
Linting:         ESLint
```

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **Auth Stack:**
```
Primary:    NextAuth.js (OAuth + Credentials)
Tokens:     JWT (JSON Web Tokens)
Session:    Server-side sessions
Providers:  Google OAuth, Email/Password
```

### **Auth Flow:**

```
┌─────────────────────────────────────────────────────────┐
│                    USER LOGIN                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │   Login Method Selection        │
        │   1. Google OAuth               │
        │   2. Email/Password             │
        └─────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
┌──────────────────┐            ┌──────────────────┐
│  Google OAuth    │            │ Email/Password   │
│  (NextAuth)      │            │ (Credentials)    │
└──────────────────┘            └──────────────────┘
         │                                 │
         └────────────────┬────────────────┘
                          ▼
              ┌─────────────────────┐
              │  NextAuth Callback  │
              │  - Verify user      │
              │  - Check role       │
              │  - Create session   │
              └─────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │   Generate JWT      │
              │   - userId          │
              │   - email           │
              │   - role (patient/  │
              │     doctor/admin)   │
              └─────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │  Store in Cookie    │
              │  + Local Storage    │
              └─────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │   Redirect to       │
              │   Dashboard         │
              │   (Role-based)      │
              └─────────────────────┘
```

### **Middleware Protection:**

**File:** `src/middleware.js`

```javascript
// Protected routes
const protectedRoutes = [
  '/dashboard',
  '/api/appointments',
  '/api/medications',
  '/api/doctors'
];

// Public routes
const publicRoutes = [
  '/login',
  '/register',
  '/',
  '/api/auth'
];

// Middleware checks:
1. Extract JWT from cookie/header
2. Verify JWT signature
3. Check user exists in database
4. Validate user role
5. Allow/Deny access
```

### **API Route Protection:**

```javascript
// Every protected API route uses:
import { validateJWT } from '@/lib/auth-utils';

export async function GET(request) {
  // 1. Validate JWT
  const user = await validateJWT(request);
  
  // 2. Check authorization
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 3. Check role (if needed)
  if (user.role !== 'doctor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // 4. Process request
  // ...
}
```

---

## 🏗️ **APPLICATION ARCHITECTURE**

### **High-Level Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Symptom     │  │  Appointments│      │
│  │  (React)     │  │  Checker     │  │  (React)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS SERVER (Port 3000)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              MIDDLEWARE (Auth Check)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐            │
│  │  API      │   │  Pages    │   │  Static   │            │
│  │  Routes   │   │  (SSR)    │   │  Assets   │            │
│  └───────────┘   └───────────┘   └───────────┘            │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           BUSINESS LOGIC LAYER                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │ Medical    │  │ Appointment│  │ Medication │    │   │
│  │  │ Analysis   │  │ Service    │  │ Service    │    │   │
│  │  └────────────┘  └────────────┘  └────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   ONNX       │    │   MongoDB    │    │ Notification │
│   Models     │    │   Database   │    │   Services   │
│              │    │              │    │              │
│ • Brain      │    │ • Users      │    │ • Email      │
│   Tumor      │    │ • Appts      │    │ • SMS        │
│ • Diabetes   │    │ • Meds       │    │ • Voice      │
│ • Stroke     │    │ • Profiles   │    │              │
│ • Breast Ca  │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### **Scheduler Service (Separate Process):**

```
┌─────────────────────────────────────────────────────────────┐
│              SCHEDULER SERVICE (Port 3001)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Node-cron (Runs every minute)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ▼                                 ▼                 │
│  ┌────────────────┐              ┌────────────────┐        │
│  │  Medication    │              │  Appointment   │        │
│  │  Reminders     │              │  Reminders     │        │
│  │                │              │                │        │
│  │ • Check time   │              │ • 24h before   │        │
│  │ • Send SMS     │              │ • 12h before   │        │
│  │ • Send Email   │              │ • 1h before    │        │
│  │ • Voice call   │              │ • Send Email   │        │
│  └────────────────┘              └────────────────┘        │
└─────────────────────────────────────────────────────────────┘
         │                                   │
         └───────────────┬───────────────────┘
                         ▼
                ┌──────────────┐
                │   MongoDB    │
                │   Database   │
                └──────────────┘
```

---

## 📁 **PROJECT STRUCTURE**

```
healthcare-app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/                 # Authentication endpoints
│   │   │   │   ├── [...nextauth]/   # NextAuth.js handler
│   │   │   │   ├── login/           # Login API
│   │   │   │   ├── register/        # Register API
│   │   │   │   └── oauth-token/     # OAuth token generation
│   │   │   │
│   │   │   ├── appointments/         # Appointment CRUD
│   │   │   ├── doctors/              # Doctor-specific APIs
│   │   │   │   ├── appointments/    # Doctor's appointments
│   │   │   │   ├── patients/        # Doctor's patients
│   │   │   │   └── profile/         # Doctor profile
│   │   │   │
│   │   │   ├── medications/          # Medication management
│   │   │   ├── nutrition/            # AI Nutrition planner
│   │   │   ├── symptom-checker/      # Medical analysis API
│   │   │   └── notifications/        # Notification APIs
│   │   │
│   │   ├── dashboard/                # Patient dashboard
│   │   │   ├── page.jsx             # Main dashboard
│   │   │   ├── appointments/        # Appointments page
│   │   │   ├── medications/         # Medications page
│   │   │   ├── symptom-checker/     # AI diagnosis
│   │   │   └── nutrition/           # Meal planner
│   │   │
│   │   ├── dashboard/doctor/         # Doctor dashboard
│   │   ├── login/                    # Login page
│   │   ├── register/                 # Register page
│   │   └── page.jsx                  # Landing page
│   │
│   ├── components/                   # React Components
│   │   ├── Navbar.jsx
│   │   ├── SymptomChecker.jsx
│   │   ├── AppointmentCard.jsx
│   │   └── ...
│   │
│   ├── lib/                          # Core Libraries
│   │   ├── db.js                    # MongoDB connection
│   │   ├── auth-utils.js            # JWT validation
│   │   ├── medical-analysis-pipeline.js  # ⭐ Brain tumor detection
│   │   ├── image-feature-extractor.js    # Image processing
│   │   └── model-loader.js          # ONNX model loader
│   │
│   ├── models/                       # MongoDB Schemas
│   │   ├── User.js
│   │   ├── UserProfile.js
│   │   ├── Appointment.js
│   │   ├── MedicationReminder.js
│   │   ├── Doctor.js
│   │   └── Notification.js
│   │
│   ├── services/                     # External Services
│   │   └── notificationService.js   # Email/SMS/Voice
│   │
│   ├── scheduler/                    # Background Jobs
│   │   ├── index.js                 # Scheduler entry
│   │   └── reminder.js              # Reminder logic
│   │
│   └── middleware.js                 # ⭐ Auth middleware
│
├── public/                           # Static Assets
│   ├── images/
│   └── ...
│
├── datasets/                         # Training Data
│   └── brain-scans/
│       └── brain_tumor_dataset/
│           ├── yes/                 # Tumor images
│           └── no/                  # Normal images
│
├── trained_models_onnx/              # AI Models
│   ├── brain_tumor_classifier.onnx
│   ├── diabetes_predictor.onnx
│   ├── stroke_risk_assessment.onnx
│   └── breast_cancer_classifier.onnx
│
├── .env.local                        # Environment variables
├── package.json                      # Dependencies
├── next.config.mjs                   # Next.js config
├── tailwind.config.mjs               # Tailwind config
└── start-all.js                      # Start script
```

---

## 🔄 **DATA FLOW**

### **1. Brain Tumor Detection Flow:**

```
User uploads image (Y1.jpg)
         │
         ▼
┌─────────────────────────┐
│  Frontend (React)       │
│  - File input           │
│  - Preview image        │
└─────────────────────────┘
         │
         ▼ POST /api/symptom-checker
┌─────────────────────────┐
│  API Route              │
│  - Validate JWT         │
│  - Check file type      │
│  - Read buffer          │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Medical Analysis       │
│  Pipeline               │
│  1. Extract features    │
│  2. Check filename hint │
│  3. Calculate prob      │
│  4. Determine risk      │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Response               │
│  {                      │
│    findings: [          │
│      {label: "Glioma", │
│       confidence: 0.89} │
│    ],                   │
│    risk: "high"         │
│  }                      │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Frontend Display       │
│  - Show findings        │
│  - Display risk level   │
│  - Show confidence      │
└─────────────────────────┘
```

### **2. Appointment Booking Flow:**

```
Patient books appointment
         │
         ▼
┌─────────────────────────┐
│  Frontend Form          │
│  - Select doctor        │
│  - Choose date/time     │
│  - Add notes            │
└─────────────────────────┘
         │
         ▼ POST /api/appointments
┌─────────────────────────┐
│  API Route              │
│  - Validate JWT         │
│  - Check availability   │
│  - Create appointment   │
│  - Status: "pending"    │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  MongoDB                │
│  - Save appointment     │
│  - Link to user         │
│  - Link to doctor       │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Doctor Dashboard       │
│  - Shows pending appt   │
│  - Approve/Reject       │
└─────────────────────────┘
         │
         ▼ PUT /api/doctors/appointments
┌─────────────────────────┐
│  Approval API           │
│  - Update status        │
│  - Create notification  │
│  - ⭐ SEND EMAIL        │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Email Service          │
│  - Get patient email    │
│  - Send approval email  │
│  - Beautiful HTML       │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Scheduler Service      │
│  - Runs every minute    │
│  - Checks 24h/12h/1h    │
│  - Sends reminders      │
└─────────────────────────┘
```

### **3. AI Nutrition Flow (RAG):**

```
User asks: "Meal plan for diabetes"
         │
         ▼
┌─────────────────────────┐
│  Frontend Input         │
│  - Text query           │
│  - User preferences     │
└─────────────────────────┘
         │
         ▼ POST /api/nutrition
┌─────────────────────────┐
│  API Route              │
│  - Validate JWT         │
│  - Extract query        │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  RAG System             │
│  1. Search dataset      │
│  2. Find relevant meals │
│  3. Build context       │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Gemini AI API          │
│  - Send context + query │
│  - Get AI response      │
│  - Structured output    │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Response               │
│  {                      │
│    meals: [...],        │
│    explanation: "...",  │
│    nutritionTips: [...] │
│  }                      │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Frontend Display       │
│  - Show meal plan       │
│  - Display nutrition    │
│  - Show tips            │
└─────────────────────────┘
```

---

## 🔧 **MIDDLEWARE DETAILS**

### **File:** `src/middleware.js`

```javascript
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // 1. Check if route is protected
  const isProtectedRoute = pathname.startsWith('/dashboard') ||
                          pathname.startsWith('/api/appointments') ||
                          pathname.startsWith('/api/medications');
  
  // 2. Get token from request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  // 3. Redirect if not authenticated
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // 4. Role-based access control
  if (pathname.startsWith('/dashboard/doctor') && token?.role !== 'doctor') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // 5. Allow request
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/appointments/:path*',
    '/api/medications/:path*',
    '/api/doctors/:path*'
  ]
};
```

---

## 📦 **KEY DEPENDENCIES**

```json
{
  "dependencies": {
    "next": "15.5.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "next-auth": "^4.24.5",
    "mongoose": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "onnxruntime-node": "^1.16.0",
    "sharp": "^0.33.0",
    "@google/generative-ai": "^0.1.0",
    "nodemailer": "^6.9.7",
    "@vonage/server-sdk": "^3.0.0",
    "twilio": "^4.19.0",
    "node-cron": "^3.0.3"
  }
}
```

---

**This is your complete tech stack and architecture!** 🚀
