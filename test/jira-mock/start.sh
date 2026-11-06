#!/bin/bash

echo "🚀 Démarrage du serveur Mock Jira..."
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    echo "   Installez Node.js (v18+) avant de continuer"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    echo "   Installez npm avant de continuer"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

echo "✅ Démarrage du serveur..."
echo ""
echo "🌐 Accédez à : http://localhost:3000/jira"
echo ""
echo "📋 Pages disponibles :"
echo "   - http://localhost:3000/jira           (Accueil)"
echo "   - http://localhost:3000/jira/boards   (Liste des tableaux)"
echo "   - http://localhost:3000/jira/board/1  (Tableau Kanban)"
echo "   - http://localhost:3000/jira/board/2  (Tableau Scrum)"
echo "   - http://localhost:3000/jira/issue/JIRA-1 (Problème 1)"
echo ""
echo "💡 Astuce :"
echo "   Activez eco-jira sur http://localhost:3000"
echo "   Puis naviguez pour tester le cache !"
echo ""

# Start server
node server.js
