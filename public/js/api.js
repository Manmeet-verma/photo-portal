const API = {
  async req(method, path, body) {
    const headers = {};
    const token = localStorage.getItem('ll_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const r = await fetch(`/api${path}`, { method, headers, body: payload });
    let data = null;
    const text = await r.text().catch(() => '');
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }
    if (!r.ok) {
      if (r.status === 401 && !path.includes('/auth/')) {
        localStorage.removeItem('ll_token');
        localStorage.removeItem('ll_user');
        location.href = '/login';
      }
      const err = new Error((data && data.error) || (text ? `Request failed (${r.status})` : `Server returned an empty response (${r.status}) — check the server's Firebase Admin setup.`));
      err.status = r.status;
      throw err;
    }
    return data;
  },
  get: (p) => API.req('GET', p),
  post: (p, b) => API.req('POST', p, b),
  patch: (p, b) => API.req('PATCH', p, b),
  del: (p) => API.req('DELETE', p),
};

function storeUser(user) { localStorage.setItem('ll_user', JSON.stringify(user)); }
function currentUser() {
  try { return JSON.parse(localStorage.getItem('ll_user')); } catch { return null; }
}
function setAuth(token, user) { localStorage.setItem('ll_token', token); storeUser(user); }
function signOut() { localStorage.removeItem('ll_token'); localStorage.removeItem('ll_user'); location.href = '/index.html'; }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function baseUrl() { return location.origin; }
function shareUrlOf(event) { return `${baseUrl()}/s/${event.code}`; }
