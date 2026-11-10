#!/bin/bash
# infra/scripts/deploy-rollback.sh

ACTION=$1
TAG=${2:-latest}

if [ "$ACTION" == "deploy" ]; then
    echo "=== [CI/CD] Desplegando versión: $TAG ==="
    export IMAGE_TAG=$TAG
    docker compose -f infra/compose.yaml pull
    docker compose -f infra/compose.yaml up -d --remove-orphans
    
    echo "Verificando Healthcheck..."
    sleep 5
    if curl -f http://localhost:3000/api/healthcheck; then
        echo "Despliegue exitoso."
    else
        echo "Healthcheck falló. Iniciando Rollback automático..."
        ./infra/scripts/deploy-rollback.sh rollback
    fi

elif [ "$ACTION" == "rollback" ]; then
    echo "=== [CI/CD] Ejecutando Rollback a versión estable anterior ==="
    export IMAGE_TAG=previous
    docker compose -f infra/compose.yaml up -d --build
    echo "Rollback completado."
else
    echo "Uso: ./deploy-rollback.sh [deploy|rollback] [TAG]"
fi