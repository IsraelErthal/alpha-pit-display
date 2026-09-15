const { z } = require('zod');

const messageSchema = z.object({ mensagem: z.string().trim().min(1).max(280) });
const createSchema = z.object({
  mensagem: z.string().trim().min(1).max(280),
  autor: z.string().trim().min(1).max(60),
  pais: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'País inválido'),
});
const accessSchema = z.object({ sessaoId: z.string().trim().min(12).max(64) });

function publicComment(comment) {
  return { id: comment.id, mensagem: comment.mensagem, criadoEm: comment.criado_em, autor: comment.autor, pais: comment.pais };
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
      });
      return comments.map(publicComment);
    },
    async create(input) {
      const { mensagem, autor, pais } = createSchema.parse(input);
      const comment = await prisma.comentario.create({ data: { mensagem, status: 'aprovado', autor, pais } });
      return publicComment(comment);
    },
    async listAdmin(query = '', start, end, status) {
      const criado_em = dateFilter(start, end);
      return prisma.comentario.findMany({
        where: { ...(query ? { OR: [{ mensagem: { contains: query } }, { autor: { contains: query } }] } : {}), ...(criado_em ? { criado_em } : {}), ...(status && status !== 'todos' ? { status } : {}) },
        orderBy: { criado_em: 'desc' }, take: 200,
      });
    },
    async hide(id) {
      return prisma.comentario.update({ where: { id: Number(id) }, data: { status: 'oculto', ocultado_em: new Date() } });
    },
    async restore(id) {
      return prisma.comentario.update({ where: { id: Number(id) }, data: { status: 'aprovado', ocultado_em: null } });
    },
    async update(id, input) {
      const { mensagem } = messageSchema.parse(input);
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
      const [acessos, sessoes, comentarios, comentariosVisiveis] = await Promise.all([
        prisma.acessoLog.count({ where: data_hora_acesso ? { data_hora_acesso } : undefined }),
        prisma.acessoLog.findMany({ where: data_hora_acesso ? { data_hora_acesso } : undefined, distinct: ['sessao_id'], select: { sessao_id: true } }),
        prisma.comentario.count({ where: criado_em ? { criado_em } : undefined }),
        prisma.comentario.count({ where: { ...(criado_em ? { criado_em } : {}), status: 'aprovado', ocultado_em: null } }),
      ]);
      return { acessos, usuariosAtivos: sessoes.length, comentarios, comentariosVisiveis };
    },
  };
}

module.exports = { createCommentService };