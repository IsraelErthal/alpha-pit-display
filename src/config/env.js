require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];
const retentionDays = Number(process.env.ACCESS_LOG_RETENTION_DAYS || 90);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  accessLogRetentionDays: Number.isInteger(retentionDays) && retentionDays > 0 ? retentionDays : 90,
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: requireEnv('JWT_SECRET'),
  requireEnv,
  required,
};
