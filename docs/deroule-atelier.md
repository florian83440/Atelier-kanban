---
marp: true
theme: default
paginate: true
title: "Kanban IT — déroulé de l'atelier"
---

<!--
Deck d'animation pour l'atelier « Kanban IT ».
Généré pour Marp (marp-cli / VS Code Marp). Chaque `---` = une slide.
Les blocs `<!-- ... -->` sont des notes d'animateur (présentateur), pas projetés.
Durée cible : 2 h à 2 h 30 pour un cycle complet de 20 sprints.
-->

# Kanban IT
## Simuler le flux d'un projet IT, sprint après sprint

Atelier — 20 sprints · équipes de 3 à 5 · 1 poste hôte

<!--
Se présenter en 30 s. Annoncer : "On ne fait pas un cours magistral, on joue.
Le cours, c'est ce que vous aurez vécu à la fin."
-->

---

# Objectifs de la séance

- Ressentir ce qu'est un **flux** et pourquoi on le **limite** (WIP)
- Voir l'effet des **files d'attente**, des **goulots** et du **multitâche**
- Faire l'expérience d'une **frontière d'information** entre « ceux qui vendent » et « ceux qui livrent »
- Manipuler des **arbitrages** : délai ↔ budget ↔ ressources ↔ qualité
- Repartir avec un **vocabulaire commun** : WIP, lead time, throughput, dette, aléa

<!--
Insister : l'objectif n'est pas de "gagner", c'est de pouvoir expliquer POURQUOI
un score est bon ou mauvais.
-->

---

# Le contexte fiction

Vous êtes une **DSI / ESN**. Des demandes tombent en continu.

- Vous encaissez du **chiffre d'affaires** quand un projet **avance** et surtout quand il **livre**
- Vous perdez de l'argent sur les **retards** et les **bugs en production**
- Vous avez une **équipe fixe** — sauf si vous **recrutez** (ça coûte)

**Score final = CA net = CA livré − pénalités − recrutements.**

---

# Le plateau : un flux à 4 étapes

**Analyse & Spec → Développement → Test & Recette → Production**

| Colonne | Limite d'en-cours (WIP) |
|---|---|
| Analyse | 4 |
| Développement | 4 |
| Test | 2 |
| Production | ∞ |

> Une colonne pleine **bloque l'étape précédente**. C'est le cœur du jeu.

<!--
Faire le lien tout de suite : "colonne pleine = goulot = tout le monde en amont attend".
-->

---

# L'équipe (12 personnes, partagées)

- **2 Product Owners** (analyse)
- **7 Développeurs** : 2 Back · 3 Full · 2 Front
- **3 QA** (test)

Règles d'effectif :

- On **déplace** un membre d'un projet à l'autre **quand on veut** (aucun verrou)
- Avancement **proportionnel** : `affectés ÷ requis` par sprint (plafond 1)
  → 1 dev sur 2 requis = le projet avance **de moitié** ce sprint
- Un dev **Full** est efficace partout ; un dev **hors type** (ou Front/Back sur un projet *fullstack*) compte pour **½**

---

# Ce qui rapporte, ce qui coûte

**CA encaissé par étapes** : 5 % à la fin de l'analyse · 20 % à la fin du dév · **75 % à la livraison**

**Pénalités :**
- Retard : **−5 000 € par sprint** au-delà de l'échéance
- Bug en production non corrigé : **−20 % du budget du projet par sprint** (min 5 000 €)
  → 1 dev pendant 1 sprint suffit à le corriger

**Recrutement :** Back / Front **10 k€**, Full **17,5 k€** (déduit du CA net)

---

# Les aléas

**Incidents RH — 1 sprint sur 2**
- Absences temporaires de devs, QA ou PO
- Si la personne était affectée, elle **reste sur le projet** → projet **figé** le temps du blocage
- Jamais deux fois le même incident d'affilée

**Bugs en production**
- ~25 % de risque par sprint, **2 bugs actifs max**
- Le risque vise les projets **déjà livrés**

<!--
Message : l'aléa est subi par tout le monde de la même façon. Ce qui vous
différencie, c'est la marge que vous vous êtes gardée pour l'absorber.
-->

---

# Deux salles par équipe

| | **Direction** (salle A) | **Delivery** (salle B) |
|---|---|---|
| Voit | file d'appels d'offres, **montants**, budget, suivi **macro** | board **complet**, avancement, effectif, incidents |
| Ne voit pas | avancement fin, qui est où, incidents RH | **aucun montant**, ni budget, ni file d'offres |
| Fait | négocier / signer / écarter / **renégocier**, recruter | **affecter** et déplacer les équipes |

**Passerelle** : circule entre les salles, **relaie à l'oral**, ne clique sur rien.
**Solo** : un seul joueur → il gère tout.

<!--
Placer les deux salles DOS À DOS ou dans deux pièces. Interdire de regarder l'écran d'en face.
La passerelle n'a pas d'écran (ou un écran en lecture seule).
-->

---

# La négociation de contrat (Direction)

À l'acceptation, deux curseurs — chaque cran **échange de la valeur** contre autre chose :

| Délai | Effet | Valeur |
|---|---|---|
| Express | −2 sprints d'échéance | ×1,25 |
| Standard | — | — |
| Confort | +3 sprints d'échéance | ×0,85 |

| Périmètre | Effet | Valeur |
|---|---|---|
| Léger | −1 dev, −1 QA requis | ×0,70 |
| Standard | — | — |
| Costaud | +1 dev, +1 QA requis | ×1,40 |

**Renégociation** en cours de route : +1 sprint d'échéance contre −10 % de valeur (**2 fois max**).

<!--
Le piège : la Direction ne connaît pas la capacité réelle. Signer "Express + Costaud"
sans demander à la Delivery = quasi garanti de payer des retards.
-->

---

# Le rôle de l'hôte

- Ouvre la partie, communique le **code**
- Projette le **tableau de bord** de toutes les équipes
- **Démarre** la partie et **valide** chaque sprint (ou laisse le minuteur de 60 s le faire)
- Peut **±30 s** au minuteur, réinitialiser
- **Pause automatique tous les 5 sprints** : le minuteur se fige, l'hôte explique
  les changements puis clique **« Reprendre le sprint »**
- **Arbitre les trames** (voir plus loin) — l'effet des trames est manuel, c'est vous

---

# Mise en place (10 min)

1. Hôte : ouvrir l'app, créer la partie, projeter le dashboard, annoncer le **code**
2. Chaque joueur : ouvrir l'URL, **Rejoindre** → nom + code + **nom d'équipe** + **rôle**
   - même nom d'équipe = même board
   - rôles : *Direction* / *Delivery* / *Passerelle* / *Solo*
3. Les salles se séparent physiquement
4. Tout le monde lit la **page de règles commune** (écran de lobby)
5. Hôte : **Démarrer**

<!--
Vérifier que chaque équipe a AU MOINS une Direction et une Delivery.
Si équipe à 1 ou 2 : Solo, ou Direction+Delivery sans passerelle (ils se parlent direct).
-->

---

# Déroulé de la séance

| Temps | Séquence |
|---|---|
| 0:00 | Accueil, objectifs, contexte |
| 0:15 | Règles + rôles + négociation |
| 0:30 | Mise en place technique |
| 0:40 | **Manche 1** — sprints 1 → 5 |
| 1:00 | *(pause auto)* Trame + stand-up (5 min) → **Reprendre** |
| 1:05 | **Manche 2** — sprints 6 → 10 |
| 1:25 | *(pause auto)* Trame + stand-up → **Reprendre** |
| 1:30 | **Manche 3** — sprints 11 → 15 |
| 1:50 | *(pause auto)* Trame + stand-up → **Reprendre** |
| 1:55 | **Manche 4** — sprints 16 → 20 |
| 2:15 | Bilan à l'écran + **débrief** |

---

# Rituel entre chaque manche (5 min)

> À la fin des sprints **5, 10 et 15**, l'app **fige le minuteur** d'elle-même.
> Rien ne bouge tant que l'hôte n'a pas cliqué **« Reprendre »**.

**Stand-up croisé, à voix haute, 1 min par équipe :**

1. **Delivery** : « santé du flux » — quelle colonne est saturée ? combien de projets figés ?
2. **Direction** : « santé de l'argent » — CA net, contrats risqués, échéances proches
3. Une **décision** annoncée pour la manche suivante

Puis l'animateur révèle la **trame**.

<!--
Ce rituel EST le cœur pédagogique. Il force l'interface Direction–Delivery et rend
visible ce que chacun ne voyait pas.
-->

---

# Manche 1 — Sprints 1 à 5

**Focus d'apprentissage : le flux et le WIP**

Consignes minimales : signer des contrats, mettre des gens dessus, livrer.

**Ce que l'animateur observe :**
- Qui pousse trop de projets en analyse d'un coup ?
- Le multitâche : des membres éparpillés sur 4 projets à ½
- La Direction signe-t-elle sans parler à la Delivery ?

**Questions à poser au stand-up :**
- Quelle colonne est déjà bouchée ?
- Combien de projets « en cours » réellement en train d'avancer ?

---

# 🎲 Trame après le Sprint 5 — « Mobilité interne »

Chaque équipe fait **tourner un joueur d'une salle à l'autre**
(un membre de la Direction passe en Delivery **ou** l'inverse).

- La personne **garde ce qu'elle sait**, mais **n'a plus accès** à son ancien écran
- Elle prend son nouveau poste **immédiatement**

**Objectif :** montrer le coût d'un changement d'équipe — perte de contexte,
temps de reprise, connaissance qui ne circule que si on la **verbalise**.

<!--
Variante équipe à 2 : ils échangent simplement de rôle (Direction <-> Delivery).
Laisser 60 s de passation, pas plus.
-->

---

# Manche 2 — Sprints 6 à 10

**Focus : les goulots et la spécialisation**

Les gros budgets (`big`) commencent à apparaître dans la file.

**Ce que l'animateur observe :**
- QA en goulot (WIP test = 2) : les projets s'entassent avant la recette
- Devs Front/Back placés sur des projets *fullstack* → efficacité ½ non anticipée
- La Direction commence-t-elle à utiliser **Confort / Léger** pour se sécuriser ?

---

# 🎲 Trame après le Sprint 10 — « Panne de passerelle »

Pendant **3 sprints**, la Direction et la Delivery **ne se parlent plus à l'oral**.

- Communication **uniquement par écrit** : feuilles A5 déposées sur une table centrale
- 1 message = 1 feuille · pas de dialogue en temps réel
- La passerelle **transporte les feuilles**, sans commenter

**Objectif :** rendre tangible le coût d'une communication asynchrone / dégradée
(latence, malentendus, décisions prises sans l'info d'en face).

<!--
Variante "grand groupe" : à la place, le meilleur dev Full de l'équipe en tête est
"détaché" 2 sprints dans l'équipe dernière (péréquation de staffing). Il peut être
affecté par la Delivery de l'équipe d'accueil.
-->

---

# Manche 3 — Sprints 11 à 15

**Focus : la dette et l'aléa**

Les bugs en production s'accumulent si personne ne les traite.

**Ce que l'animateur observe :**
- Une équipe qui livre beaucoup **sans jamais** garder un dev pour la maintenance
- Le vrai coût d'un bug sur un **gros** projet (−20 % du budget / sprint)
- Contrats signés **Express** au sprint 3 qui arrivent à échéance maintenant

---

# 🎲 Trame après le Sprint 15 — « Revue de direction »

Chaque **Direction annonce à voix haute**, devant tout le monde,
son **CA net visé pour le Sprint 20**.

- L'écart réel constaté au débrief sera commenté
- Écart > 20 % : la Direction explique **ce qu'elle n'avait pas vu**

**Option cumulable — « Gel budgétaire » :** plus aucun **recrutement** possible sur les 3 derniers sprints.

**Objectif :** engagement public, confrontation prévision / réalité, effet d'une
contrainte de ressources en fin de course.

---

# Manche 4 — Sprints 16 à 20

**Focus : finir**

- Terminer ce qui est presque livré ? ou lancer un dernier gros contrat ?
- Solder la dette (bugs) avant la photo finale
- Renégocier les échéances intenables plutôt que payer le retard

**Option — « Rush de fin d'année » :** les 2 derniers sprints passent à **45 s**.

---

# Bilan à l'écran

Sur le dashboard hôte, pour chaque équipe :

- **CA net** (le classement)
- CA livré · pénalités · recrutements
- Projets livrés · courbe de progression
- Nombre de projets restés figés / en retard / en bug

<!--
Laisser 2 min de lecture silencieuse du tableau avant de lancer le débrief.
Ne pas commenter les scores tout de suite.
-->

---

# Débrief — questions au groupe (1/2)

**Sur le flux :**
- Quelle colonne a été votre goulot ? l'avez-vous vu venir ?
- Combien de projets meniez-vous « en même temps » ? combien avançaient vraiment ?
- Qu'est-ce qui change si on **limite** volontairement les projets en cours ?

**Sur les gens :**
- Qu'a coûté la « mobilité interne » du sprint 5 ?
- Le multitâche à ½ : gain ou perte nette ?

---

# Débrief — questions au groupe (2/2)

**Sur la communication :**
- Qu'est-ce qui a cassé pendant la « panne de passerelle » ?
- Décisions de la Direction prises sans l'info de la Delivery → conséquences ?
- Un point d'échange régulier aurait-il changé quelque chose ?

**Sur les arbitrages :**
- Vos contrats **Express** : rentables au final, ou mangés par les retards ?
- Avez-vous gardé une **marge** pour absorber l'aléa, ou tout optimisé ?
- Renégocier tôt vs payer le retard : qu'auriez-vous fait autrement ?

---

# Points clés à retenir

1. **Le travail non terminé ne rapporte rien** — et il coûte (files, contexte, risque)
2. **Limiter l'en-cours accélère le tout** : moins de projets ouverts = livraison plus rapide
3. **Le goulot commande le rythme** : optimiser ailleurs ne sert à rien
4. **Le multitâche est une taxe** : 1 personne à 50 % sur 2 sujets < 1 personne à 100 % sur 1
5. **La dette se paie avec intérêts** : un bug ignoré coûte chaque sprint
6. **Séparer « vendre » et « livrer » crée un angle mort** : seul un échange régulier le comble
7. **Tout arbitrage a une contrepartie** : délai, budget, ressources, qualité — on en choisit, on n'en gagne pas

---

# Pour aller plus loin

- **Kanban** : WIP limits, classes de service, cartes bloquées
- **Métriques de flux** : lead time, throughput, work item age, CFD
- **Théorie des contraintes** : identifier / exploiter / subordonner au goulot
- **Coût du délai** (CoD) et séquencement (WSJF)
- **Loi de Little** : en-cours = débit × temps de traversée

---

# Annexe A — Table des trames

| Après | Nom | Effet | Arbitrage par |
|---|---|---|---|
| S5 | Mobilité interne | 1 joueur change de salle, sans son ancien écran | Équipes (60 s de passation) |
| S10 | Panne de passerelle | Communication écrite seule, 3 sprints | Animateur (feuilles A5) |
| S10 *(var.)* | Détachement | Meilleur Full de la 1ʳᵉ → équipe dernière, 2 sprints | Delivery d'accueil |
| S15 | Revue de direction | CA net visé annoncé publiquement | Chaque Direction |
| S15 *(opt.)* | Gel budgétaire | Aucun recrutement, 3 derniers sprints | Animateur |
| S18 *(opt.)* | Rush de fin d'année | Sprints à 45 s | Hôte (−15 s) |

<!--
Ne pas empiler toutes les trames sur un groupe débutant. Choisir : S5 + S10 + S15
suffisent. Les variantes/options sont pour un 2ᵉ passage ou un public avancé.
-->

---

# Annexe B — Checklist animateur

**Avant :** 1 poste hôte + vidéoproj · 1 device par joueur · 2 espaces séparés par équipe · feuilles A5 + feutres · minuteur visible

**Pendant :** noter au tableau les goulots observés par manche · tenir le rituel de stand-up · déclencher les trames à l'heure · ne pas aider à optimiser, juste questionner

**Après :** 2 min de lecture du tableau en silence · débrief dans l'ordre flux → gens → com → arbitrages · faire formuler les 7 points clés **par les participants**

---

# Annexe C — Lire le score

Le **CA net** classe, mais le débrief porte sur le **comment** :

- CA livré élevé **+ grosses pénalités** → a foncé sans marge
- CA net moyen **+ zéro projet figé/en retard** → flux maîtrisé, sous-exploité
- Beaucoup de **recrutement** → a acheté de la vitesse : rentable ?
- Écart **prévision (S15) / réel (S20)** → qualité du pilotage Direction

> Une équipe peut « perdre » au score et avoir la meilleure analyse. C'est ça qu'on récompense.
