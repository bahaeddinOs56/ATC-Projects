const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const multer = require("multer");

const ROOT = __dirname;
const CONTENT_PATH = path.join(ROOT, "data", "content.json");
const UPLOAD_DIR = path.join(ROOT, "assets", "images", "uploads");
const PORT = Number(process.env.PORT) || 5173;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "atcadmin2024";
const SESSION_SECRET = process.env.SESSION_SECRET || "atc-projects-dev-secret";
const IS_PROD = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
if (IS_PROD) app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser(SESSION_SECRET));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safe = ext.replace(/[^.a-z0-9]/g, "") || ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Seules les images sont acceptées"));
      return;
    }
    cb(null, true);
  },
});

function readContent() {
  return JSON.parse(fs.readFileSync(CONTENT_PATH, "utf8"));
}

function writeContent(data) {
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(data, null, 2), "utf8");
}

function isAuthed(req) {
  return req.signedCookies?.atc_admin === "1";
}

function requireAuth(req, res, next) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }
  next();
}

app.get("/api/content", (_req, res) => {
  try {
    res.json(readContent());
  } catch (err) {
    res.status(500).json({ error: "Impossible de lire le contenu" });
  }
});

app.get("/api/auth/status", (req, res) => {
  res.json({ ok: isAuthed(req) });
});

app.post("/api/auth/login", (req, res) => {
  const password = String(req.body?.password || "");
  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Mot de passe incorrect" });
    return;
  }
  res.cookie("atc_admin", "1", {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: IS_PROD,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ ok: true });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("atc_admin", { secure: IS_PROD, sameSite: "lax" });
  res.json({ ok: true });
});

app.put("/api/content", requireAuth, (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ error: "Contenu invalide" });
      return;
    }
    writeContent(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Échec de la sauvegarde" });
  }
});

app.post("/api/upload", requireAuth, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload échoué" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Aucun fichier reçu" });
      return;
    }
    const url = `assets/images/uploads/${req.file.filename}`;
    res.json({ ok: true, url });
  });
});

app.get(["/admins", "/admins/", "/admin", "/admin/"], (_req, res) => {
  res.sendFile(path.join(ROOT, "admins", "index.html"));
});

app.use(express.static(ROOT));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ATC PROJECTS → http://localhost:${PORT}`);
  console.log(`Admins       → http://localhost:${PORT}/admins`);
  console.log(
    `Mot de passe → ${ADMIN_PASSWORD === "atcadmin2024" ? "atcadmin2024 (à changer)" : "(défini via ADMIN_PASSWORD)"}`
  );
});
