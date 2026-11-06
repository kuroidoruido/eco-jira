# Guide de Test pour eco-jira

Ce guide explique comment tester l'extension **eco-jira** avec le **Mock Jira Server** local.

## 🎯 Problèmes résolus dans cette version

Les problèmes précédents ont été corrigés :

✅ **`npm run build` fonctionne maintenant** - Les scripts sont configurés correctement
✅ **Mock Jira complet** - Avec vrais appels HTTP, pas juste du mock côté client
✅ **50+ issues réalistes** - Générées dynamiquement par le serveur
✅ **Plusieurs tableaux** - Kanban, Sprint, Backlog avec des colonnes réalistes
✅ **Délais réseau simulés** - 100-200ms aléatoires sur toutes les requêtes API
✅ **Pages dynamiques** - Toutes les pages font de vrais appels fetch() vers le serveur

## 🚀 Comment démarrer le Mock Jira Server

### Méthode 1 : Utiliser npm (recommandé)

```bash
cd /home/anthony/Projets/eco-jira
npm run test:mock-start
```

Cette commande :
1. Se place dans le dossier `test/jira-mock/`
2. Installe les dépendances si nécessaire
3. Démarre le serveur sur le port 3000

### Méthode 2 : Démarrer manuellement

```bash
cd /home/anthony/Projets/eco-jira/test/jira-mock
npm install  # Une seule fois
npm start
```

### Méthode 3 : Utiliser le script shell

```bash
cd /home/anthony/Projets/eco-jira/test/jira-mock
chmod +x start.sh  # Une seule fois
./start.sh
```

## 🌐 Accéder au Mock Jira

Une fois le serveur démarré, ouvrez votre navigateur et allez sur :

**👉 [http://localhost:3000/jira](http://localhost:3000/jira)**

### Pages disponibles :

| URL | Description | Issues |
|-----|-------------|--------|
| `/jira` | Page d'accueil | Affiche les tableaux et problèmes récents |
| `/jira/boards` | Liste des tableaux | 5 tableaux disponibles |
| `/jira/board/1` | Tableau Kanban | ~30 issues |
| `/jira/board/2` | Tableau Sprint | ~25 issues |
| `/jira/board/3` | Tableau Backlog | ~45 issues |
| `/jira/issue/JIRA-N` | Détail du problème | N = 1 à 50 |

## 🧪 Activer eco-jira sur le Mock Jira

### Dans Chrome :

1. Ouvrez Chrome et allez sur `chrome://extensions/`
2. Activez le **mode développeur** (en haut à droite)
3. Trouvez l'extension **eco-jira** et cliquez sur **"Details"**
4. Dans **"Site access"**, sélectionnez **"On specific sites"**
5. Ajoutez : `http://localhost:3000/*`
6. Cliquez sur **"Add"**

**OU** (plus simple) :
1. Allez sur [http://localhost:3000/jira](http://localhost:3000/jira)
2. Cliquez sur l'icône de l'extension eco-jira dans la barre d'outils
3. Cliquez sur **"Activer sur ce site"** ou **"Add current site"**

### Dans Firefox :

1. Ouvrez Firefox et allez sur `about:debugging#/runtime/this-firefox`
2. Trouvez l'extension **eco-jira**
3. Cliquez sur **"Manage"**
4. Dans **"Permissions"**, ajoutez : `http://localhost:3000/*`
5. Sauvegardez

**OU** :
1. Allez sur [http://localhost:3000/jira](http://localhost:3000/jira)
2. Cliquez sur l'icône de l'extension eco-jira
3. Cliquez sur **"Activer sur ce site"**

## ✅ Tests à effectuer

### Test 1 : Navigation sur la page d'accueil

1. Allez sur [http://localhost:3000/jira](http://localhost:3000/jira)
2. **Observez** : La page charge avec les tableaux et problèmes récents
3. **Vérifiez** : Les appels API apparaissent dans la console (F12)
4. **Rafraîchissez** la page (F5)
5. **Attendez** : Le chargement doit être **instantané** (cache actif)
6. **Ouvrez la popup** de l'extension → Les statistiques doivent montrer des requêtes en cache

### Test 2 : Navigation entre tableaux

1. Allez sur [http://localhost:3000/jira/boards](http://localhost:3000/jira/boards)
2. Cliquez sur **"Tableau Kanban"**
3. **Observez** : Le tableau se charge avec des dizaines d'issues
4. **Attendez** 1-2 secondes (délai simulé)
5. Cliquez sur **"Tableau Sprint"**
6. **Attendez** 1-2 secondes
7. Revenez sur **"Tableau Kanban"**
8. **Attendez** : Le chargement doit être **instantané** (cache actif)

### Test 3 : Détail des problèmes

1. Allez sur [http://localhost:3000/jira/board/1](http://localhost:3000/jira/board/1)
2. Cliquez sur une carte de problème (ex: JIRA-1)
3. **Observez** : La page de détail se charge
4. **Attendez** 1-2 secondes
5. **Retournez** au tableau (bouton retour du navigateur)
6. **Attendez** : Le tableau doit se recharger **instantanément**
7. Cliquez **à nouveau** sur la même carte
8. **Attendez** : La page de détail doit être **instantanée**

### Test 4 : Recherche et filtrage

1. Allez sur [http://localhost:3000/jira/board/1](http://localhost:3000/jira/board/1)
2. Utilisez la barre de recherche en haut à droite
3. Tapez "bug" ou "fix"
4. **Observez** : Les résultats sont filtrés
5. **Rafraîchissez** la page
6. **Attendez** : Les résultats doivent être **instantanés**

### Test 5 : Chargement multiple d'issues

1. Allez sur [http://localhost:3000/jira/board/1](http://localhost:3000/jira/board/1)
2. Cliquez sur 5-10 cartes différentes rapidement
3. Chaque clic ouvrira le détail de l'issue
4. **Observez** : Après le premier chargement, les suivants doivent être **instantanés**

## 📊 Que vérifier dans la popup eco-jira

Après avoir navigué, ouvrez la popup de l'extension. Vous devriez voir :

### Statistiques globales :
- ✅ **Requêtes interceptées** : Nombre > 0
- ✅ **Requêtes en cache** : Nombre > 0 (après navigation répétée)
- ✅ **Temps moyen de réponse** : Devrait diminuer après le cache
- ✅ **Bande passante économisée** : Devrait être > 0

### Journal des requêtes :
- ✅ **Requêtes API visibles** : `/rest/api/2/issue/*`, `/rest/agile/1.0/board/*`, etc.
- ✅ **Statut "CACHED"** : Pour les requêtes répétées
- ✅ **Statut "NETWORK"** : Pour les premières requêtes

### Bouton "Test" :
Le bouton **"Test"** sur chaque instance dans la popup devrait :
1. Faire un appel test vers Jira
2. Afficher les résultats du test
3. Montrer si le cache fonctionne

*(Note : Si le bouton ne fait rien, c'est un problème connu à corriger dans l'extension)*

## 🔍 Dépannage

### Problème : Le cache ne fonctionne pas

**Vérifications :**

1. ✅ **eco-jira est activée** sur `http://localhost:3000/*`
2. ✅ **Le content script est injecté** :
   - Ouvrez F12 → Onglet "Elements"
   - Vérifiez qu'il y a un script `content.js` chargé
3. ✅ **Les appels fetch sont faits** :
   - Ouvrez F12 → Onglet "Network"
   - Filtrez par "XHR" ou "Fetch"
   - Vous devriez voir des appels vers `/rest/api/2/...`
4. ✅ **Pas d'erreurs** dans la console :
   - Ouvrez F12 → Onglet "Console"
   - Aucune erreur rouge

**Solutions possibles :**

- **Rafraîchir l'extension** : Dans `chrome://extensions/`, cliquez sur le bouton de rafraîchissement de l'extension
- **Recharger la page** : Ctrl+F5 pour recharger sans cache navigateur
- **Vérifier les permissions** : L'extension a besoin de `storage`, `activeTab`, `tabs`
- **Vérifier le manifest** : Assurez-vous que `content_scripts` a `matches: ["<all_urls>"]`

### Problème : Les pages ne se chargent pas

**Causes possibles :**

1. **Serveur non démarré** : Vérifiez que le terminal affiche "Mock Jira server running"
2. **Port 3000 occupé** : Essayez de démarrer sur un autre port en modifiant `PORT` dans `server.js`
3. **Problème de CORS** : Le serveur a déjà CORS activé, mais vérifiez la console
4. **Fichiers manquants** : Vérifiez que `test/jira-mock/public/` contient tous les fichiers

**Solution :**

```bash
# Tuer tout processus sur le port 3000
pkill -f "node server.js"

# Redémarrer le serveur
cd /home/anthony/Projets/eco-jira/test/jira-mock
npm start
```

### Problème : "Permission refusée" lors de l'activation

C'est un problème connu avec l'API `permissions.request` qui doit être appelée depuis un **user input handler**.

**Solution pour eco-jira :**

Dans `src/popup/popup.js`, changez la gestion des permissions :

```javascript
// ❌ Mauvais : Appel direct
chrome.permissions.request(...);

// ✅ Bon : Appel dans un handler utilisateur
button.addEventListener('click', () => {
  chrome.permissions.request(...);
});
```

Assurez-vous que **toutes** les appels à `permissions.request` sont dans un handler d'événement utilisateur (click, keydown, etc.) et **pas** dans le code d'initialisation.

## 📈 Résultats attendus

### Sans cache (premier chargement) :
- ⏱️ Temps de réponse : **100-200ms** (délai simulé)
- 📦 Bande passante : **~1-5 KB par requête**
- ⚡ Requêtes : **Toutes en réseau**

### Avec cache (chargement répétée) :
- ⏱️ Temps de réponse : **< 10ms** (depuis le cache)
- 📦 Bande passante : **0 KB** (pas de requête réseau)
- ⚡ Requêtes : **Toutes en cache**

### Statistiques après 10 minutes de test :
| Métrique | Attendu |
|----------|---------|
| Requêtes interceptées | 50-200+ |
| Requêtes en cache | 30-150+ |
| Bande passante économisée | 100-500+ KB |
| Temps moyen de réponse | < 50ms |

## 🛠️ Construction de l'extension

### Pour Chrome :

```bash
cd /home/anthony/Projets/eco-jira
npm run build
npm run package
```

Le package sera généré dans `dist/chrome/` avec :
- `eco-jira-chrome.zip` - Extension zippée
- `eco-jira-chrome/` - Dossier pour chargement manuel

**Pour charger manuellement dans Chrome :**

1. Allez sur `chrome://extensions/`
2. Activez le **mode développeur**
3. Cliquez sur **"Load unpacked"**
4. Sélectionnez le dossier `dist/chrome/eco-jira-chrome/`

### Pour Firefox :

```bash
cd /home/anthony/Projets/eco-jira
npm run build
npm run package
```

Le package sera généré dans `dist/firefox/` avec :
- `eco-jira-firefox.zip` - Extension zippée
- `eco-jira-firefox.xpi` - Package Firefox

**Pour charger manuellement dans Firefox :**

1. Allez sur `about:debugging#/runtime/this-firefox`
2. Cliquez sur **"Load Temporary Add-on"**
3. Sélectionnez le fichier `dist/firefox/eco-jira-firefox.xpi`

## 🎯 Prochaines étapes

1. ✅ **Tester avec le Mock Jira** - Vérifiez que le cache fonctionne
2. ⏳ **Corriger le bouton "Test"** - Il ne fait rien actuellement
3. ⏳ **Améliorer les logs** - Ajouter des logs détaillés pour le débogage
4. ⏳ **Page de détails des logs** - Le lien "info/Logs" dans la popup ne fonctionne pas
5. ⏳ **Optimiser la stratégie de cache** - Ajuster le TTL et les exceptions

## 📚 Documentation technique

### Architecture du Mock Jira Server

```
test/jira-mock/
├── server.js          # Express server avec endpoints API
├── package.json       # Dépendances (Express)
├── start.sh           # Script de démarrage
├── README.md          # Documentation complète
└── public/
    ├── index.html     # Page d'accueil (fetch /rest/agile/1.0/board)
    ├── issue.html     # Détail problème (fetch /rest/api/2/issue/{key})
    ├── boards/
    │   ├── index.html # Liste tableaux (fetch /rest/agile/1.0/board)
    │   └── board.html # Tableau (fetch /rest/agile/1.0/board/{id}/issue)
    ├── css/
    │   ├── reset.css  # Reset CSS
    │   ├── styles.css # Styles principaux
    │   ├── boards.css # Styles des tableaux
    │   └── issue.css  # Styles des problèmes
    └── js/
        └── app.js      # Intercepteur fetch/XHR (délais de 100-200ms)
```

### Endpoints API implémentés

**REST API v2** (`/rest/api/2/`):
- `serverInfo` - Infos serveur
- `field` - Champs
- `issuetype` - Types de problèmes
- `status` - Statuts
- `priority` - Priorités
- `resolution` - Résolutions
- `user` - Utilisateurs
- `myself` - Utilisateur courant
- `project` - Projets
- `issue/{keyOrId}` - Détails d'un problème
- `search?jql=...` - Recherche JQL

**Agile API v1.0** (`/rest/agile/1.0/`):
- `board` - Liste des tableaux
- `board/{id}` - Détails d'un tableau
- `board/{id}/issue` - Problèmes d'un tableau

### Données générées

- **50 issues** (JIRA-1 à JIRA-50)
- **7 utilisateurs** mock
- **1 projet** (JIRA)
- **3 tableaux** (Kanban, Sprint, Backlog)
- **5 types de problèmes** (Bug, Story, Task, Epic, Sub-task)
- **8 statuts** (To Do, In Progress, In Review, Done, Blocked, Open, Closed, Resolved)
- **5 priorités** (Highest, High, Medium, Low, Lowest)

## 💬 Support

Pour toute question ou problème :
- Vérifiez d'abord les **logs de la console** (F12)
- Consultez les **logs de l'extension** dans la popup
- Vérifiez que les **permissions** sont correctement configurées
- Testez avec le **Mock Jira** pour isoler le problème

---

**Version** : 1.0.0  
**Date** : 2026-11-06  
**Auteur** : Guide de test pour eco-jira
