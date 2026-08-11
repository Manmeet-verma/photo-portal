const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { db, save, nextId, now } = require('./src/db');
const { generateCode, sanitizeName } = require('./src/util');

const PORT = process.env.PORT || 3000;
const APP_DIR = __dirname;
const UPLOADS_DIR = path.join(APP_DIR, 'uploads');
const DATA_DIR = path.join(APP_DIR, 'data');

const JWT_SECRET = process.env.JWT_SECRET || 'lenslink-super-secret-change-me';

for (const dir of [UPLOADS_DIR, DATA_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Google Drive credentials (optional). Copy .env.example to .env and fill in.
// ---------------------------------------------------------------------------
let env = {};
try {
  if (fs.existsSync(path.join(APP_DIR, '.env'))) {
    for (const line of fs.readFileSync(path.join(APP_DIR, '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch (e) {}

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
const DRIVE_TOKEN_FILE = path.join(DATA_DIR, 'drive-token.json');

function redirectUri() {
  return `${env.APP_ORIGIN || `http://localhost:${PORT}`}/api/drive/callback`;
}

function readDriveToken() {
  try {
    return JSON.parse(fs.readFileSync(DRIVE_TOKEN_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeDriveToken(token) {
  fs.writeFileSync(DRIVE_TOKEN_FILE, JSON.stringify(token, null, 2));
  save(db); // commit container so folder exists
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
function sign(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    const u = db.users.find((x) => x.id === req.user.id);
    if (!u) return res.status(401).json({ error: 'Account no longer exists' });
    req.user.role = u.role; // always trust the live role
    req.user.email = u.email;
    req.user.name = u.name;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please sign in again' });
  }
}

function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Photographer account required' });
  next();
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

// ---------------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(APP_DIR, 'public')));

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const em = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (db.users.some((u) => u.email === em)) return res.status(409).json({ error: 'An account with this email already exists' });

  const user = {
    id: nextId('user'),
    name: String(name).trim(),
    email: em,
    passwordHash: bcrypt.hashSync(String(password), 10),
    role: 'user',
    createdAt: now(),
  };
  db.users.push(user);
  save(db);
  return res.json({ token: sign(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.users.find((u) => u.email === String(email || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  return res.json({ token: sign(user), user: publicUser(user) });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  const u = db.users.find((x) => x.id === req.user.id);
  res.json({ user: publicUser(u) });
});

// ---------------------------------------------------------------------------
// USERS (admin manages the team: photographers + customers)
// ---------------------------------------------------------------------------
app.get('/api/users', authRequired, adminRequired, (req, res) => {
  res.json({ users: db.users.map(publicUser) });
});

app.post('/api/users', authRequired, adminRequired, (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  const em = String(email).trim().toLowerCase();
  if (db.users.some((u) => u.email === em)) return res.status(409).json({ error: 'A user with this email already exists' });
  const user = {
    id: nextId('user'),
    name: String(name).trim(),
    email: em,
    passwordHash: bcrypt.hashSync(String(password), 10),
    role: role === 'admin' ? 'admin' : 'user',
    createdAt: now(),
  };
  db.users.push(user);
  save(db);
  res.status(201).json({ user: publicUser(user) });
});

app.patch('/api/users/:id', authRequired, adminRequired, (req, res) => {
  const u = db.users.find((x) => x.id === Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (u.id === req.user.id && req.body.role === 'user') {
    return res.status(400).json({ error: 'You cannot demote your own account' });
  }
  if (req.body.name) u.name = String(req.body.name).trim();
  if (req.body.role) u.role = req.body.role === 'admin' ? 'admin' : 'user';
  if (req.body.password) u.passwordHash = bcrypt.hashSync(String(req.body.password), 10);
  save(db);
  res.json({ user: publicUser(u) });
});

app.delete('/api/users/:id', authRequired, adminRequired, (req, res) => {
  const i = db.users.findIndex((x) => x.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'User not found' });
  if (db.users[i].id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  db.users.splice(i, 1);
  save(db);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// EVENTS / GALLERIES
// ---------------------------------------------------------------------------
function eventView(e, detail = false) {
  const out = {
    id: e.id,
    title: e.title,
    description: e.description,
    eventDate: e.eventDate,
    code: e.code,
    guestEmails: e.guestEmails,
    createdAt: e.createdAt,
    photoCount: e.photos.length,
    cover: e.photos[0]
      ? `/api/photo/${e.photos[0].id}`
      : null,
    shareUrl: `/s/${e.code}`,
  };
  if (detail) out.photos = e.photos;
  return out;
}

function sendEvent(req, res, e, detail = false) {
  const own = db.users.find((u) => u.id === e.adminId);
  res.json({ item: { ...publicEvent(e, detail), adminName: own ? own.name : 'Photographer' } });
}

function publicEvent(e, detail = false) {
  const out = {
    id: e.id,
    title: e.title,
    description: e.description,
    eventDate: e.eventDate,
    code: e.code,
    guestEmails: e.guestEmails,
    createdAt: e.createdAt,
    photoCount: e.photos.length,
    cover: e.photos[0] ? { id: e.photos[0].id, name: e.photos[0].name } : null,
    shareUrl: `/s/${e.code}`,
    isMine: e.adminId,
  };
  if (detail) out.photos = e.photos.map((p) => ({ id: p.id, name: p.name }));
  return out;
}

function visibleToUser(user) {
  if (user.role === 'admin') return db.events;
  return db.events.filter((e) => (e.guestEmails || []).includes(user.email));
}

app.get('/api/events', authRequired, (req, res) => {
  const events = (req.user.role === 'admin' ? db.events : db.events.filter((e) => (e.guestEmails || []).includes(req.user.email)))
    .map((e) => ({
      ...publicEvent(e),
      admin: db.users.find((u) => u.id === e.adminId)?.name || 'Photographer',
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ events });
});

app.post('/api/events', authRequired, adminRequired, (req, res) => {
  const { title, description, eventDate, guestEmails } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Gallery title is required' });

  let code = generateCode(10);
  while (db.events.some((e) => e.code === code)) code = generateCode(10);

  const event = {
    id: nextId('event'),
    adminId: req.user.id,
    title: String(title).trim(),
    description: String(description || '').trim(),
    eventDate: eventDate || null,
    guestEmails: Array.isArray(guestEmails)
      ? [...new Set(guestEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean))]
      : [],
    code,
    photos: [],
    createdAt: now(),
  };
  db.events.push(event);
  save(db);
  sendEvent(req, res, event);
});

app.get('/api/events/:id', authRequired, (req, res) => {
  const e = db.events.find((x) => x.id === Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'Gallery not found' });
  if (req.user.role !== 'admin' && req.user.id !== e.adminId && !(e.guestEmails || []).includes(req.user.email)) {
    return res.status(403).json({ error: 'Not your gallery' });
  }
  sendEvent(req, res, e, true);
});

app.patch('/api/events/:id', authRequired, adminRequired, (req, res) => {
  const e = db.events.find((x) => x.id === Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'Gallery not found' });
  if (req.body.title) e.title = String(req.body.title).trim();
  if (typeof req.body.description === 'string') e.description = req.body.description.trim();
  if (req.body.eventDate !== undefined) e.eventDate = req.body.eventDate || null;
  if (Array.isArray(req.body.guestEmails)) {
    e.guestEmails = [...new Set(req.body.guestEmails.map((x) => String(x).trim().toLowerCase()).filter(Boolean))];
  }
  save(db);
  sendEvent(req, res, e, true);
});

app.delete('/api/events/:id', authRequired, adminRequired, (req, res) => {
  const idx = db.events.findIndex((x) => x.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Gallery not found' });
  const [e] = db.events.splice(idx, 1);
  const dir = path.join(UPLOADS_DIR, String(e.id));
  fs.rmSync(dir, { recursive: true, force: true });
  save(db);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// PHOTOS
// ---------------------------------------------------------------------------
function findPhoto(pid) {
  for (const e of db.events) {
    const p = e.photos.find((x) => x.id === Number(pid));
    if (p) return { event: e, photo: p };
  }
  return null;
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOADS_DIR, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 100 },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

app.post('/api/events/:id/upload', authRequired, adminRequired, upload.array('photos', 100), (req, res) => {
  const e = db.events.find((x) => x.id === Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'Gallery not found' });
  const added = [];
  for (const f of req.files || []) {
    const photo = { id: nextId('photo'), name: f.originalname, source: 'local', filename: `${e.id}/${f.filename}`, createdAt: now() };
    e.photos.push(photo);
    added.push(photo);
  }
  save(db);
  res.status(201).json({ photos: added, photoCount: e.photos.length });
});

app.delete('/api/events/:id/photos/:pid', authRequired, adminRequired, (req, res) => {
  const e = db.events.find((x) => x.id === Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'Gallery not found' });
  const idx = e.photos.findIndex((p) => p.id === Number(req.params.pid));
  if (idx === -1) return res.status(404).json({ error: 'Photo not found' });
  const [photo] = e.photos.splice(idx, 1);
  if (photo.source === 'local') {
    fs.rmSync(path.join(UPLOADS_DIR, photo.filename), { force: true });
  }
  save(db);
  res.json({ ok: true, photoCount: e.photos.length });
});

// Photo delivery (no auth needed when it comes from a shared gallery — the code is the secret)
app.get('/api/photo/:pid', (req, res) => {
  const found = findPhoto(req.params.pid);
  if (!found) return res.status(404).json({ error: 'Photo not found' });
  const { photo } = found;
  const download = req.query.download === '1';
  if (photo.source === 'local') {
    const file = path.join(UPLOADS_DIR, photo.filename);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'File missing on disk' });
    return res.sendFile(file, {
      headers: download ? { 'Content-Disposition': `attachment; filename="lenslink-${photo.name}"` } : undefined,
    });
  }
  if (photo.source === 'drive') {
    if (download) return proxyDriveDownload(photo, res);
    return proxyDriveFile(photo.fileId, res);
  }
  return res.status(404).json({ error: 'Unknown photo source' });
});

async function proxyDriveDownload(photo, res) {
  try {
    const r = await driveFetch(`/drive/v3/files/${photo.fileId}?alt=media`);
    res.set('Content-Type', r.headers.get('content-type') || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${sanitizeName(photo.name) || 'photo.jpg'}"`);
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(e.status || 500).json({ error: 'Unable to load file from Drive' });
  }
}

// ---------------------------------------------------------------------------
// GOOGLE DRIVE integration
// ---------------------------------------------------------------------------
async function refreshDriveToken(token) {
  if (!token.refresh_token) return null;
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: token.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const d = await r.json();
    if (!d.access_token) return null;
    writeDriveToken({ ...token, token: d.access_token, access_token: d.access_token });
    return { ...readDriveToken(), token: d.access_token, access_token: d.access_token };
  } catch {
    return null;
  }
}

async function driveFetch(pathname) {
  const token = readDriveToken();
  if (!token) throw Object.assign(new Error('Drive is not connected'), { status: 401 });
  let r = await fetch(`https://www.googleapis.com${pathname}`, {
    headers: { Authorization: `Bearer ${token.token}` },
    redirect: 'follow',
  });
  if ((r.status === 401 || r.status === 403) && token.refresh_token) {
    const fresh = await refreshDriveToken(token);
    if (fresh) {
      r = await fetch(`https://www.googleapis.com${pathname}`, {
        headers: { Authorization: `Bearer ${fresh.token}` },
        redirect: 'follow',
      });
    }
  }
  if (!r.ok) {
    const err = Object.assign(new Error(`Drive API ${r.status}`), { status: r.status });
    throw err;
  }
  return r;
}

async function proxyDriveFile(fileId, res) {
  try {
    const r = await driveFetch(`/drive/v3/files/${fileId}?alt=media`);
    res.set('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(e.status || 500).json({ error: 'Unable to load file from Drive' });
  }
}

app.get('/api/drive/status', authRequired, adminRequired, (req, res) => {
  const token = readDriveToken();
  res.json({
    configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    connected: !!token,
    email: token?.email || null,
  });
});

app.get('/api/drive/authurl', authRequired, adminRequired, (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({ error: 'Google credentials are not configured. Create a .env file (see .env.example).' });
  }
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

app.get('/api/drive/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing authorization code');
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const data = await r.json();
    if (!data.access_token) return res.status(400).send('Google rejected the authorization: ' + JSON.stringify(data));
    const info = await (await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })).json();
    writeDriveToken({ ...data, email: info.email || 'Google account' });
    res.redirect('/admin.html?tab=drive&connected=1');
  } catch (e) {
    res.status(500).send('OAuth failed: ' + e.message);
  }
});

app.post('/api/drive/disconnect', authRequired, adminRequired, (req, res) => {
  fs.rmSync(DRIVE_TOKEN_FILE, { force: true });
  res.json({ ok: true });
});

app.get('/api/drive/files', authRequired, adminRequired, async (req, res) => {
  const query = (req.query.q || '').trim();
  const pageToken = req.query.pageToken || '';
  const token = readDriveToken();
  if (!token) return res.status(401).json({ error: 'Google Drive is not connected' });
  try {
    let q = `mimeType contains 'image/' and trashed=false`;
    if (query) q += ` and name contains '${query.replace(/[\\']/g, '')}'`;
    const params = new URLSearchParams({
      q,
      pageSize: '60',
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink,webContentLink)',
      orderBy: 'modifiedTime desc',
      ...(pageToken ? { pageToken } : {}),
    });
    let res1 = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token.token}` },
    });
    if (!res1.ok && (res1.status === 401 || res1.status === 403)) {
      const t = await refreshDriveToken(token);
      if (t) {
        res1 = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
          headers: { Authorization: `Bearer ${t.token}` },
        });
      }
    }
    if (!res1.ok) return res.status(401).json({ error: 'Drive session expired — reconnect in Drive settings.' });
    const data = await res1.json();
    const files = (data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size ? Number(f.size) : null,
      thumbnail: f.thumbnailLink || null,
    }));
    res.json({ files, nextPageToken: data.nextPageToken || '' });
  } catch (e) {
    res.status(500).json({ error: 'Unable to reach Google Drive: ' + e.message });
  }
});

app.post('/api/events/:id/drive', authRequired, adminRequired, async (req, res) => {
  const e = db.events.find((x) => x.id === Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'Gallery not found' });
  if (!readDriveToken()) return res.status(401).json({ error: 'Google Drive is not connected' });
  const files = Array.isArray(req.body.files) ? req.body.files : [];
  const added = [];
  for (const f of files) {
    if (!f || !f.id) continue;
    const photo = { id: nextId('photo'), name: f.name || 'Drive photo', source: 'drive', fileId: f.id, createdAt: now() };
    e.photos.push(photo);
    added.push(photo);
  }
  save(db);
  res.status(201).json({ photos: added, photoCount: e.photos.length });
});

// ---------------------------------------------------------------------------
// SHARE / customer portal
// ---------------------------------------------------------------------------
app.get('/api/share/:code', (req, res) => {
  const e = db.events.find((x) => x.code === req.params.code);
  if (!e) return res.status(404).json({ error: 'Gallery not found — check the link' });
  res.json({
    title: e.title,
    description: e.description,
    eventDate: e.eventDate,
    admin: db.users.find((u) => u.id === e.adminId)?.name || 'Photographer',
    photos: e.photos.map((p) => ({ id: p.id, name: p.name })),
  });
});

// account page: galleries shared with me
app.get('/api/account/events', authRequired, (req, res) => {
  const events = visibleToUser(req.user).map((e) => ({ ...publicEvent(e), admin: db.users.find((u) => u.id === e.adminId)?.name || 'Photographer' })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ events });
});

// ---------------------------------------------------------------------------
app.get('/s/:code', (req, res) => res.sendFile(path.join(APP_DIR, 'public', 'view.html')));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'Upload failed: ' + err.message });
  if (err) return res.status(500).json({ error: err.message });
  next();
});

// seed a default photographer account
if (!db.users.some((u) => u.email === 'admin@lenslink.app')) {
  db.users.push({
    id: nextId('user'),
    name: 'Studio Admin',
    email: 'admin@lenslink.app',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    createdAt: now(),
  });
  save(db);
}

// seed one demo gallery when empty so the app never looks empty
if (db.events.length === 0) {
  db.events.push({
    id: nextId('event'),
    adminId: db.users.find((u) => u.email === 'admin@lenslink.app').id,
    title: 'Crystal Wedding — Preview',
    description: 'A taste of our favourite moments from the Big Day. Full album coming soon.',
    eventDate: new Date().toISOString().slice(0, 10),
    guestEmails: [],
    code: generateCode(10),
    photos: [],
    createdAt: now(),
  });
  save(db);
}

app.listen(PORT, () => {
  console.log(`📸 LensLink photo portal running → http://localhost:${PORT}`);
});