# NutriMind — Getting Started Guide

Welcome to **NutriMind**, a bariatric surgery recovery tracking application that helps patients monitor their post-surgery nutrition and connect with healthcare providers.

## 📖 Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Project Structure](#project-structure)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

---

## 🎯 Project Overview

NutriMind is a small team project built with:
- **Frontend**: React Native + Expo (mobile app)
- **Backend**: Express.js (Node.js)
- **Database**: Firebase (Auth + Firestore)
- **AI**: OpenAI GPT for nutrition chatbot

### Key Features

- 🍽️ **Meal Logging** - Photo analysis, manual entry, voice input
- 💧 **Fluid Tracking** - Monitor hydration
- 💊 **Vitamin Logging** - Track supplements
- 📊 **Progress Dashboard** - Visual progress rings for protein, fluids, calories
- 🏥 **Doctor-Patient System** - Healthcare provider monitoring
- 🤖 **AI Chatbot** - Personalized nutrition guidance
- 📅 **Recovery Phases** - Automatic post-op phase tracking

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **Expo CLI** (optional, can use npx):
  ```bash
  npm install -g expo-cli
  ```

### Accounts You'll Need

- **Firebase Account** - [Sign up](https://firebase.google.com/)
- **OpenAI API Account** - [Sign up](https://platform.openai.com/)
- **GitHub Access** - Contact your team lead for repository access

---

## ⚡ Quick Start

For experienced developers who want to get running quickly:

### 1. Clone the Repository

```bash
git clone git@github.com:mycoro/SeniorProject.git
cd SeniorProject
```

### 2. Install Dependencies

```bash
# Frontend
cd NutriMind && npm install

# Backend
cd ../backend && npm install
```

### 3. Configure Environment Variables

Create `.env` files:

**Backend** (`backend/.env`):
```bash
OPENAI_API_KEY=sk-your-key-here
```

**Frontend** (`NutriMind/.env`):
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Set Up Firebase Service Account

Download service account JSON from Firebase Console and save as `backend/service-account.json`.

### 5. Start the Servers

```bash
# Terminal 1 - Backend
cd backend
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/service-account.json"
npm start

# Terminal 2 - Frontend
cd NutriMind
npx expo start
```

Then press `i` for iOS simulator or `a` for Android emulator.

---

## 🔧 Detailed Setup

Follow these steps for a complete, first-time setup.

### Step 1: Clone and Navigate

```bash
git clone git@github.com:mycoro/SeniorProject.git
cd SeniorProject
```

If you need to switch branches:
```bash
git checkout main  # or your feature branch
```

---

### Step 2: Install Dependencies

#### Frontend (NutriMind)
```bash
cd NutriMind
npm install
```

This installs all required packages including:
- Expo SDK
- React Native
- Firebase
- Navigation libraries
- UI components

#### Backend
```bash
cd ../backend
npm install
```

This installs:
- Express.js
- Firebase Admin SDK
- OpenAI SDK
- Multer (file uploads)

---

### Step 3: Backend Configuration

#### 3.1 Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-`)

#### 3.2 Create Backend .env File

```bash
cd backend
```

Create a file named `.env` with:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

#### 3.3 Set Up Firebase Admin SDK

**This is REQUIRED for the backend to function.**

##### Download Service Account Key:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **NutriMind** project
3. Click the **gear icon ⚙️** → **Project Settings**
4. Go to the **Service accounts** tab
5. Click **"Generate new private key"**
6. Confirm by clicking **"Generate key"**
7. Save the downloaded JSON file as `backend/service-account.json`

##### Verify .gitignore:

Make sure `service-account.json` is in `.gitignore`:
```bash
cat backend/.gitignore | grep service-account.json
```

If not, add it to prevent committing credentials.

##### Start Backend with Service Account:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/service-account.json"
npm start
```

You should see:
```
Firebase Admin initialized using application default credentials
Server is running on port 3000
```

**📝 Note:** You'll need to set `GOOGLE_APPLICATION_CREDENTIALS` each time you start the backend, or add it to your shell profile (`~/.zshrc` or `~/.bashrc`).

For more details, see [`backend/README.md`](backend/README.md).

---

### Step 4: Frontend Configuration

#### 4.1 Get Firebase Web Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **gear icon ⚙️** → **Project Settings**
4. Scroll to **"Your apps"** section
5. Click the **web icon** `</>` to add a web app (if not already added)
6. Copy the configuration object

#### 4.2 Create Frontend .env File

```bash
cd NutriMind
```

Create a file named `.env` with your Firebase config:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Important:** All frontend environment variables MUST start with `EXPO_PUBLIC_` to be accessible in the app.

#### 4.3 Deploy Firestore Security Rules

1. In Firebase Console, go to **Firestore Database**
2. Click the **Rules** tab
3. Copy the contents of `firestore.rules` from the project root
4. Paste into the Firebase rules editor
5. Click **Publish**

#### 4.4 Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started** (if not enabled)
3. Enable **Email/Password** authentication
4. Save

---

### Step 5: Verify Installation

#### Test Backend

```bash
cd backend
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/service-account.json"
npm start
```

In another terminal:
```bash
curl http://localhost:3000/health
```

Expected response: `{"ok":true}`

#### Test Frontend

```bash
cd NutriMind
npx expo start
```

You should see:
- QR code in terminal
- Metro bundler running
- No errors in console

---

## 📁 Project Structure

```
SeniorProject/
├── NutriMind/                 # Frontend (React Native + Expo)
│   ├── app/                   # Expo Router pages
│   │   ├── (patients)/        # Patient screens
│   │   │   └── (tabs)/        # Patient tab navigation
│   │   ├── (provider)/        # Doctor screens
│   │   │   └── (tabs)/        # Doctor tab navigation
│   │   ├── auth.tsx           # Authentication
│   │   ├── onboarding.tsx     # Patient onboarding
│   │   └── doctorOnboarding.tsx
│   ├── components/            # Reusable UI components
│   ├── context/               # React Context (state management)
│   ├── config/                # Firebase & API configuration
│   ├── utils/                 # Helper functions
│   ├── assets/                # Images, fonts
│   ├── .env                   # Frontend environment variables
│   └── package.json
│
├── backend/                   # Backend (Express.js)
│   ├── services/              # Business logic (AI, etc.)
│   ├── db/                    # Database helpers
│   ├── models/                # Data models
│   ├── server.js              # Main Express server
│   ├── .env                   # Backend environment variables
│   ├── service-account.json   # Firebase Admin credentials (DO NOT COMMIT)
│   ├── README.md              # Backend documentation
│   └── package.json
│
├── firestore.rules            # Firestore security rules
├── GETTING_STARTED.md         # This file
├── README.md                  # Project overview
└── SETUP.md                   # Original setup guide
```

---

## 🚀 Running the Application

### Development Mode (Local)

You need **two terminals** running simultaneously:

#### Terminal 1: Backend

```bash
cd backend
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/service-account.json"
npm start
```

Backend runs on: `http://localhost:3000`

#### Terminal 2: Frontend

```bash
cd NutriMind
npx expo start
```

### Running the App

Once Expo starts, you have several options:

#### On iOS Simulator (Mac only)
```bash
# Press 'i' in the Expo terminal
```

#### On Android Emulator
```bash
# Press 'a' in the Expo terminal
```

#### On Physical Device
1. Install **Expo Go** app from App Store / Play Store
2. Scan the QR code shown in terminal
3. App will load on your device

**Note:** Your phone and computer must be on the same WiFi network.

---

## 📱 Deployment

### Backend Deployment

The backend is deployed on **Vercel**:
- Production URL: `https://backend-pied-two-32.vercel.app`
- Configuration: `backend/vercel.json`

To deploy updates:
```bash
cd backend
vercel deploy --prod
```

### Frontend Deployment

**Note:** The frontend is currently **not deployed**. It runs locally using Expo Go for development and testing.

When ready to deploy, the app can be built using **EAS Build**:

#### iOS (TestFlight) - Not yet deployed
```bash
cd NutriMind
eas build --platform ios
```

#### Android (APK) - Not yet deployed
```bash
cd NutriMind
eas build --platform android
```

Configuration: `NutriMind/eas.json` and `NutriMind/app.json`

For now, developers and testers should use **Expo Go** on their devices or simulators/emulators for testing.

---

## 🐛 Troubleshooting

### Backend Issues

#### "Cannot find package 'multer'"
**Solution:** Install dependencies
```bash
cd backend
npm install
```

#### "Firebase Admin not initialized"
**Solution:** Set up service account
```bash
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/backend/service-account.json"
```

#### "ENOENT: no such file or directory"
**Solution:** Check the path to service-account.json
```bash
ls -la backend/service-account.json  # Should exist
```

---

### Frontend Issues

#### "expo/tsconfig.base not found"
**Solution:** Install dependencies
```bash
cd NutriMind
npm install
```

#### "Firebase: Error (auth/invalid-api-key)"
**Solution:** Check `.env` file has correct Firebase config
```bash
cat NutriMind/.env  # Should show all EXPO_PUBLIC_ variables
```

Restart the dev server after changing `.env`:
```bash
# Kill the server (Ctrl+C) and restart
npx expo start --clear
```

#### iOS Simulator Error (code 115)
**Solution:** Install Expo Go on simulator
```bash
npx expo start --ios
```

---

### API Connection Issues

#### Backend not reachable from app

**For Simulator/Emulator:**
- Backend should auto-detect when running on localhost

**For Physical Device:**
1. Find your computer's local IP:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. Add to `NutriMind/.env`:
   ```bash
   EXPO_PUBLIC_API_URL=http://YOUR_IP:3000
   ```

3. Restart Expo server

**Or use the deployed Vercel backend (already configured in `config/api.ts`)**

---

### Firebase Errors

#### "Permission denied" when logging meals
**Solution:** Deploy Firestore security rules
1. Copy rules from `firestore.rules`
2. Go to Firebase Console → Firestore → Rules
3. Paste and publish

#### "User not found" after signup
**Solution:** Enable Email/Password authentication in Firebase Console

---

## 📚 Additional Resources

### Documentation

- **Backend API**: See [`backend/README.md`](backend/README.md) for complete API documentation
- **Firestore Rules**: See `firestore.rules` for data access rules
- **Original Setup**: See `SETUP.md` for the original setup guide

### External Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Firebase Docs](https://firebase.google.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Express.js Guide](https://expressjs.com/)

### Team Workflow

#### Daily Development
1. Pull latest changes: `git pull origin main`
2. Start backend with service account environment variable
3. Start frontend with Expo
4. Test features
5. Commit and push to feature branch
6. Create pull request for review

#### Environment Variables
- **Never commit** `.env` files
- **Never commit** `service-account.json`
- Each developer should have their own local credentials
- Use `.env.example` files as templates

#### Git Workflow
- Create feature branches: `git checkout -b feature/your-feature`
- Commit often with clear messages
- Push to your branch: `git push origin feature/your-feature`
- Create PR when ready for review
- Delete branch after merge

---

## 🤝 Getting Help

If you encounter issues not covered here:

1. **Check console logs** - Both terminal and browser/device console
2. **Verify environment variables** - Make sure all required vars are set
3. **Check Firebase Console** - Verify authentication and Firestore are enabled
4. **Review error messages** - Most errors point to the exact problem
5. **Ask your team** - Contact your team lead or other developers

---

## ✨ What's Next?

After setup is complete:

1. **Explore the codebase** - Familiarize yourself with the file structure
2. **Run the app** - Try logging in, creating an account, logging meals
3. **Test both user types** - Try both patient and doctor accounts
4. **Read backend docs** - Understand the API endpoints
5. **Make your first change** - Pick a small feature or bug fix
6. **Create a pull request** - Submit your first contribution!

---

**Welcome to the NutriMind team! Happy coding! 🎉**
