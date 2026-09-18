require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const email = process.argv[2]?.trim().toLowerCase();
const senha = process.argv[3];
if (!email || !senha) {
  console.error('Uso: npm run admin:create -- seu-email@exemplo.com suaSenha');
  process.exit(1);
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.slice(1),
    connectionLimit: 1,
  }),
});

async function createAdmin() {
  const senha_hash = await bcrypt.hash(senha, 12);
  await prisma.adminUser.upsert({
    where: { email },
    create: { email, senha_hash },
    update: { senha_hash },
  });
  console.log(`Admin ${email} criado/atualizado com sucesso.`);
}

createAdmin()
  .catch(error => {
    console.error('Não foi possível criar o admin:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
