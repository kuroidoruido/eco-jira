# Mock Jira Server

Un serveur de test qui simule une instance Jira complète pour tester l'extension **eco-jira**.

## 📋 Description

Ce mock server permet de :

- **Simuler des appels API Jira** avec des délais aléatoires (100-200ms) pour tester le cache de l'extension
- **Générer dynamiquement 50+ issues réalistes** avec tous les champs nécessaires
- **Fournir plusieurs tableaux** (Kanban, Scrum) pour tester la navigation
- **Faire de vrais appels HTTP** que le content script de eco-jira peut intercepter

## 🚀 Installation et exécution

### Prérequis

- Node.js v18+
- npm ou yarn

### Étapes

1. **Installer les dépendances** :

```bash
cd /home/anthony/Projets/eco-jira/test/jira-mock
npm install
```

2. **Démarrer le serveur** :

```bash
# Méthode 1 : utiliser npm
npm run start

# Méthode 2 : utiliser le script de démarrage
chmod +x start.sh
./start.sh

# Méthode 3 : démarrer directement
node server.js
```

3. **Accéder à l'application** :
   
   Ouvrez votre navigateur et allez sur : [http://localhost:3000/jira](http://localhost:3000/jira)

## 🌐 Pages disponibles

| URL | Description |
|-----|-------------|
| `http://localhost:3000/jira` | Page d'accueil avec problèmes récents |
| `http://localhost:3000/jira/boards` | Liste des tableaux disponibles |
| `http://localhost:3000/jira/board/1` | Tableau Kanban (30+ problèmes) |
| `http://localhost:3000/jira/board/2` | Tableau Sprint (25+ problèmes) |
| `http://localhost:3000/jira/board/3` | Tableau Backlog (45+ problèmes) |
| `http://localhost:3000/jira/issue/JIRA-N` | Détail du problème JIRA-N (N=1-50) |

## 🔌 Endpoints API disponibles

### REST API v2

- `GET /rest/api/2/serverInfo` - Informations sur le serveur
- `GET /rest/api/2/field` - Liste des champs
- `GET /rest/api/2/issuetype` - Types de problèmes
- `GET /rest/api/2/status` - Statuts
- `GET /rest/api/2/priority` - Priorités
- `GET /rest/api/2/resolution` - Résolutions
- `GET /rest/api/2/user` - Liste des utilisateurs
- `GET /rest/api/2/myself` - Utilisateur courant
- `GET /rest/api/2/project` - Projets
- `GET /rest/api/2/issue/{keyOrId}` - Détails d'un problème
- `GET /rest/api/2/search?jql=...` - Recherche JQL

### Agile API v1.0

- `GET /rest/agile/1.0/board` - Liste des tableaux
- `GET /rest/agile/1.0/board/{id}` - Détails d'un tableau
- `GET /rest/agile/1.0/board/{id}/issue` - Problèmes d'un tableau

## 🧪 Testing eco-jira

### Étapes pour tester :

1. **Démarrer le mock server** : `npm run start`
2. **Ouvrir Chrome/Firefox** sur [http://localhost:3000/jira](http://localhost:3000/jira)
3. **Activer eco-jira** sur ce domaine :
   - Cliquez sur l'icône de l'extension
   - Ajoutez `http://localhost:3000/*` ou `http://localhost:3000/jira*`
4. **Naviguer** entre les pages pour voir le cache en action
5. **Vérifier les statistiques** dans la popup de l'extension

### Ce qui doit se passer :

- ✅ La première navigation sur une page doit être normale
- ✅ La navigation suivante sur la même page doit être **instantanée** (cache active)
- ✅ Les statistiques dans la popup doivent montrer :
  - Des requêtes interceptées
  - Des réponses en cache
  - Un temps de réponse réduit

### Cas de test recommandés :

1. **Tableau Kanban** :
   - Aller sur `/jira/board/1`
   - Rafraîchir la page → doit être instantané
   - Cliquer sur une carte → ouvre le détail
   - Revenir au tableau → instantané

2. **Navigation entre tableaux** :
   - `/jira/board/1` → `/jira/board/2` → `/jira/board/1`
   - Le retour sur board/1 doit être instantané

3. **Détail des problèmes** :
   - `/jira/board/1` → cliquer sur JIRA-1 → `/jira/issue/JIRA-1`
   - Revenir en arrière → instantané
   - Recharger JIRA-1 → instantané

## 💡 Astuces

- **Tous les appels API ont un délai aléatoire de 100-200ms** pour simuler la latence réseau
- **50 problèmes pré-générés** avec des données réalistes
- **Les appels sont faits via fetch()** et sont donc interceptables par le content script
- **Les erreurs API sont gérées** avec des données de fallback pour éviter les blocages

## 🔧 Développement

### Structure du projet

```
test/jira-mock/
├── server.js          # Serveur Express principal
├── package.json       # Dépendances
├── start.sh           # Script de démarrage
├── README.md          # Ce fichier
└── public/
    ├── index.html     # Page d'accueil
    ├── issue.html     # Détail d'un problème
    ├── boards/
    │   ├── index.html # Liste des tableaux
    │   └── board.html # Tableau individuel
    ├── css/
    │   ├── reset.css  # Reset CSS
    │   ├── styles.css # Styles principaux
    │   ├── boards.css # Styles des tableaux
    │   └── issue.css  # Styles des problèmes
    └── js/
        └── app.js      # Intercepteur fetch/XHR
```

### Ajouter de nouveaux endpoints

Pour ajouter un nouvel endpoint API, éditez `server.js` et ajoutez une nouvelle route :

```javascript
app.get('/rest/api/2/newepndpoint', (req, res) => {
  res.json({ message: 'Hello from new endpoint!' });
});
```

### Modifier les données mock

Les issues sont générées dynamiquement dans `server.js`. Vous pouvez :
- Modifier le nombre d'issues (lignes 1-50)
- Changer les types, statuts, priorités disponibles
- Ajouter des champs supplémentaires

### Personnaliser les délais

Le délai est défini dans le middleware `addDelay()` (lignes 100-110). Vous pouvez :
- Changer la plage (actuellement 100-200ms)
- Désactiver pour certains endpoints
- Ajouter des délais variables

## 🐛 Résolution des problèmes

### Le serveur ne démarre pas

- Vérifiez que Node.js v18+ est installé : `node -v`
- Installez les dépendances : `npm install`
- Vérifiez qu'aucun autre service n'utilise le port 3000

### Les appels API échouent

- Vérifiez que le serveur est bien démarré
- Ouvrez la console du navigateur (F12) pour voir les erreurs
- Vérifiez que vous accédez à `http://localhost:3000` et non `https`

### Le cache ne fonctionne pas

- Vérifiez que eco-jira est **activée** sur le domaine
- Vérifiez dans la console du navigateur que les appels fetch passent bien
- Vérifiez que le content script est injecté (rechargez la page)
- Consultez les logs de l'extension

### Les pages ne s'affichent pas

- Vérifiez que le chemin URL est correct
- Essayez un rafraîchissement forcé (Ctrl+F5)
- Vérifiez la console pour les erreurs de chargement

## 📊 Données générées

### Issues (50 au total)

- **Clés** : JIRA-1 à JIRA-50
- **Types** : Bug, Story, Task, Epic, Sub-task
- **Statuts** : To Do, In Progress, In Review, Done, Blocked, Open, Closed, Resolved
- **Priorités** : Highest, High, Medium, Low, Lowest
- **Utilisateurs** : 7 utilisateurs mock
- **Projet** : Mock Jira Project (JIRA)

### Tableaux (3 au total)

- **ID 1** : Tableau Kanban
- **ID 2** : Tableau Sprint (Scrum)
- **ID 3** : Backlog Produit (Scrum)

## 🎯 Objectif

Ce mock server a été créé spécifiquement pour tester **eco-jira** dans des conditions réalistes :

1. ✅ **Requêtes HTTP réelles** (pas de données statiques)
2. ✅ **Délais réseau simulés** (100-200ms aléatoires)
3. ✅ **Données Jira réalistes** (même structure que l'API réelle)
4. ✅ **Navigation fluide** (multiples pages et tableaux)
5. ✅ **Cache efficace** (toutes les réponses peuvent être mises en cache)

Avec ce serveur, vous pouvez tester toutes les fonctionnalités de eco-jira sans avoir besoin d'une vraie instance Jira !

---

**Version** : 1.0.0  
**Créé pour** : eco-jira extension  
**Licence** : MIT
