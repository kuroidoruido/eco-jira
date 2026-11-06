# Brief d'initialisation : eco-jira

## 🎯 Vision

**eco-jira** est une extension navigateur open source (Chrome + Firefox) qui accélère Jira en réduisant drastiquement les requêtes réseau, via un cache intelligent côté navigateur. Elle affiche un compteur d'octets économisés, consultable au clic sur l'icône (pas de badge permanent).

## Le problème (contexte, à mettre dans le README)

- Jira est lent structurellement : ouvrir un ticket déclenche un fan-out de dizaines de requêtes REST, souvent séquentielles. Atlassian mesure ça officiellement (Performance Insights, seuil "lent" &gt; 5,9 s de TTVC).
- L'API REST de Jira ne renvoie ni `ETag` ni `Last-Modified` (JRASERVER-36374) : le navigateur ne peut pas revalider efficacement, d'où l'intérêt d'une couche de cache gérée par l'extension.
- Les `batch.js`/`batch.css` générés à la volée dépassent 7 Mo compressés et sont souvent servis avec des headers `no-cache`.
- Aucune extension existante ne fait cela (créneau vierge, vérifié sur les stores Chrome/AMO et GitHub).

## ⚙️ Fonctionnalités (scope v1)

1. **Activation manuelle par site** : pas de détection automatique. Clic sur l'icône → si l'URL courante n'est pas un Jira déjà enregistré, bouton "Activer sur ce site" → `chrome.permissions.request({ origins: ["https://<host>/*"] })` → stockage de la base URL (origin + éventuel sous-chemin type `/jira`). Validation optionnelle via `GET {base}/rest/api/2/serverInfo` (non bloquante : SSO peut renvoyer 401/redirect).
2. **Cache infini des métadonnées quasi-immuables** : `/rest/api/2/field`, `/status`, `/priority`, `/issuetype`, `/resolution`, `/project`, createmeta, utilisateurs (avatars, noms). Bouton "Vider le cache" dans le volet + invalidation auto lors d'une erreur de validation sur un POST (champ inconnu).
3. **Stale-while-revalidate sur les tickets** : TTL 2-5 min pour `GET /issue/{key}` et ses sous-ressources (commentaires, worklog, transitions). Jamais de cache servi après une mutation locale (mettre à jour le cache avec la réponse de la mutation). Revalidation en tâche de fond, sans re-render si la réponse est identique. Listes JQL/board : pas de cache disque, seulement un cache de navigation en mémoire (TTL court).
4. **Compteur d'économies** : Mo/Go/To économisés + requêtes évitées depuis l'installation, persistés (`chrome.storage.local`), affichés seulement dans le volet popup au clic sur l'icône (comme uBlock Origin, pas de badge).
5. **États d'icône** : verte = actif sur le site courant, grise = site non-Jira/non-enregistré (comportement uBlock).

## 🚧 Hors scope v1 (roadmap README)

- Équivalences CO₂ du quotidien (recharges de smartphone \~9 g CO₂e, charges de laptop \~35 g) : phase 2, avec mention "estimation, modèle SWD v4".
- Préchargement des tickets liés au survol ("hover prefetch") : phase 2, gros gain perçu.
- Réécriture des headers Cache-Control des assets statiques : phase 2.
- Mode "équipe" avec compteur agrégé.

## 🛠️ Contraintes techniques

- **Manifest V3**, codebase unique Chrome + Firefox (WebExtension polyfill si besoin, `browser.*` vs `chrome.*`).
- Interception : privilégier le pattern content script qui court-circuite `fetch`/XHR de la page pour injecter les réponses cachées (le `webRequest` blocking n'existe pas en MV3 Chrome). Alternative plus robuste à évaluer : préchauffage seul.
- Cache : IndexedDB ou `chrome.storage.local`, jamais en mémoire seule (les service workers MV3 sont éphémères). Cache par instance Jira (base URL), avec la version serveur (`serverInfo`) stockée pour invalidation propre.
- Permissions minimales à l'installation : `storage` + `activeTab` (+ `tabs` pour lire l'URL courante). Les host permissions se demandent à la volée à l'activation d'un site.
- Prévoir la fenêtre MV3 : le popup meurt en \~30 s, le dialogue `permissions.request` peut devenir invalide → bouton "cliquer à nouveau".
- Tests de bout en bout sur un Jira Cloud + un Data Center (sous-chemin `/jira`, SSO Okta/Azure AD).

## 🎨 Identité visuelle

Icône "H+" : losange arrondi vert (dégradé `#22c55e → #059669`), contour blanc épais, éclair blanc cassé (`#f0fdf4`) en négatif, style app-icon moderne.

- Version principale (48/128 px) : contour `stroke-width="10"`.
- Version 16 px dédiée : contour `stroke-width="14"` (obligatoire, un seul SVG ne fait pas bien à toutes les tailles).
- Variante grise (`#9ca3af`) pour l'état "site inactif".

SVG sources disponibles (à exporter en PNG 16/32/48/128 pour le manifest, ex. script `sharp` au build) :

![logo](/logo/logo.svg)

## 📦 Livrables attendus

- Repo open source licence MIT, structure prête pour Chrome Web Store + AMO.
- `manifest.json` MV3 commun, popup HTML/CSS/JS vanilla (volet style uBlock : liste des instances Jira, état du site courant, bouton activer/retirer, compteur Mo/Go/To + requêtes évitées, bouton "Vider le cache").
- Service worker : gestion des instances, compteur d'économies, invalidation.
- README avec : le problème (fan-out, no-cache, pas d'ETag), le mode d'emploi (installer → aller sur son Jira → 1 clic), la roadmap, et la transparence sur ce que le cache fait et ne fait pas.
- Script de build : export PNG des icônes + packaging zip pour les deux stores.

## ⚠️ Garde-fous

- Ne jamais servir de cache périmé après une mutation locale de l'utilisateur.
- Transparence radicale : le README et le volet expliquent ce qui est caché et pourquoi (les gens sont prudents avec une extension qui touche au trafic d'entreprise).
- Éviter tout ce qui ressemble à de la surveillance : pas de content script actif sur les sites non enregistrés.