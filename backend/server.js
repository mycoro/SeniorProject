import "dotenv/config";
import express from "express";
import cors from "cors";
import admin from "firebase-admin";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/check-key", (_req, res) => {
  const key = process.env.OPENAI_API_KEY;
  const set = Boolean(key && key.trim().length > 10);
  res.json({ openaiKeySet: set, keyLength: set ? key.trim().length : 0 });
});

// Initialize Firebase Admin SDK.
// Preferred: use application default credentials via GOOGLE_APPLICATION_CREDENTIALS.
// Fallback: set FIREBASE_SERVICE_ACCOUNT to the JSON contents of a service account key.
try {
  const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT || "";

  if (gacPath) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log("Firebase Admin initialized using application default credentials (GOOGLE_APPLICATION_CREDENTIALS)");
  } else if (svcJson) {
    const svc = JSON.parse(svcJson);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    console.log("Firebase Admin initialized using FIREBASE_SERVICE_ACCOUNT");
  } else {
    // Check for a local service account file as a convenience for developers.
    // Support starting the server from the repo root or from the backend folder.
    const fs = await import('fs');
    const pathModule = await import('path');
    const urlModule = await import('url');
    const __filename = urlModule.fileURLToPath(import.meta.url);
    const __dirname = pathModule.dirname(__filename);
    const candidateA = pathModule.resolve(__dirname, 'service-account.json'); // backend/service-account.json when running from backend
    const candidateB = pathModule.resolve(process.cwd(), 'backend/service-account.json'); // when running from repo root
    let foundPath = null;
    if (fs.existsSync(candidateA)) foundPath = candidateA;
    else if (fs.existsSync(candidateB)) foundPath = candidateB;

    if (foundPath) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(foundPath, 'utf8'))) });
      console.log(`Firebase Admin initialized using ${foundPath}`);
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not set and GOOGLE_APPLICATION_CREDENTIALS not provided — Admin SDK not initialized');
    }
  }
} catch (err) {
  console.error("Failed to initialize Firebase Admin:", err);
}

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const parts = String(h).split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

function isAdminInitialized() {
  return Array.isArray(admin.apps) && admin.apps.length > 0;
}

async function isDoctorUser(authObj) {
  if (!authObj || !authObj.uid) return false;
  if (authObj.doctor) return true;
  try {
    const snap = await admin.firestore().collection('users').doc(authObj.uid).get();
    if (!snap.exists) return false;
    const role = snap.data() && snap.data().role;
    return role === 'healthcare_prof';
  } catch (err) {
    console.error('Error checking user role in Firestore:', err);
    return false;
  }
}

// Create invite (doctors only)
app.post("/api/invites", async (req, res) => {
  try {
    if (!isAdminInitialized()) return res.status(503).json({ error: "Server misconfigured: Firebase Admin not initialized" });
    const idToken = getBearerToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing id token" });
    const auth = await admin.auth().verifyIdToken(idToken);
    if (!auth || !auth.uid) return res.status(401).json({ error: "Invalid token" });
    // require doctor: either custom claim or users.role in Firestore
    if (!(await isDoctorUser(auth))) return res.status(403).json({ error: "Only doctors can create invites" });

    const ttlHours = Number(req.body.ttlHours) || 72;
    const inviteeName = typeof req.body.inviteeName === 'string' ? String(req.body.inviteeName).trim() : null;
    const code = Math.random().toString(36).slice(2, 9).toUpperCase();
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + ttlHours * 3600 * 1000));
    const docRef = await admin.firestore().collection("invites").add({
      code,
      inviteeName: inviteeName || null,
      createdBy: auth.uid,
      createdAt: now,
      expiresAt,
      usedBy: null,
    });
    res.json({ ok: true, code, inviteId: docRef.id });
  } catch (err) {
    console.error("/api/invites error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// Verify invite code (returns inviteId)
app.post("/api/invites/verify", async (req, res) => {
  try {
    if (!isAdminInitialized()) return res.status(503).json({ error: "Server misconfigured: Firebase Admin not initialized" });
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "code required" });
    const q = await admin.firestore().collection("invites").where("code", "==", String(code).toUpperCase()).limit(1).get();
    if (q.empty) return res.status(404).json({ error: "Invite not found" });
    const doc = q.docs[0];
    const data = doc.data();
    if (data.usedBy) return res.status(400).json({ error: "Invite already used" });
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) return res.status(400).json({ error: "Invite expired" });
    res.json({ ok: true, inviteId: doc.id, code: data.code });
  } catch (err) {
    console.error("/api/invites/verify error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// Claim invite and set doctor custom claim for the authenticated user
app.post("/api/invites/claim", async (req, res) => {
  try {
    if (!isAdminInitialized()) return res.status(503).json({ error: "Server misconfigured: Firebase Admin not initialized" });
    const idToken = getBearerToken(req);
    const { inviteId } = req.body || {};
    if (!idToken) return res.status(401).json({ error: "Missing id token" });
    if (!inviteId) return res.status(400).json({ error: "inviteId required" });
    const auth = await admin.auth().verifyIdToken(idToken);
    if (!auth || !auth.uid) return res.status(401).json({ error: "Invalid token" });

    const invRef = admin.firestore().collection("invites").doc(String(inviteId));
    const invSnap = await invRef.get();
    if (!invSnap.exists) return res.status(404).json({ error: "Invite not found" });
    const data = invSnap.data();
    if (data.usedBy) return res.status(400).json({ error: "Invite already used" });
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) return res.status(400).json({ error: "Invite expired" });

    await invRef.update({ usedBy: auth.uid, usedAt: admin.firestore.FieldValue.serverTimestamp() });
    // For invites created by a doctor and claimed by a patient, link the patient
    // to the creating doctor. Also enforce the claimant's role: do NOT grant
    // doctor privileges as a result of claiming an invite. If the claimant
    // already has a doctor custom claim, preserve/upgrade to healthcare_prof.
    try {
      const doctorUid = data.createdBy || null;
      if (doctorUid) {
        // Add the doctor to the claimant's assignedDoctors array
        await admin.firestore().collection("users").doc(auth.uid).set({
          assignedDoctors: admin.firestore.FieldValue.arrayUnion(doctorUid),
        }, { merge: true });
      }

      // Inspect claimant's auth claims
      let claimantIsDoctor = false;
      try {
        const userRecord = await admin.auth().getUser(auth.uid);
        claimantIsDoctor = Boolean(userRecord.customClaims && userRecord.customClaims.doctor);
      } catch (err) {
        console.warn('Could not fetch claimant auth record to inspect claims:', err);
      }

      if (claimantIsDoctor) {
        // Ensure role reflects a healthcare professional
        await admin.firestore().collection("users").doc(auth.uid).set({ role: 'healthcare_prof' }, { merge: true });
      } else {
        // Make sure the claimer is marked as a patient and clear any accidental doctor claim
        await admin.firestore().collection("users").doc(auth.uid).set({ role: 'patient' }, { merge: true });
        try {
          await admin.auth().setCustomUserClaims(auth.uid, {});
        } catch (err) {
          console.warn('Failed to clear custom claims for claimant after invite claim:', err);
        }
      }
    } catch (err) {
      console.error('Failed to update claimant user document after invite claim:', err);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("/api/invites/claim error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// Get patients assigned to a doctor
app.get("/api/doctor/patients", async (req, res) => {
  try {
    if (!isAdminInitialized()) return res.status(503).json({ error: "Server misconfigured: Firebase Admin not initialized" });
    const idToken = getBearerToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing id token" });
    const auth = await admin.auth().verifyIdToken(idToken);
    if (!auth || !auth.uid) return res.status(401).json({ error: "Invalid token" });
    if (!(await isDoctorUser(auth))) return res.status(403).json({ error: "Only doctors allowed" });

    // Query users where assignedDoctors array contains this doctor uid
    const q = await admin.firestore().collection("users").where("assignedDoctors", "array-contains", auth.uid).get();
    const patients = q.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        name: data.name || null,
        email: data.email || null,
        surgeryDate: data.surgeryDate || null,
        surgeryType: data.surgeryType || null,
        assignedDoctors: data.assignedDoctors || [],
      };
    });
    res.json({ ok: true, patients });
  } catch (err) {
    console.error("/api/doctor/patients error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// Get full patient profile + today's nutrition (doctors only)
app.get("/api/doctor/patient", async (req, res) => {
  try {
    if (!isAdminInitialized()) return res.status(503).json({ error: "Server misconfigured: Firebase Admin not initialized" });
    const idToken = getBearerToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing id token" });
    const auth = await admin.auth().verifyIdToken(idToken);
    if (!auth || !auth.uid) return res.status(401).json({ error: "Invalid token" });
    if (!(await isDoctorUser(auth))) return res.status(403).json({ error: "Only doctors allowed" });

    const patientId = String(req.query.patientId || "").trim();
    if (!patientId) return res.status(400).json({ error: "patientId required" });

    const userRef = admin.firestore().collection('users').doc(patientId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "Patient not found" });
    const data = userSnap.data() || {};

    // compute today's nutrition from mealLogs
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);
    const logsQ = await admin.firestore().collection('users').doc(patientId).collection('mealLogs')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(start))
      .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(end)).get();
    let proteinSum = 0, calorieSum = 0, fluidsSum = 0;
    let found = false;
    logsQ.forEach((d) => {
      const item = d.data() || {};
      found = true;
      proteinSum += Number(item.protein) || 0;
      calorieSum += Number(item.calories) || 0;

      // Determine fluid amount (in ounces).
      // Prefer explicit numeric fields `fluids` or `fluid`.
      // Fallback: parse the `name` for patterns like "(8oz)" or "8 oz".
      let fluidAmount = 0;
      if (item.fluids != null) {
        fluidAmount = Number(item.fluids) || 0;
      } else if (item.fluid != null) {
        fluidAmount = Number(item.fluid) || 0;
      } else if (item.name && typeof item.name === 'string') {
        const name = item.name;
        const m = name.match(/\((\d+(?:\.\d+)?)\s*oz\)/i) || name.match(/(\d+(?:\.\d+)?)\s*oz/i);
        if (m && m[1]) {
          fluidAmount = parseFloat(m[1]) || 0;
        }
      } else if (item.mealType === 'Fluid' && item.amount != null) {
        fluidAmount = Number(item.amount) || 0;
      }

      fluidsSum += fluidAmount;
    });

    res.json({ ok: true, patient: {
      uid: patientId,
      name: data.name || null,
      sex: data.sex || null,
      dateOfBirth: data.dateOfBirth || null,
      surgeryType: data.surgeryType || null,
      surgeryDate: data.surgeryDate || null,
      currentWeight: data.currentWeight || null,
      startingWeight: data.startingWeight || null,
      goalWeight: data.goalWeight || null,
      proteinGoal: data.proteinGoal || null,
      fluidGoal: data.fluidGoal || null,
      calorieGoal: data.calorieGoal || null,
      notes: data.notes || null,
    }, today: {
      protein: found ? proteinSum : null,
      calories: found ? calorieSum : null,
      fluids: found ? fluidsSum : null,
    }});
  } catch (err) {
    console.error('/api/doctor/patient error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Allow a doctor to save clinical notes to a patient's profile
app.post("/api/doctor/patient/notes", async (req, res) => {
  try {
    if (!isAdminInitialized()) return res.status(503).json({ error: "Server misconfigured: Firebase Admin not initialized" });
    const idToken = getBearerToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing id token" });
    const auth = await admin.auth().verifyIdToken(idToken);
    if (!auth || !auth.uid) return res.status(401).json({ error: "Invalid token" });
    if (!(await isDoctorUser(auth))) return res.status(403).json({ error: "Only doctors allowed" });

    const { patientId, notes } = req.body || {};
    if (!patientId) return res.status(400).json({ error: "patientId required" });

    const userRef = admin.firestore().collection('users').doc(String(patientId));
    const snap = await userRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Patient not found" });

    await userRef.set({ notes: typeof notes === 'string' ? notes : null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    res.json({ ok: true });
  } catch (err) {
    console.error('/api/doctor/patient/notes error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get invites created by the authenticated doctor (history)
app.get("/api/doctor/invites", async (req, res) => {
  try {
    if (!isAdminInitialized()) return res.status(503).json({ error: "Server misconfigured: Firebase Admin not initialized" });
    const idToken = getBearerToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing id token" });
    const auth = await admin.auth().verifyIdToken(idToken);
    if (!auth || !auth.uid) return res.status(401).json({ error: "Invalid token" });
    if (!(await isDoctorUser(auth))) return res.status(403).json({ error: "Only doctors allowed" });

    // Query invites created by this doctor. Avoid using Firestore `orderBy` here
    // to prevent requiring a composite index; sort in-memory instead.
    const q = await admin.firestore().collection("invites").where("createdBy", "==", auth.uid).get();
    const now = new Date();
    const invites = q.docs.map((d) => {
      const data = d.data();
      const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : null;
      const expiresAt = data.expiresAt && data.expiresAt.toDate ? data.expiresAt.toDate().toISOString() : null;
      const usedAt = data.usedAt && data.usedAt.toDate ? data.usedAt.toDate().toISOString() : null;
      let status = "unused";
      if (data.usedBy) status = "used";
      else if (data.expiresAt && data.expiresAt.toDate && data.expiresAt.toDate() < now) status = "expired";

      return {
        inviteId: d.id,
        code: data.code,
        inviteeName: data.inviteeName || null,
        createdAt,
        expiresAt,
        usedBy: data.usedBy || null,
        usedAt,
        status,
      };
    });

    // Sort by createdAt desc (newest first)
    invites.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });

    res.json({ ok: true, invites });
  } catch (err) {
    console.error("/api/doctor/invites error:", err);
    res.status(500).json({
      error: "Internal error",
      message: err && err.message ? err.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

// Search patients by email (doctors only)
app.get("/api/doctor/search", async (req, res) => {
  try {
    if (!isAdminInitialized()) return res.status(503).json({ error: "Server misconfigured: Firebase Admin not initialized" });
    const idToken = getBearerToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing id token" });
    const auth = await admin.auth().verifyIdToken(idToken);
    if (!auth || !auth.uid) return res.status(401).json({ error: "Invalid token" });
    if (!(await isDoctorUser(auth))) return res.status(403).json({ error: "Only doctors allowed" });

    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "email query required" });

    const q = await admin.firestore().collection("users").where("email", "==", email).limit(5).get();
    const results = q.docs.map((d) => ({ uid: d.id, ...d.data() }));
    res.json({ ok: true, results });
  } catch (err) {
    console.error("/api/doctor/search error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// Assign a patient to the authenticated doctor
app.post("/api/doctor/assign", async (req, res) => {
  try {
    if (!isAdminInitialized()) return res.status(503).json({ error: "Server misconfigured: Firebase Admin not initialized" });
    const idToken = getBearerToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing id token" });
    const auth = await admin.auth().verifyIdToken(idToken);
    if (!auth || !auth.uid) return res.status(401).json({ error: "Invalid token" });
    if (!(await isDoctorUser(auth))) return res.status(403).json({ error: "Only doctors allowed" });

    const { patientId } = req.body || {};
    if (!patientId) return res.status(400).json({ error: "patientId required" });

    const patientRef = admin.firestore().collection("users").doc(String(patientId));
    const snap = await patientRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Patient not found" });

    await patientRef.update({ assignedDoctors: admin.firestore.FieldValue.arrayUnion(auth.uid) });
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/doctor/assign error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// Unassign a patient from the authenticated doctor
app.post("/api/doctor/unassign", async (req, res) => {
  try {
    if (!isAdminInitialized()) return res.status(503).json({ error: "Server misconfigured: Firebase Admin not initialized" });
    const idToken = getBearerToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing id token" });
    const auth = await admin.auth().verifyIdToken(idToken);
    if (!auth || !auth.uid) return res.status(401).json({ error: "Invalid token" });
    if (!auth.doctor) return res.status(403).json({ error: "Only doctors allowed" });

    const { patientId } = req.body || {};
    if (!patientId) return res.status(400).json({ error: "patientId required" });

    const patientRef = admin.firestore().collection("users").doc(String(patientId));
    const snap = await patientRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Patient not found" });

    await patientRef.update({ assignedDoctors: admin.firestore.FieldValue.arrayRemove(auth.uid) });
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/doctor/unassign error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

function isAllowedImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) return false;
  try {
    const parsed = new URL(u);
    const host = (parsed.hostname || "").toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.") || host.startsWith("10.") || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

app.get("/api/image-proxy", async (req, res) => {
  try {
    const raw = req.query.url;
    if (!raw) {
      return res.status(400).send("Missing url");
    }
    const url = decodeURIComponent(String(raw));
    if (!isAllowedImageUrl(url)) {
      return res.status(400).send("Invalid url");
    }
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const imgRes = await fetch(url, {
      headers: { "User-Agent": ua, Accept: "image/*" },
      redirect: "follow",
    });
    if (!imgRes.ok) {
      return res.status(imgRes.status).send("Image fetch failed");
    }
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const buf = await imgRes.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error("Image proxy error:", err);
    res.status(502).send("Image unavailable");
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { userId, userMessage, userProfile, activitySummary, conversationHistory } = req.body;

    if (!userId || !userMessage) {
      return res.status(400).json({ error: "userId and userMessage are required" });
    }

    if (!userProfile) {
      return res.status(400).json({ error: "userProfile is required. Include surgeryDate from Firestore." });
    }

    const { getDietResponse } = await import("./services/aiService.js");
    const result = await getDietResponse(userId, userMessage, userProfile, activitySummary, conversationHistory);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Chat endpoint error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Internal server error", details: error.message, stack: process.env.NODE_ENV === "development" ? error.stack : undefined });
  }
});

// Process meal from text or audio (voice log / AI describe)
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.post("/api/process-meal", upload.single("audio"), async (req, res) => {
  try {
    const { transcribeAudio, parseMealText } = await import("./services/mealParser.js");

    let mealText;

    if (req.file) {
      const audioBuffer = req.file.buffer;
      const mimeType = req.file.mimetype || "audio/webm";
      mealText = await transcribeAudio(audioBuffer, mimeType);
    } else {
      mealText = req.body.text;
    }

    if (!mealText || !String(mealText).trim()) {
      return res.status(400).json({ error: "No meal description provided. Speak or type what you ate." });
    }

    const userProfile = req.body.userProfile
      ? (typeof req.body.userProfile === "string" ? JSON.parse(req.body.userProfile) : req.body.userProfile)
      : {};

    const result = await parseMealText(String(mealText).trim(), userProfile);

    res.json({
      success: true,
      transcription: mealText,
      ...result,
    });
  } catch (error) {
    console.error("/api/process-meal error:", error);
    const msg = error?.message || String(error);
    if (msg.includes("API key") || msg.includes("api_key")) {
      return res.status(500).json({ error: "OpenAI API key issue. Check backend/.env" });
    }
    res.status(500).json({ error: msg || "Failed to process meal. Please try again." });
  }
});

app.post("/api/analyze-photo", async (req, res) => {
  try {
    const { imageBase64, userProfile } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    if (!userProfile) {
      return res.status(400).json({ error: "userProfile is required. Include surgeryDate from Firestore." });
    }

    const { analyzeFoodPhoto } = await import("./services/photoAnalysis.js");
    const result = await analyzeFoodPhoto(imageBase64, userProfile);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Photo analysis endpoint error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
});
