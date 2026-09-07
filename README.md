# Kanban IT — Simulation de flux (multi-équipes)

Jeu d'atelier : chaque **équipe** pilote un board Kanban (analyse → dev → test →
production) sur sa machine ; une machine **hôte** crée la partie, cadence les sprints
et suit toutes les équipes sur un tableau de bord.

## Structure (monorepo npm workspaces)

```
apps/
  front/    @kanban-it/front — application Vue 3 (Vite) : connexion, interface joueur, dashboard hôte
  back/     @kanban-it/back  — serveur WebSocket autoritaire (rooms, minuteur de sprint, diffusion d'état)
packages/
  shared/   @kanban-it/shared — règles de jeu pures (aucun DOM / réseau), utilisées par le back et le front
legacy/standalone.html        — ancienne version mono-fichier, conservée comme référence de règles
```

## Prérequis

**Node.js 20 LTS ou plus** (https://nodejs.org).

```bash
node --version   # v20+ attendu
npm --version
```

## Installation

À la racine du projet (installe les sous-paquets via npm workspaces) :

```bash
npm install
```

## Lancer en développement

Deux terminaux :

```bash
# Terminal A — serveur temps réel (ws://0.0.0.0:8080)
npm run dev:back        # alias : npm run dev:server

# Terminal B — front web (http://localhost:5173, accessible sur le réseau local)
npm run dev:front       # alias : npm run dev:client
```

## Jouer

1. **Hôte** : ouvrir `http://localhost:5173/?host` → onglet « Créer une partie » → noter le
   **code** à 4 lettres. Le tableau de bord s'affiche.
2. **Joueurs** : sur chaque machine, ouvrir `http://<IP-de-l-hôte>:5173`, saisir son nom, le
   **code** et un **nom d'équipe**. Même nom d'équipe = board partagé entre plusieurs joueurs.
3. **Hôte** : cliquer **Démarrer**. Le minuteur de sprint tourne pour tout le monde ; il peut
   l'ajuster à la volée (**− 30 s** / **+ 30 s**).
4. Les joueurs sélectionnent une ressource (PO / Dev / QA) puis cliquent le projet cible. À la
   fin du minuteur — ou via **Valider le sprint** — le serveur résout le sprint de toutes les
   équipes, tire un incident RH un sprint sur deux, puis passe au sprint suivant.
5. Après 20 sprints : bilan graphique côté joueur, classement final côté hôte.

Effectif de départ par équipe : 2 PO, 7 devs, 3 QA.

### Réseau local

- Le front se connecte par défaut à `ws://<hôte-de-la-page>:8080`. Si les joueurs chargent
  la page depuis la machine hôte, aucune configuration n'est nécessaire.
- Pour pointer vers un autre serveur, créer `apps/front/.env` avec
  `VITE_SERVER_URL=ws://192.168.x.x:8080` (voir `apps/front/.env.example`).
- Ouvrir le port **8080** (back) et **5173** (front) dans le pare-feu de l'hôte.
- Reconnexion automatique : un joueur qui recharge retrouve son équipe (session mémorisée
  dans l'onglet du navigateur).

## Build de production (front)

```bash
npm run build              # génère apps/front/dist/
npm run preview -w @kanban-it/front   # sert le build en local
```

Le serveur reste nécessaire (`npm run start`) et peut aussi servir `apps/front/dist/` via un
reverse-proxy si besoin (non fourni).

## Déploiement (Docker / quai)

- `apps/back/Dockerfile` — serveur WebSocket (`containerPort 8080`, health `/healthz`).
- `apps/front/Dockerfile` + `apps/front/nginx.conf` — SPA statique via nginx
  (`containerPort 80`, health `/healthz`). `VITE_SERVER_URL` est **figée au build**.
- `.dockerignore` à la racine ; contexte de build = racine du repo.
- **Test local des images** : `cd deploy && docker compose up --build`.
- **Déploiement sur le PaaS quai** : voir [`deploy/deploy-quai.md`](deploy/deploy-quai.md)
  (deux apps quai sur le même repo, une par `Dockerfile`).

## Tests de fumée

```bash
npm run smoke   # logique de jeu (20 sprints, blocages RH…) + serveur WebSocket bout-en-bout
```
