# Backend local setup

This backend uses the Firebase Admin SDK for server-side operations (setting custom claims, managing invites, reading/writing Firestore).

For security and team convenience we recommend using Application Default Credentials (ADC) via `GOOGLE_APPLICATION_CREDENTIALS`.

## Recommended: per-developer local file with ADC
1. Download a service account JSON from Firebase Console → Project Settings → Service accounts → "Generate new private key".
2. Save the file somewhere local, e.g. `backend/service-account.json` (do NOT commit this file).
3. Add `backend/service-account.json` to your `.gitignore` if it's not already ignored.
4. Start the server with ADC:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/backend/service-account.json"
node backend/server.js
```

This will initialize the Admin SDK using the application default credential provider.

## Alternative: inline JSON env (not recommended for VCS)
You can also provide the service account JSON string directly via the `FIREBASE_SERVICE_ACCOUNT` environment variable.

```bash
# compact JSON (requires jq)
FIREBASE_SERVICE_ACCOUNT="$(jq -c . backend/service-account.json)" node backend/server.js

# or without jq
export FIREBASE_SERVICE_ACCOUNT="$(cat backend/service-account.json)"
node backend/server.js
```

## What the server logs mean
- "Firebase Admin initialized using application default credentials (GOOGLE_APPLICATION_CREDENTIALS)"
  - Admin is initialized from `GOOGLE_APPLICATION_CREDENTIALS`.
- "Firebase Admin initialized using FIREBASE_SERVICE_ACCOUNT"
  - Admin is initialized from `FIREBASE_SERVICE_ACCOUNT` env JSON.
- "FIREBASE_SERVICE_ACCOUNT not set and GOOGLE_APPLICATION_CREDENTIALS not provided — Admin SDK not initialized"
  - Admin SDK is not initialized; admin-only endpoints will fail. Set one of the methods above.

## Security notes
- Never commit service account JSON into source control.
- For CI/CD and production, store service account JSON as a secret and set `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT` in the environment securely.

## Quick test
Start server and hit health endpoint:

```bash
node backend/server.js
curl http://localhost:3000/health
```

If admin is initialized, you'll see the initialization log in server output.
