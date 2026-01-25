#!/bin/bash

# Script de test pour les routes CRON
# Usage: ./test-cron.sh [route]
# Routes disponibles: injuries, live-scores, refresh-games, weekly-digest, all

BASE_URL="http://localhost:3000"
CRON_SECRET="${CRON_SECRET:-your-secret-here}"

# Couleurs pour les logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Test des routes CRON NBA Pronos${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Fonction pour tester une route
test_route() {
  local route=$1
  local name=$2

  echo -e "${YELLOW}🧪 Test: $name${NC}"
  echo -e "   Route: $route"
  echo ""

  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -H "Authorization: Bearer $CRON_SECRET" \
    "$BASE_URL$route")

  http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  body=$(echo "$response" | sed '/HTTP_STATUS/d')

  if [ "$http_status" = "200" ]; then
    echo -e "${GREEN}✅ Succès (200)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Erreur ($http_status)${NC}"
    echo "$body"
  fi

  echo ""
  echo -e "${BLUE}----------------------------------------${NC}\n"
}

# Routes CRON
case "${1:-all}" in
  injuries)
    test_route "/api/cron/update-injuries" "Mise à jour infirmerie"
    ;;

  live-scores)
    test_route "/api/cron/update-live-scores" "Mise à jour scores live + standings"
    ;;

  refresh-games)
    test_route "/api/cron/refresh-daily-games" "Détection matchs du jour"
    ;;

  weekly-digest)
    test_route "/api/cron/daily-digest" "Email récap hebdomadaire"
    ;;

  all)
    echo -e "${BLUE}🚀 Lancement de tous les tests CRON...${NC}\n"

    test_route "/api/cron/refresh-daily-games" "1️⃣  Détection matchs du jour"

    test_route "/api/cron/update-injuries" "2️⃣  Mise à jour infirmerie"

    test_route "/api/cron/update-live-scores" "3️⃣  Mise à jour scores live + standings"

    echo -e "${YELLOW}⚠️  Test email hebdo ignoré (évite spam)${NC}"
    echo -e "   Pour tester: ./test-cron.sh weekly-digest\n"

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   Tests terminés !${NC}"
    echo -e "${GREEN}========================================${NC}"
    ;;

  *)
    echo -e "${RED}Route inconnue: $1${NC}"
    echo ""
    echo "Usage: ./test-cron.sh [route]"
    echo ""
    echo "Routes disponibles:"
    echo "  injuries       - Mise à jour infirmerie (15 min)"
    echo "  live-scores    - Scores live + standings (1 min)"
    echo "  refresh-games  - Détection matchs (8h Paris)"
    echo "  weekly-digest  - Email hebdo (lundis 9h)"
    echo "  all            - Tous les tests (sauf email)"
    exit 1
    ;;
esac
