# NutriMind — Bariatric Recovery Tracker

Small team project: Expo + React Native frontend and an Express backend using Firebase/Auth/Firestore.

Quick links
- Setup guide: [SETUP.md](SETUP.md)
- Backend details: [backend/ADMIN_SETUP.md](backend/ADMIN_SETUP.md)
- Firestore rules: [firestore.rules](firestore.rules)

Quick start (local)

1) Install dependencies

```bash
# frontend
cd NutriMind && npm install

# backend
cd ../backend && npm install
```

2) Backend (use application default credentials)

Place your service account JSON at `backend/service-account.json` (do NOT commit). Then:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/backend/service-account.json"
node backend/server.js
```

3) Frontend

```bash
cd ../NutriMind
npx expo start
```

Notes
- Team recommended workflow: each developer keeps their own `backend/service-account.json` and sets `GOOGLE_APPLICATION_CREDENTIALS` before starting the server. See [backend/ADMIN_SETUP.md](backend/ADMIN_SETUP.md) for details.
- Do not commit service account JSON to git; `backend/service-account.json` is added to `.gitignore`.

If you want, I can open a PR with these changes or add a short contributor checklist. 
