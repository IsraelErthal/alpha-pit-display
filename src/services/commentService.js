const { z } = require('zod');

const contentSchema = z.object({ mensagem: z.string().trim().min(1).max(280) });
const accessSchema = z.object({ sessaoId: z.string().trim().min(12).max(64) });

function publicComment(comment) {
  return { id: comment.id, mensagem: comment.mensagem, criadoEm: comment.criado_em, autor: comment.usuario.nome };
}

function nameFromEmail(email) {
  const localPart = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return localPart.replace(/\b\p{L}/gu, letter => letter.toUpperCase()) || 'Torcedor Alpha';
}

function dateFilter(start, end) {
  if (!start || !end) return undefined;
  const startAt = new Date(`${start}T00:00:00.000Z`);
  const endAt = new Date(`${end}T00:00:00.000Z`);
  endAt.setUTCDate(endAt.getUTCDate() + 1);
  if (Number.isNaN(startAt.valueOf()) || Number.isNaN(endAt.valueOf())) return undefined;
  return { gte: startAt, lt: endAt };
}

function createCommentService(prisma) {
  return {
    async listPublic() {
      const comments = await prisma.comentario.findMany({
        where: { status: 'aprovado', ocultado_em: null }, orderBy: { criado_em: 'asc' }, take: 100,
        include: { usuario: { select: { nome: true } } },
      });
      return comments.map(publicComment);
    },
    async create(user, input) {
      const { mensagem } = contentSchema.parse(input);
      await prisma.usuario.upsert({
        where: { id: user.uid },
        update: { nome: nameFromEmail(user.email || `${user.uid}@firebase.local`), email: user.email || `${user.uid}@firebase.local`, foto_url: user.picture || null },
        create: { id: user.uid, nome: nameFromEmail(user.email || `${user.uid}@firebase.local`), email: user.email || `${user.uid}@firebase.local`, foto_url: user.picture || null },
      });
      const comment = await prisma.comentario.create({ data: { mensagem, status: 'aprovado', usuario_id: user.uid }, include: { usuario: { select: { nome: true } } } });
      return publicComment(comment);
    },
    async listAdmin(query = '', start, end, status) {
      const criado_em = dateFilter(start, end);
      return prisma.comentario.findMany({
        where: { ...(query ? { mensagem: { contains: query } } : {}), ...(criado_em ? { criado_em } : {}), ...(status && status !== 'todos' ? { status } : {}) },
        include: { usuario: { select: { nome: true, email: true } } }, orderBy: { criado_em: 'desc' }, take: 200,
      });
    },
    async hide(id) {
      return prisma.comentario.update({ where: { id: Number(id) }, data: { status: 'oculto', ocultado_em: new Date() } });
    },
    async restore(id) {
      return prisma.comentario.update({ where: { id: Number(id) }, data: { status: 'aprovado', ocultado_em: null } });
    },
    async update(id, input) {
      const { mensagem } = contentSchema.parse(input);
      return prisma.comentario.update({ where: { id: Number(id) }, data: { mensagem } });
    },
    async remove(id) {
      return prisma.comentario.delete({ where: { id: Number(id) } });
    },
    async logAccess(input) {
      const { sessaoId } = accessSchema.parse(input);
      return prisma.acessoLog.create({ data: { sessao_id: sessaoId } });
    },
    async dashboard(start, end) {
      const data_hora_acesso = dateFilter(start, end);
      const criado_em = dateFilter(start, end);
      const [acessos, sessoes, comentarios, comentaristas] = await Promise.all([
        prisma.acessoLog.count({ where: data_hora_acesso ? { data_hora_acesso } : undefined }),
        prisma.acessoLog.findMany({ where: data_hora_acesso ? { data_hora_acesso } : undefined, distinct: ['sessao_id'], select: { sessao_id: true } }),
        prisma.comentario.count({ where: criado_em ? { criado_em } : undefined }),
        prisma.comentario.findMany({ where: criado_em ? { criado_em } : undefined, distinct: ['usuario_id'], select: { usuario_id: true } }),
      ]);
      return { acessos, usuariosAtivos: sessoes.length, comentarios, usuariosQueComentaram: comentaristas.length };
    },
  };
}

module.exports = { createCommentService };
