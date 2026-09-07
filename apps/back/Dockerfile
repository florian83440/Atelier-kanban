# Serveur temps reel (WebSocket) — @kanban-it/back
# Contexte de build = RACINE du repo (contrat quai / monorepo).
# quai : dockerfilePath = apps/back/Dockerfile · containerPort = 8080 · healthcheckPath = /healthz

# --- deps : installe UNIQUEMENT les deps runtime de @kanban-it/back --------------
FROM node:22-alpine AS deps
WORKDIR /repo
# Manifests d'abord : le cache Docker de cette couche tient tant que les
# dependances ne changent pas, meme si le code applicatif change.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/back/package.json apps/back/package.json
# --workspace : n'installe que "ws" (+ la racine), pas vite/vue du front.
# --omit=dev : pas de devDependencies.
RUN npm ci --omit=dev --workspace @kanban-it/back --include-workspace-root --no-audit --no-fund

# --- run : image finale minimale ----------------------------------------------
FROM node:22-alpine AS run
ENV NODE_ENV=production
WORKDIR /repo
# node_modules contient "ws" + les liens symboliques @kanban-it/{back,shared}
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/back ./apps/back
USER node
# PORT est injecte par quai au runtime (-e) ; 8080 par defaut. Le serveur
# ecoute sur 0.0.0.0 (voir apps/back/src/index.js) et expose /healthz.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "apps/back/src/index.js"]
