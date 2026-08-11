const crypto = require('crypto');

function generateCode(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function sanitizeName(name) {
  const base = String(name || 'photo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (base || 'photo').slice(0, 24);
}

module.exports = { generateCode, sanitizeName };