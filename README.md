# Alpha Pit Display

Aplicação do videoclipe interativo da Alpha Scuderia.

## Estrutura

- `src/`: API Express, Socket.io e Prisma.
- `frontend/`: aplicação React/Vite independente.
- `prisma/`: modelo MySQL com moderação por exclusão lógica.

## Configuração

1. Preencha `DATABASE_URL`, `JWT_SECRET` e `CLIENT_ORIGIN` no `.env` da API.
2. Copie `frontend/.env.example` para `frontend/.env` e informe a URL da API.
3. Execute `npm run prisma:generate`, aplique uma migração MySQL e rode `npm run dev`.
4. Em outro terminal, rode `npm run dev --prefix frontend`.
5. Crie o primeiro usuário administrador com `npm run admin:create -- seu-email@exemplo.com suaSenha`.

## Privacidade e retenção

- Métricas de acesso só são ativadas após o aceite de termos e cookies no site. O envio de comentários é público e requer somente nome, país e mensagem, sem login.
- O painel administrativo usa login local (e-mail e senha, com hash bcrypt) e tem limite de tentativas por IP na rota de login.
- Os acessos são retidos por 90 dias e removidos na inicialização da API e a cada 24 horas. Ajuste o período, se necessário, com `ACCESS_LOG_RETENTION_DAYS`.

Não publique arquivos `.env` nem o `JWT_SECRET`.
