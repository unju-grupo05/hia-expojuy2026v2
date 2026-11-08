# Capítulo 15: Estrategia de Backup, Recuperación ante Desastres y Verificación de Integridad

**Proyecto:** ExpoJuy 2026 — Plataforma Ferial Digital  
**Área:** Base de Datos & Continuidad de Negocio (Integrante 2: Senior DBA)  
**Puntos del Trabajo Integrador:** Punto 4 (Persistencia y Backups) y Punto 15 (Documentación y Evidencias de Restauración)  
**Entorno:** Docker Compose (`infra/compose.yaml`)  
**Servicio de Backup:** `prodrigestivill/postgres-backup-local:17`  

---

## 1. Política de Copias de Seguridad y Objetivos de Recuperación

En una exposición de gran escala como la **ExpoJuy 2026**, la pérdida de datos de acreditación, telemetría o interacciones comerciales representaría un impacto crítico. Por ello, se diseñó una estrategia integral de copias de seguridad basada en los siguientes parámetros de continuidad operativa:

- **RPO (*Recovery Point Objective*):**
  - Con Replicación Streaming: **RPO $\approx$ 0 segundos** (sincronización continua de WALs).
  - Con Respaldo Lógico Diario: **RPO $\le$ 24 horas** (respaldos programados automáticos).
- **RTO (*Recovery Time Objective*):**
  - Restauración completa y validación de integridad de los **6.000.000 de registros** en **menos de 1 minuto** (medido: **53,54 segundos**).

### 1.1 Política de Retención Grandfather-Father-Son (GFS)
El contenedor de respaldo implementa una rotación estructurada para optimizar el almacenamiento en disco:
- **7 copias diarias (`BACKUP_KEEP_DAYS: 7`)**: Retiene el estado de los últimos 7 días.
- **4 copias semanales (`BACKUP_KEEP_WEEKS: 4`)**: Retiene una foto al final de cada semana del mes.
- **3 copias mensuales (`BACKUP_KEEP_MONTHS: 3`)**: Retiene un histórico mensual para auditoría post-evento.

---

## 2. Configuración en Docker Compose (`infra/compose.yaml`)

El servicio `backup` se encuentra desacoplado en la red interna `data`, sin exponer puertos al exterior:

```yaml
  backup:
    image: prodrigestivill/postgres-backup-local:17
    restart: unless-stopped
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      SCHEDULE: ${BACKUP_SCHEDULE:-@daily}
      BACKUP_KEEP_DAYS: 7
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 3
    volumes:
      - ./backups:/backups
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - data
```

---

## 3. Procedimiento de Respaldo Manual Inmediato

Para contingencias operativas o previas a mantenimientos de esquema, se desarrolló el script ejecutable `infra/scripts/backup-manual.sh`:

```bash
#!/usr/bin/env bash
set -e

BACKUP_CONTAINER="expojuy-backup-1"

echo ">>> Iniciando respaldo manual inmediato..."
docker compose -f infra/compose.yaml up -d backup
docker exec -t "$BACKUP_CONTAINER" /backup.sh
```

### 3.1 Evidencia de Respaldo Generado
Ejecutando el respaldo manual sobre la base de datos de 1,03 GB con 6M de visitas:

```
Creating dump of expojuy database from postgres...
Point last backup file to this last backup...
'/backups/last/expojuy-latest.sql.gz' -> 'expojuy-20261108-234014.sql.gz'
SQL backup created successfully
```

**Métricas del archivo generado en `./infra/backups/daily/expojuy-20261108.sql.gz`:**
- **Tamaño de la base en caliente (PostgreSQL):** 1.035 MB (1,01 GB)
- **Tamaño del archivo comprimido (`.sql.gz`):** **108 MB (113.287.101 bytes)**
- **Ratio de compresión alcanzado:** **~9,5x** (reducción del 89,5% en disco).

---

## 4. Prueba Automatizada de Restauración y Verificación de Integridad

Siguiendo el estándar de la industria, **un backup no verificado no es un backup**. Por esta razón, se desarrollaron los scripts de verificación de contingencia `infra/scripts/restore-test.sh` (Linux / Bash) y `infra/scripts/restore-test.ps1` (Windows / PowerShell).

### 4.1 Flujo Automatizado de la Prueba de Desastre
1. Localiza el último archivo `.sql.gz` en `./infra/backups/`.
2. Crea una base de datos limpia e independiente `expojuy_restore_test` en el contenedor `postgres`.
3. Descomprime y restaura el volcado completo vía streaming sin tocar la base operativa de producción.
4. Ejecuta un script SQL de validación exhaustiva de integridad referencial y conteo de filas.
5. Emite el reporte de éxito y destruye la base temporal de pruebas.

### 4.2 Evidencia de Ejecución Real del Test de Restauración

```
=====================================================================
   EXPOJUY 2026 - PRUEBA DE RECUPERACIÓN ANTE DESASTRES (RESTORE TEST)
=====================================================================
>>> Último archivo de backup detectado: infra/backups/daily/expojuy-20261108.sql.gz
>>> Tamaño comprimido del backup: 108 MB
>>> Creando base de datos limpia de pruebas: expojuy_restore_test...
CREATE DATABASE
>>> Descomprimiendo y restaurando volcado en expojuy_restore_test...
Restauración completada con código 0 en 53.54 segundos.

>>> Verificando integridad de los datos restaurados...
---------------------------------------------------------------------
   REPORTE DE INTEGRIDAD EN BASE RESTAURADA (expojuy_restore_test)
---------------------------------------------------------------------
          tabla          | registros 
-------------------------+-----------
 ejes                    |         6
 agenda                  |        21
 expositores             |        75
 stands                  |       160
 visitas_stands          |   6000000
 huerfanos_referenciales |         0
(6 rows)
---------------------------------------------------------------------
>>> RESULTADO: ¡PRUEBA DE RESTAURACIÓN EXITOSA AL 100%! <<<
>>> Eliminando base de datos temporal de pruebas...
DROP DATABASE
>>> Entorno de pruebas limpio.
```

---

## 5. Conclusión y Garantía de Continuidad

- **Integridad Verificada al 100%:** Los 6.000.000 de registros en `visitas_stands` y las entidades maestras (`stands`, `expositores`, `ejes`, `agenda`) fueron restaurados sin pérdida de información y con **cero huérfanos referenciales**.
- **Tiempo RTO Superado:** La restauración total tomó **53,54 segundos**, muy por debajo de los umbrales de tolerancia de la organización.
- **Aislamiento Seguro:** Todo el ciclo de prueba y respaldo se ejecuta en la red privada de Docker, garantizando que ninguna credencial ni dato ferial sea expuesto fuera de localhost.
