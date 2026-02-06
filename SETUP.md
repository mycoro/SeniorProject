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

3. Firebase Admin (server) credentials (team setup)

For local development we recommend each developer use their own service account JSON and point to it with `GOOGLE_APPLICATION_CREDENTIALS`.

Steps:

- Download a service account JSON from Firebase Console → Project Settings → Service accounts → "Generate new private key".
- Save it somewhere local (for example `backend/service-account.json`). DO NOT commit this file.
- Add `backend/service-account.json` to your `.gitignore`.
- Start the server with:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/backend/service-account.json"
node backend/server.js
```

If you prefer not to set `GOOGLE_APPLICATION_CREDENTIALS`, you can also provide the JSON via the `FIREBASE_SERVICE_ACCOUNT` environment variable (not recommended for VCS).
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
- For physical devices, set `EXPO_PUBLIC_API_URL` in NutriMind/.env to your machine's IP and port (e.g. http://YOUR_IP:3000). Leave empty for auto-detection when using simulator.

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

## Additional Developer Notes

- Expo clipboard support:
   - The app uses `expo-clipboard` for copying invite codes. Install it in the `NutriMind` folder with one of the following (prefer `expo` to match native modules):
      ```bash
      cd NutriMind
      expo install expo-clipboard
      # or
      npm install expo-clipboard
      ```
   - After installing, restart the Metro bundler / TypeScript server (close and `npm start` / `expo start`).
   - If TypeScript still reports missing types for `expo-clipboard`, add a small declaration file at `NutriMind/declarations.d.ts` with:
      ```ts
      declare module 'expo-clipboard';
      ```

- Backend Firebase Admin credentials:
   - Recommended: set `GOOGLE_APPLICATION_CREDENTIALS` to point to your local service account JSON (do NOT commit this file).
      ```bash
      export GOOGLE_APPLICATION_CREDENTIALS="$PWD/backend/service-account.json"
      node backend/server.js
      ```
   - Alternative (team/shared CI): set `FIREBASE_SERVICE_ACCOUNT` to the raw JSON contents of the service account. This is less secure and not recommended for code repositories.

- Restarting dev tooling:
   - After changing native modules or TypeScript declarations, restart the packager and your editor's TypeScript server.
      ```bash
      # in one terminal
      cd NutriMind
      npm start

      # in another terminal (backend)
      cd backend
      node server.js
      ```

- Developer convenience scripts:
   - There is a helper script in `backend/create_doctor_and_token.js` used during development to create test accounts and obtain ID tokens. Use only with local service account credentials.

If you'd like, I can add the `declarations.d.ts` file automatically and update `NutriMind/package.json` with a `postinstall` script to ensure `expo-clipboard` is installed. Want me to add either of those?


