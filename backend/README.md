# Backend Setup & API Documentation

This backend provides API endpoints for the NutriMind bariatric recovery app, including:
- AI-powered nutrition chatbot (OpenAI)
- Doctor-patient invite system
- Patient data management
- Meal logging and analysis

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm
- Firebase project with Admin SDK access
- OpenAI API key

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# OpenAI API Key (required for AI chatbot)
OPENAI_API_KEY=sk-your-openai-key-here

# Firebase service account (see detailed setup below)
# Option 1: Set GOOGLE_APPLICATION_CREDENTIALS as environment variable (recommended)
# Option 2: Set FIREBASE_SERVICE_ACCOUNT here (not recommended for version control)
```

### 3. Set Up Firebase Admin SDK (REQUIRED)

**The backend REQUIRES Firebase Admin credentials to function.** Choose one of the methods below:

---

## 🔑 Firebase Service Account Setup (Detailed)

The Firebase Admin SDK needs authentication to manage users, invites, and Firestore data. You have two options:

### ✅ **Option 1: Application Default Credentials (RECOMMENDED)**

This is the **safest and cleanest** method for local development.

#### Step-by-Step Instructions:

**1. Download Service Account Key from Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **gear icon ⚙️** next to "Project Overview"
4. Go to **"Project Settings"**
5. Click the **"Service accounts"** tab
6. Click **"Generate new private key"** button
7. Click **"Generate key"** in the confirmation dialog
8. A JSON file will download (e.g., `your-project-firebase-adminsdk-xxxxx.json`)

**2. Save the File Locally**

```bash
# Save it in the backend folder
mv ~/Downloads/your-project-firebase-adminsdk-xxxxx.json backend/service-account.json
```

**3. Verify .gitignore**

Make sure `backend/service-account.json` is in `.gitignore`:

```bash
# Check if it's ignored
cat backend/.gitignore | grep service-account.json
```

If not present, add it:
```
service-account.json
```

**4. Start the Server with Environment Variable**

```bash
cd backend

# Set the environment variable (required each time you start)
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/service-account.json"

# Start the server
npm start
```

**5. (Optional) Add to Shell Profile for Persistence**

To avoid setting the variable every time, add to `~/.zshrc` or `~/.bashrc`:

```bash
# Add this line
export GOOGLE_APPLICATION_CREDENTIALS="/Users/YOUR_USERNAME/path/to/SeniorProject/backend/service-account.json"

# Reload shell config
source ~/.zshrc  # or source ~/.bashrc
```

---

### ⚠️ **Option 2: Inline JSON Environment Variable (NOT RECOMMENDED)**

If you cannot set environment variables, you can put the entire JSON in your `.env` file:

**Add to `backend/.env`:**
```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project",...}'
```

**Warning:** This is less secure because:
- The entire service account is in a file
- Easy to accidentally commit to version control
- Harder to rotate credentials

**Only use this for testing or if Option 1 doesn't work for you.**

---

## ✅ Verify Setup is Working

When you start the backend correctly, you should see:

```
Firebase Admin initialized using application default credentials (GOOGLE_APPLICATION_CREDENTIALS)
Server is running on port 3000
```

### Test the Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"ok":true}
```

### Common Error Messages

❌ **"Firebase Admin not initialized"**
- Service account not configured
- Follow Option 1 or 2 above

❌ **"ENOENT: no such file or directory"**
- `GOOGLE_APPLICATION_CREDENTIALS` path is wrong
- Use absolute path or `$PWD/service-account.json`

❌ **"Cannot find package 'multer'"**
- Dependencies not installed
- Run `npm install`

---

## 🎫 Invite System API

The invite system allows doctors to invite patients to join and be assigned automatically.

### How It Works

1. **Doctor creates an invite code** via the app or API
2. **Invite code is generated** (e.g., "ABC123")
3. **Patient enters the code** during sign-up/onboarding
4. **Patient is automatically assigned** to the doctor's patient list

### API Endpoints

#### 1. Create Invite (Doctor Only)

```bash
POST /api/invites
Headers: Authorization: Bearer <DOCTOR_ID_TOKEN>
Body: { "ttlHours": 72 }  # Optional, defaults to 72 hours
```

**Response:**
```json
{
  "ok": true,
  "code": "ABC123",
  "inviteId": "invite_doc_id"
}
```

**Example (curl):**
```bash
curl -X POST http://localhost:3000/api/invites \
  -H "Authorization: Bearer $DOCTOR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ttlHours":72}'
```

---

#### 2. Verify Invite Code

Checks if an invite code is valid and not expired.

```bash
POST /api/invites/verify
Body: { "code": "ABC123" }
```

**Response:**
```json
{
  "ok": true,
  "inviteId": "invite_doc_id",
  "code": "ABC123"
}
```

**Example (curl):**
```bash
curl -X POST http://localhost:3000/api/invites/verify \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC123"}'
```

---

#### 3. Claim Invite (New User)

Called after a patient signs up to link them to the inviting doctor.

```bash
POST /api/invites/claim
Headers: Authorization: Bearer <NEW_USER_ID_TOKEN>
Body: { "inviteId": "<INVITE_DOC_ID>" }
```

**Response:**
```json
{
  "ok": true
}
```

**What happens:**
- Patient's `assignedDoctors` array is updated with the doctor's UID
- Invite is marked as claimed
- Patient can now be viewed in the doctor's dashboard

**Example (curl):**
```bash
curl -X POST http://localhost:3000/api/invites/claim \
  -H "Authorization: Bearer $NEW_USER_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inviteId":"<INVITE_DOC_ID>"}'
```

**Note:** After claiming, the client should refresh the ID token:
```javascript
await auth.currentUser.getIdToken(true);
```

---

### Doctor-Patient Management

#### Search Patients by Email

```bash
GET /api/doctor/search?email=patient@example.com
Headers: Authorization: Bearer <DOCTOR_ID_TOKEN>
```

**Response:**
```json
{
  "ok": true,
  "results": [
    { "uid": "user123", "email": "patient@example.com", "name": "John Doe" }
  ]
}
```

---

#### Assign Patient to Doctor

```bash
POST /api/doctor/assign
Headers: Authorization: Bearer <DOCTOR_ID_TOKEN>
Body: { "patientId": "<PATIENT_UID>" }
```

---

#### Unassign Patient from Doctor

```bash
POST /api/doctor/unassign
Headers: Authorization: Bearer <DOCTOR_ID_TOKEN>
Body: { "patientId": "<PATIENT_UID>" }
```

---

## 📍 All Available Endpoints

### Health & Utility
- `GET /health` - Health check
- `GET /api/check-key` - Verify OpenAI key is configured

### Invitations
- `POST /api/invites` - Create invite code (doctor only)
- `POST /api/invites/verify` - Verify invite code validity
- `POST /api/invites/claim` - Claim invite (patient)

### Doctor APIs
- `GET /api/doctor/patients` - List assigned patients
- `GET /api/doctor/patient?patientId=<UID>` - Get patient details
- `GET /api/doctor/patient/history?patientId=<UID>` - Patient meal history
- `POST /api/doctor/patient/weight` - Log patient weight
- `POST /api/doctor/patient/notes` - Add clinical notes
- `GET /api/doctor/invites` - List doctor's invites
- `GET /api/doctor/search?email=<EMAIL>` - Search patients
- `POST /api/doctor/assign` - Assign patient to doctor
- `POST /api/doctor/unassign` - Remove patient assignment

### AI & Meal Processing
- `POST /api/chat` - AI chatbot conversations
- `POST /api/process-meal` - Process audio meal logs
- `POST /api/analyze-photo` - Analyze meal photos
- `GET /api/image-proxy` - Proxy for images

---

## 🔒 Security Notes

### DO NOT:
- ❌ Commit `service-account.json` to git
- ❌ Share service account JSON publicly
- ❌ Use service account in client-side code

### DO:
- ✅ Keep `service-account.json` in `.gitignore`
- ✅ Use environment variables for credentials
- ✅ Rotate service account keys periodically
- ✅ Use separate service accounts for dev/prod

### For CI/CD and Production:
- Store service account JSON as a **secret** in your CI/CD platform
- Set `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT` in deployment environment
- Never expose credentials in logs or error messages

---

## 🐛 Troubleshooting

### Backend won't start

**1. Check dependencies are installed:**
```bash
npm install
```

**2. Check environment variables:**
```bash
# Should show your OpenAI key
echo $OPENAI_API_KEY

# Should show path to service account
echo $GOOGLE_APPLICATION_CREDENTIALS
```

**3. Check service account file exists:**
```bash
ls -la backend/service-account.json
```

---

### API returns 401 Unauthorized

- ID token expired - refresh token in frontend
- Wrong user type (e.g., patient accessing doctor endpoint)
- User not authenticated

---

### Invite code not working

- Code may be expired (check `ttlHours`)
- Code already claimed
- Backend not properly initialized with Firebase Admin

---

## 📝 Development Tips

### Starting the Server

```bash
# Option 1: With environment variable
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/backend/service-account.json"
npm start

# Option 2: One-line command
GOOGLE_APPLICATION_CREDENTIALS="$PWD/service-account.json" npm start
```

### Running from Project Root

```bash
cd SeniorProject
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/backend/service-account.json"
node backend/server.js
```

---

## 🤝 Team Workflow

Each developer should:
1. Download their own service account JSON from Firebase
2. Save as `backend/service-account.json` locally
3. Set `GOOGLE_APPLICATION_CREDENTIALS` before starting server
4. **Never commit the service account file**

For shared team environments, consider using a shared development service account (separate from production).

---

## 📚 Additional Resources

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [OpenAI API Documentation](https://platform.openai.com/docs)
