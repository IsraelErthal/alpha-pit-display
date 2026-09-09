# Alpha Pit Display

Aplicação do videoclipe interativo da Alpha Scuderia.

## Estrutura

- `src/`: API Express, Socket.io, Firebase Admin e Prisma.
- `frontend/`: aplicação React/Vite independente.
- `prisma/`: modelo MySQL com moderação por exclusão lógica.

## Configuração

1. Preencha `DATABASE_URL`, `FIREBASE_PROJECT_ID` e `CLIENT_ORIGIN` no `.env` da API.
2. Copie `frontend/.env.example` para `frontend/.env` e informe a configuração pública do Firebase, a URL da API e o ID real do vídeo do YouTube.
3. Configure a claim customizada `admin: true` para os moderadores no Firebase Admin.
4. Execute `npm run prisma:generate`, aplique uma migração MySQL e rode `npm run dev`.
5. Em outro terminal, rode `npm run dev --prefix frontend`.

Não publique arquivos `.env` nem credenciais de conta de serviço Firebase.
