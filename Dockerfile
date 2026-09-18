# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S -H -D -G app app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts
COPY docker-entrypoint.sh ./

RUN npx prisma generate \
  && chmod +x docker-entrypoint.sh \
  && chown -R app:app /app

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
