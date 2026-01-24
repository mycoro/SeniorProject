# Setup Instructions

This guide will help you set up the NutriMind project on your local machine.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase account
- OpenAI API account

## Step 1: Clone the Repository

```bash
git clone git@github.com:mycoro/SeniorProject.git
cd SeniorProject
git checkout sujit-ai-chatbot-feature
```

## Step 2: Install Dependencies

### Frontend (NutriMind)
```bash
cd NutriMind
npm install
```

### Backend
```bash
cd ../backend
npm install
```

## Step 3: Configure Environment Variables

### Backend Setup

1. Copy the example environment file:
```bash
cd backend
cp .env.example .env
```

2. Get your OpenAI API key:
   - Go to https://platform.openai.com/
   - Sign up or log in
   - Navigate to [API Keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)
   - Paste it in `backend/.env`:
     ```
     OPENAI_API_KEY=sk-your-key-here
     ```

### Frontend Setup

1. Copy the example environment file:
```bash
cd NutriMind
cp .env.example .env
```

2. Get your Firebase configuration:
   - Go to https://console.firebase.google.com/
   - Create a new project or select existing
   - Click the gear icon → Project Settings
   - Scroll to "Your apps" → Add web app (</> icon)
   - Copy the config values
   - Paste them in `NutriMind/.env`:
     ```
     EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
     EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
     EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
     ```

3. Set up Firestore Security Rules:
   - In Firebase Console, go to Firestore Database
   - Click on "Rules" tab
   - Copy the rules from `firestore.rules` in the project root
   - Paste and publish the rules

## Step 4: Start the Backend Server

```bash
cd backend
node server.js
```

The server will run on `http://localhost:3000`

## Step 5: Start the Expo App

In a new terminal:

```bash
cd NutriMind
npx expo start
```

Scan the QR code with Expo Go app on your phone, or press `i` for iOS simulator / `a` for Android emulator.

## Troubleshooting

### API Connection Issues
- Make sure backend is running on port 3000
- Ensure your phone/laptop are on the same WiFi network
- Check that `EXPO_PUBLIC_API_URL` in `.env` matches your backend URL (or leave empty for auto-detection)

### Firebase Errors
- Verify all Firebase config values are correct in `.env`
- Make sure Firestore security rules are deployed
- Check that Firebase Authentication is enabled in Firebase Console

### OpenAI API Errors
- Verify your API key is correct in `backend/.env`
- Check your OpenAI account has available credits
- Ensure the API key has proper permissions

## Getting Help

If you encounter issues:
1. Check that all environment variables are set correctly
2. Verify all dependencies are installed
3. Make sure both backend and frontend are running
4. Check the console for error messages

