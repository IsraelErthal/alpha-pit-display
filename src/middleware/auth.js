const admin = require('firebase-admin');

function initializeFirebase() {
  if (admin.apps.length || !process.env.FIREBASE_PROJECT_ID) return;
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}

async function authenticate(req, res, next) {
  const token = req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Autenticação necessária.' });
  try {
    initializeFirebase();
    if (!admin.apps.length) throw new Error('Firebase não configurado');
    req.user = await admin.auth().verifyIdToken(token, true);
    return next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.admin === true) return next();
  return res.status(403).json({ error: 'Acesso administrativo necessário.' });
}

function requireVerifiedIdentity(req, res, next) {
  if (req.user?.email_verified === true) return next();
  return res.status(403).json({ error: 'Confirme seu e-mail para publicar comentários.' });
}

module.exports = { authenticate, requireAdmin, requireVerifiedIdentity };
