const http = require('node:http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { port, clientOrigin, accessLogRetentionDays } = require('./config/env');
const { authenticate, requireAdmin } = require('./middleware/auth');
const { rateLimit } = require('./middleware/rateLimit');
const { createCommentService } = require('./services/commentService');

const databaseUrl = new URL(process.env.DATABASE_URL);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.slice(1),
    connectionLimit: 5,
  }),
  errorFormat: 'minimal',
});
const comments = createCommentService(prisma);
const app = express();
let io;
const publicRateLimit = rateLimit({ windowMs: 60_000, max: 60 });
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: clientOrigin.split(','), methods: ['GET', 'POST', 'PATCH'] }));
app.use(express.json({ limit: '8kb' }));
app.use((req, _res, next) => { req.io = io; next(); });
app.use((req, res, next) => (req.path.startsWith('/api/admin/') ? next() : publicRateLimit(req, res, next)));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/comments', async (_req, res, next) => { try { res.json(await comments.listPublic()); } catch (error) { next(error); } });
app.post('/api/accesses', rateLimit({ windowMs: 60_000, max: 20 }), async (req, res, next) => { try { await comments.logAccess(req.body); res.status(201).end(); } catch (error) { next(error); } });
app.post('/api/comments', rateLimit({ windowMs: 60_000, max: 8 }), async (req, res, next) => {
  try { await comments.create(req.body); res.status(202).json({ message: 'Comentário enviado para moderação.' }); } catch (error) { next(error); }
});
app.get('/api/admin/dashboard', authenticate, requireAdmin, async (req, res, next) => { try { res.json(await comments.dashboard(String(req.query.start || ''), String(req.query.end || ''))); } catch (error) { next(error); } });
app.get('/api/admin/comments', authenticate, requireAdmin, async (req, res, next) => { try { res.json(await comments.listAdmin(String(req.query.q || ''), String(req.query.start || ''), String(req.query.end || ''), String(req.query.status || 'todos'))); } catch (error) { next(error); } });
app.patch('/api/admin/comments/:id/hide', authenticate, requireAdmin, async (req, res, next) => { try { const hidden = await comments.hide(req.params.id); req.io.emit('comment:hidden', { id: hidden.id }); res.status(204).end(); } catch (error) { next(error); } });
app.patch('/api/admin/comments/:id/restore', authenticate, requireAdmin, async (req, res, next) => { try { const restored = await comments.restore(req.params.id); req.io.emit('comment:created', { id: restored.id, mensagem: restored.mensagem, criadoEm: restored.criado_em, autor: restored.autor, pais: restored.pais }); res.json(restored); } catch (error) { next(error); } });
app.patch('/api/admin/comments/:id', authenticate, requireAdmin, async (req, res, next) => { try { res.json(await comments.update(req.params.id, req.body)); } catch (error) { next(error); } });
app.delete('/api/admin/comments/:id', authenticate, requireAdmin, async (req, res, next) => { try { const removed = await comments.remove(req.params.id); req.io.emit('comment:hidden', { id: removed.id }); res.status(204).end(); } catch (error) { next(error); } });
app.use((error, _req, res, _next) => { if (error.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos ou consentimento ausente.' }); console.error(error); return res.status(500).json({ error: 'Erro interno.' }); });

const server = http.createServer(app);
io = new Server(server, { cors: { origin: clientOrigin.split(','), methods: ['GET', 'POST'] } });
io.on('connection', socket => { socket.emit('comments:ready'); });
async function removeExpiredAccesses() {
  try {
    const { count } = await comments.removeExpiredAccesses(accessLogRetentionDays);
    if (count) console.log(`${count} registros de acesso expirados removidos.`);
  } catch (error) {
    console.error('Não foi possível remover registros de acesso expirados.', error);
  }
}
void removeExpiredAccesses();
setInterval(removeExpiredAccesses, 24 * 60 * 60 * 1_000).unref();
server.listen(port, () => console.log(`Alpha API em http://localhost:${port}`));
