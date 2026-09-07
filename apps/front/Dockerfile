# Front web (Vue 3 / Vite, SPA statique) — @kanban-it/front
# Contexte de build = RACINE du repo (contrat quai / monorepo).
# quai : dockerfilePath = apps/front/Dockerfile · containerPort = 80 · healthcheckPath = /healthz
#
# VITE_SERVER_URL est FIGE AU BUILD (contrat quai, point 4) : Vite remplace
# import.meta.env.VITE_SERVER_URL par une chaine litterale au build, la valeur
# runtime ne changerait rien. quai passe les variables configurees sur l'app
# en --build-arg -> il faut les redeclarer en ARG + ENV ci-dessous.

FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/front/package.json apps/front/package.json
# devDependencies incluses : vite est necessaire pour builder.
RUN npm ci --workspace @kanban-it/front --include-workspace-root --no-audit --no-fund

COPY packages/shared ./packages/shared
COPY apps/front ./apps/front

# URL WSS publique du serveur temps reel, ex. wss://kanban-api.example.com
ARG VITE_SERVER_URL=""
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN npm run build --workspace @kanban-it/front

# --- service statique : nginx, image finale minimale (pas de runtime Node) ----
FROM nginx:alpine
COPY apps/front/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/front/dist /usr/share/nginx/html
EXPOSE 80
