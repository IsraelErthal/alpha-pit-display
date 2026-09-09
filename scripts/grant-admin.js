require('dotenv').config();
const admin = require('firebase-admin');

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Uso: npm run admin:grant -- seu-email@exemplo.com');
  process.exit(1);
}

admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });

async function grantAdmin() {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
  console.log(`Permissão de administrador concedida a ${email}.`);
  console.log('Saia e entre novamente na aplicação para atualizar o token de acesso.');
}

grantAdmin().catch(error => {
  console.error('Não foi possível conceder a permissão:', error.message);
  process.exit(1);
});
