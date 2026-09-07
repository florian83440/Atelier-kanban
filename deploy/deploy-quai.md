# Déploiement sur quai

[quai](../../quai) est un PaaS auto-hébergé (Go + Traefik) : il build un
`Dockerfile` par app depuis un repo GitHub et route chaque app sur son
domaine via Traefik (TLS Let's Encrypt automatique). Contrat complet :
`quai/docs/app-config.md`, `quai/docs/monorepo.md`, `quai/docs/getting-started.md`.

Ce repo est un **monorepo** → **1 projet quai** + **2 apps quai** (une par
`Dockerfile`), toutes deux liées au même repo.

Les valeurs des `envVars` d'une app sont injectées **deux fois** par quai :
en `--build-arg` au build **et** en `-e` au runtime (`internal/deploy/pipeline.go`).

---

## 0. Prérequis

1. **Pousser ce repo sur GitHub** avec la config Docker (Dockerfiles,
   `.dockerignore`, `apps/back/src/index.js`, `apps/front/nginx.conf`) sur la
   branche `main`.
2. Dans quai → **Paramètres** : PAT GitHub *fine-grained* avec accès au repo
   `florian83440/Atelier-kanban` — permissions **Contents: Read** +
   **Webhooks: Read and write**.
3. **DNS** : un enregistrement A (+ AAAA si IPv6) pour chacun des deux
   sous-domaines ci-dessous → IP publique du VPS quai.

---

## 1. Projet quai

| Champ | Valeur |
|---|---|
| `name` | `Atelier Kanban` |
| `repoOwner` | `florian83440` |
| `repoName` | `Atelier-kanban` |
| `branch` | `main` |

---

## 2. App `kanban-back` — serveur temps réel

| Champ | Valeur |
|---|---|
| `name` | `kanban-back` |
| `projectId` | *(le projet ci-dessus)* |
| `dockerfilePath` | `apps/back/Dockerfile` |
| `containerPort` | `8080` |
| `healthcheckPath` | `/healthz` |
| `autoDeploy` | `true` |
| `memoryLimitMb` | `256` *(optionnel ; vide = défaut global)* |

### `envVars`

| Clé | Valeur | Note |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://kanban.exemple.fr` | Verrouille l'ouverture de WebSocket au domaine du front (CSV possible). Laisser **absent** = toutes origines acceptées. |
| `PORT` | *(ne PAS définir)* | Défaut `8080`. Si défini, doit être égal à `containerPort`. |

### Domaine

| Champ | Valeur |
|---|---|
| `hostname` | `kanban-api.exemple.fr` |

---

## 3. App `kanban-front` — SPA statique (nginx)

| Champ | Valeur |
|---|---|
| `name` | `kanban-front` |
| `projectId` | *(le même projet)* |
| `dockerfilePath` | `apps/front/Dockerfile` |
| `containerPort` | `80` |
| `healthcheckPath` | `/healthz` |
| `autoDeploy` | `true` |
| `memoryLimitMb` | `64` *(optionnel)* |

### `envVars`

| Clé | Valeur | Note |
|---|---|---|
| `VITE_SERVER_URL` | `wss://kanban-api.exemple.fr` | **Figée au build** : Vite l'inline dans le JS. Tout changement impose un **redéploiement** du front. Doit être le domaine de `kanban-back`, en `wss://` (TLS). |

### Domaine

| Champ | Valeur |
|---|---|
| `hostname` | `kanban.exemple.fr` |

---

## 4. Ordre de mise en route

1. Créer le **projet**.
2. Créer **kanban-back** → ajouter le domaine `kanban-api.exemple.fr` → définir
   `ALLOWED_ORIGINS` → **Déployer**.
   Vérifier : `curl https://kanban-api.exemple.fr/healthz` → `ok`.
3. Créer **kanban-front** → définir `VITE_SERVER_URL=wss://kanban-api.exemple.fr`
   → ajouter le domaine `kanban.exemple.fr` → **Déployer**.
   Vérifier : `curl https://kanban.exemple.fr/healthz` → `ok`.
4. Ouvrir `https://kanban.exemple.fr/?host` (écran hôte), créer une partie, les
   joueurs rejoignent sur `https://kanban.exemple.fr`.

Traefik termine le TLS et relaie l'*upgrade* WebSocket de façon transparente :
le navigateur parle `wss://…:443`, le conteneur écoute en clair sur `:8080`.
Rien de spécial à configurer pour le WebSocket.

> Remplacer `exemple.fr` par le vrai domaine partout (3 endroits :
> `VITE_SERVER_URL`, `ALLOWED_ORIGINS`, et les 2 `hostname`).

---

## 5. Auto-déploiement

`autoDeploy: true` sur les deux apps → quai enregistre **un webhook GitHub par
app** sur `florian83440/Atelier-kanban`. Un push sur `main` redéploie les deux
(pas de détection de changement par chemin — cf. `quai/docs/monorepo.md`).

---

## 6. Tester les images en local (sans quai)

```bash
cd deploy
docker compose up --build
# front : http://localhost:8080  (hôte : http://localhost:8080/?host)
# back  : ws://localhost:8081  ·  http://localhost:8081/healthz
```

`deploy/docker-compose.yml` n'est **pas** utilisé par quai — juste une repro
locale, avec `VITE_SERVER_URL=ws://localhost:8081` injecté au build.
