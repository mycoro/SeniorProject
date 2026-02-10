# Invite API (backend)

This file documents the invite endpoints used to allow doctors to sign up.

Environment
- Set `FIREBASE_SERVICE_ACCOUNT` to the JSON contents of a service account key.
- Ensure backend is reachable by the app. Configure `EXPO_PUBLIC_API_URL` or `API_BASE_URL` in the client.

Endpoints

1) Create invite (doctors only)

POST /api/invites
Headers: `Authorization: Bearer <DOCTOR_ID_TOKEN>`
Body: `{ "ttlHours": 72 }` (optional)

Response: `{ ok: true, code, inviteId }`

2) Verify invite code

POST /api/invites/verify
Body: `{ "code": "ABC123" }`

Response: `{ ok: true, inviteId, code }`

3) Claim invite (after new user signs up)

POST /api/invites/claim
Headers: `Authorization: Bearer <NEW_USER_ID_TOKEN>`
Body: `{ "inviteId": "<INVITE_DOC_ID>" }`

Response: `{ ok: true }` — the server will link the claimant to the creating doctor by adding the doctor's UID into `users/{claimantUid}.assignedDoctors`. Claiming an invite does NOT grant doctor privileges or set `users/{uid}.role` to `doctor`.
If the claimant already has a `doctor` custom claim (i.e. a real doctor account), the server will ensure their Firestore role is `healthcare_prof`.

Quick curl examples

Create invite (doctor token required):

```bash
curl -X POST http://localhost:3000/api/invites \
  -H "Authorization: Bearer $DOCTOR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ttlHours":72}'
```

Verify invite:

```bash
curl -X POST http://localhost:3000/api/invites/verify \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC123"}'
```

Claim invite (for new user):

```bash
curl -X POST http://localhost:3000/api/invites/claim \
  -H "Authorization: Bearer $NEW_USER_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inviteId":"<INVITE_DOC_ID>"}'
```

Notes
- After `/api/invites/claim` the client should refresh the ID token to pick up custom claims: `await auth.currentUser.getIdToken(true)`.
- Adjust collection names in Firestore rules if your data model differs.

Doctor patient management endpoints

1) Search patients by email (doctors only)

GET /api/doctor/search?email=you@example.com
Headers: `Authorization: Bearer <DOCTOR_ID_TOKEN>`

Response: `{ ok: true, results: [{ uid, email, name, ... }]}`

2) Assign a patient to the authenticated doctor

POST /api/doctor/assign
Headers: `Authorization: Bearer <DOCTOR_ID_TOKEN>`
Body: `{ "patientId": "<PATIENT_UID>" }`

Response: `{ ok: true }`

3) Unassign a patient from the authenticated doctor

POST /api/doctor/unassign
Headers: `Authorization: Bearer <DOCTOR_ID_TOKEN>`
Body: `{ "patientId": "<PATIENT_UID>" }`

Response: `{ ok: true }`
