const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { jwtSecret } = require('../config/env');

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(1).max(200),
});

function createAdminAuthService(prisma) {
  return {
    async login(input) {
      const { email, senha } = loginSchema.parse(input);
      const user = await prisma.adminUser.findUnique({ where: { email } });
      const valid = user && (await bcrypt.compare(senha, user.senha_hash));
      if (!valid) {
        const error = new Error('E-mail ou senha inválidos.');
        error.status = 401;
        throw error;
      }
      const token = jwt.sign({ email: user.email, admin: true }, jwtSecret, { expiresIn: '12h' });
      return { token };
    },
  };
}

module.exports = { createAdminAuthService };
