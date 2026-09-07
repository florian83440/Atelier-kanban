# Déploiement sur quai

[quai](../../quai) est un PaaS auto-hébergé (Go + Traefik) : il build un
`Dockerfile` par app depuis un repo GitHub et route chaque app sur son
domaine via Traefik (TLS Let's Encrypt automatique). Voir le contrat complet
dans `quai/docs/app-config.md` et `quai/docs/monorepo.md`.

Ce repo est un **monorepo** : on crée **deux apps quai** pointant sur le même
`repoOwner/repoName`, chacune avec sa config.

| App quai | `dockerfilePath` | `containerPort` | `healthcheckPath` | Domaine type |
|---|---|---|---|---|
| **kanban-back** | `apps/back/Dockerfile` | `8080` | `/healthz` | `kanban-api.exemple.fr` |
| **kanban-front** | `apps/front/Dockerfile` | `80` | `/healthz` | `kanban.exemple.fr` |

- Branche : `main` pour les deux (adapter si besoin).
- Contexte de build : **toujours la racine du repo** (imposé par quai) — les
  deux `Dockerfile` `COPY` déjà depuis la racine (`apps/…`, `packages/shared`).
- `.dockerignore` à la racine garde le contexte léger.

## Variables d'environnement à configurer dans quai

### kanban-front

| Variable | Valeur | Rôle |
|---|---|---|
| `VITE_SERVER_URL` | `wss://kanban-api.exemple.fr` | **Figée au build.** URL publique du serveur temps réel. Vite l'inline dans le JS — **tout changement impose un redéploiement du front.** |

Sans cette variable, le front tenterait `ws://<hôte-de-la-page>:8080`, ce qui
ne marche pas derrière Traefik (443, pas de port 8080 exposé, et TLS requis).

### kanban-back

| Variable | Valeur | Rôle |
|---|---|---|
| `PORT` | *(laisser vide)* | Défaut `8080`. À définir seulement pour changer le port d'écoute interne (doit alors correspondre à `containerPort`). |
| `ALLOWED_ORIGINS` | `https://kanban.exemple.fr` | *(Optionnel mais recommandé.)* Restreint l'ouverture de WebSocket à cette/ces origine(s) (CSV). Vide = toutes origines acceptées. |

Aucune base de données : le jeu est 100 % en mémoire (les parties sont
éphémères).

## Ordre de mise en route

1. **DNS** : un enregistrement A (et AAAA si IPv6) pour `kanban.exemple.fr`
   **et** `kanban-api.exemple.fr` → IP du VPS quai.
2. Créer **kanban-back** dans quai (tableau ci-dessus), ajouter le domaine
   `kanban-api.exemple.fr`, définir `ALLOWED_ORIGINS`, **déployer**. Vérifier :
   `https://kanban-api.exemple.fr/healthz` renvoie `ok`.
3. Créer **kanban-front**, définir `VITE_SERVER_URL=wss://kanban-api.exemple.fr`,
   ajouter le domaine `kanban.exemple.fr`, **déployer**.
4. Ouvrir `https://kanban.exemple.fr/?host` (écran hôte) → créer une partie →
   les joueurs rejoignent sur `https://kanban.exemple.fr`.

Traefik termine le TLS et relaie l'*upgrade* WebSocket de façon transparente :
le navigateur parle `wss://…:443`, le conteneur écoute en clair sur `:8080`.
Rien de spécial à configurer pour le WebSocket.

## Auto-déploiement

Activer « Déploiement automatique sur push » sur chacune des deux apps : quai
pose un webhook GitHub par app. Un push sur `main` redéploie les deux
(pas de détection de changement par chemin — cf. `quai/docs/monorepo.md`).
Le front étant statique, un rebuild est de toute façon nécessaire à chaque
changement de `VITE_SERVER_URL` ou du code front.

## Tester les images en local avant de pousser

```bash
cd deploy
docker compose up --build
# front : http://localhost:8080  (hôte : http://localhost:8080/?host)
# back  : ws://localhost:8081  ·  http://localhost:8081/healthz
```

`deploy/docker-compose.yml` n'est **pas** utilisé par quai — c'est seulement
une repro locale (front nginx + back ws sur deux ports), avec
`VITE_SERVER_URL=ws://localhost:8081` injecté au build.
