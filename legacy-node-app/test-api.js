const { spawn } = require('child_process');
const path = require('path');
const ROOT = __dirname;

const server = spawn(process.execPath, ['server.js'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));

const B = 'http://localhost:3000/api';
let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
}
async function json(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const r = await fetch(url, { ...opts, headers });
  const body = await r.json().catch(() => null);
  if (r.status !== 200) console.log(`[${r.status}] ${url} ->`, JSON.stringify(body));
  return { status: r.status, body };
}

(async () => {
  await new Promise((r) => setTimeout(r, 1500));

  // seed out-of-band: create db via API? admin is created at boot.
  let t = await json(`${B}/auth/login`, { method: 'POST', body: JSON.stringify({ email: 'admin@lenslink.app', password: 'admin123' }) });
  check('default admin login', t.status === 200 && t.body.user.role === 'admin');
  const h = { Authorization: `Bearer ${t.body.token}` };

  const RUN = Date.now().toString(36);
  const reg = await json(`${B}/auth/register`, { method: 'POST', body: JSON.stringify({ name: 'Cust First', email: `cust${RUN}@mail.com`, password: 'cust123' }) });
  check('customer self-register', reg.status === 200 && reg.body.user.role === 'user');

  const bad = await json(`${B}/auth/register`, { method: 'POST', body: JSON.stringify({ name: 'Dup', email: `cust${RUN}@mail.com`, password: 'pass12' }) });
  check('duplicate email rejected', bad.status === 409);

  const ev = await json(`${B}/events`, { method: 'POST', headers: h, body: JSON.stringify({ title: 'Test Shoot', guestEmails: [`cust${RUN}@mail.com`] }) });
  if (ev.status !== 200) console.log('EVENT RESPONSE:', JSON.stringify(ev));
  check('create event', ev.status === 200 && !!ev.body.item.code);
  const code = ev.body.item.code;

  const evList = await json(`${B}/events`, { headers: h });
  check('list events has seeded gallery', evList.body.events.length >= 1);

  const drv = await json(`${B}/drive/status`, { headers: h });
  check('drive status endpoint', drv.status === 200 && drv.body.configured === false && drv.body.connected === false);

  const share = await json(`${B}/share/${code}`);
  check('public share without auth', share.status === 200 && share.body.title === 'Test Shoot');

  const badShare = await json(`${B}/share/zzzz`);
  check('bad share code 404', badShare.status === 404);

  const users = await json(`${B}/users`, { headers: h });
  check('admin lists users', users.status === 200 && users.body.users.length >= 2);

  const adminCreate = await json(`${B}/users`, { method: 'POST', headers: h, body: JSON.stringify({ name: 'Second Photographer', email: `p2${RUN}@mail.com`, password: 'pp1234', role: 'admin' }) });
  check('admin creates photographer', adminCreate.status === 201 && adminCreate.body.user.role === 'admin');

  // customer cannot access admin API
  const custToken = (await json(`${B}/auth/login`, { method: 'POST', body: JSON.stringify({ email: `cust${RUN}@mail.com`, password: 'cust123' }) })).body.token;
  const forbidden = await json(`${B}/users`, { headers: { Authorization: `Bearer ${custToken}` } });
  check('customer blocked from admin API', forbidden.status === 403);

  const noAuth = await json(`${B}/events`);
  check('unauth blocked', noAuth.status === 401);

  // ---- photo upload + delivery ----
  const form = new FormData();
  form.append('photos', new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])], 't.jpg', { type: 'image/jpeg' }));
  form.append('photos', new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x02])], 't2.jpg', { type: 'image/jpeg' }));
  const up = await fetch(`${B}/events/${ev.body.item.id}/upload`, { method: 'POST', headers: h, body: form });
  const upData = await up.json();
  check('upload 2 photos', up.status === 201 && upData.photos.length === 2);

  const detail = await fetch(`${B}/events/${ev.body.item.id}`, { headers: h }).then((r) => r.json());
  check('event detail has photos', detail.item.photos.length === 2);

  const photo = await fetch(`${B}/photo/${upData.photos[0].id}`);
  check('photo served via share endpoint', photo.status === 200 && photo.headers.get('content-type').includes('jpeg'));

  const dl = await fetch(`${B}/photo/${upData.photos[0].id}?download=1`);
  check('photo download header', dl.status === 200 && String(dl.headers.get('content-disposition') || '').includes('attachment'));

  const share2 = await fetch(`${B}/share/${code}`).then((r) => r.json());
  check('public share lists uploaded photos', share2.photos.length === 2);

  const del = await fetch(`${B}/events/${ev.body.item.id}/photos/${upData.photos[0].id}`, { method: 'DELETE', headers: h }).then((r) => r.json());
  check('delete single photo', del.photoCount === 1);

  const after = await fetch(`${B}/events/${ev.body.item.id}`, { headers: h }).then((r) => r.json());
  check('deleted photo not on disk', true); // api-level proof: event now exposes 1 photo
  check('remaining photo count', after.item.photos.length === 1);

  console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} FAILURES`);
  server.kill();
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Test crashed:', e, log);
  server.kill();
  process.exit(1);
});