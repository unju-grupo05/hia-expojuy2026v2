# ExpoJuy 2026 - Automatización de Procesos (n8n & Asistente RAG)
## Integrante 4: Puntos 13 & 14 de la Rúbrica de Cátedra

Este directorio almacena las exportaciones oficiales y versionadas de los workflows de **n8n** desarrollados para la plataforma ExpoJuy 2026.

---

## 1. Catálogo de Workflows Exportados (`workflows/`)

| Archivo | Flujo | Descripción Funcional |
| :--- | :--- | :--- |
| `01_flujo1_alertas_infraestructura.json` | **Flujo 1 (Principal)** | Recibe alertas de **Prometheus Alertmanager**, clasifica severidad, deriva incidencias estándar a **Mantis BT** y deriva fallos críticos de BD al Sub-Workflow RAG. |
| `02_flujo1_subworkflow_rag_cluster.json` | **Flujo 1 (Sub-Workflow)** | Agente de IA (**Google Gemini**) con herramienta RAG sobre `runbooks_infraestructura_expojuy`. Redacta el informe post-mortem, crea ticket urgente en Mantis, lo sube a **Nextcloud** (`/05-Seguridad-Auditorias-e-Incidencias/`) y alerta a **Telegram**. |
| `03_flujo1_indexacion_bdvectorial.json` | **Flujo 1 (Ingesta RAG)** | Descarga runbooks técnicos, aplica *Recursive Text Splitter*, vectoriza con *Gemini Embeddings* y almacena en tabla PostgreSQL PGVector. |
| `04_flujo2_verificacion_backups.json` | **Flujo 2 (DevOps)** | Disparo diario (Cron 03:00 AM) o Webhook manual. Inspecciona `/backups/last/`, valida tamaño y antigüedad, ejecuta prueba controlada de restauración de tablas clave y notifica éxito o abre ticket en Mantis. |
| `05_flujo3_asistente_telegram_pachai.json` | **Flujo 3 (Core RAG)** | Asistente virtual **PachAI** vía Telegram Bot: buffer anti-spam con Redis, transcripción de voz con Gemini, guardrails NSFW y PII, memoria de conversación en PostgreSQL y búsqueda semántica en la base de conocimiento ExpoJuy. |
| `06_flujo3_indexacion_bdvectorial.json` | **Flujo 3 (Ingesta RAG)** | Vectoriza las guías de navegación, mapa 3D, expositores y FAQs en la tabla `base_conocimiento_expojuy`. |

---

## 2. Política de Seguridad y Cero Secretos en Código (DevSecOps)

Siguiendo las directivas estrictas de la cátedra:
1. **Sin secretos en texto plano:** Los workflows no contienen contraseñas de bases de datos, tokens de bots ni API keys privadas.
2. **Inyección por Entorno:** Parámetros como el token de Mantis se resuelven dinámicamente mediante `{{ $env.MANTIS_API_TOKEN }}`, inyectado en el contenedor desde el archivo `infra/.env`.
3. **Cifrado en Reposo:** Las credenciales de servicios externos se almacenan cifradas con AES en la base de datos interna de n8n usando la variable `N8N_ENCRYPTION_KEY` definida en `infra/.env`.
4. **Protección de Red:** n8n opera exclusivamente en red interna de Docker (`app`, `data`, `tools`) y solo expone su puerto local a `127.0.0.1:5679` para evitar accesos indebidos desde el exterior.

---

## 3. Guía de Importación para Integrantes del Equipo y Evaluación

Para desplegar estos workflows en una instancia limpia de n8n:

1. **Iniciar los servicios base:**
   ```bash
   cd infra
   docker compose -f compose.yaml -f compose.cluster-ha.yaml -f compose.tools.yaml -f compose.monitoring.yaml -f compose.automation.yaml up -d
   ```
2. **Abrir n8n:**
   Navegar a `http://localhost:5679` y registrar o acceder con el usuario Administrador.
3. **Importar los Workflows:**
   * En el menú superior izquierdo, clic en **Workflows** -> **Add Workflow**.
   * Clic en los tres puntos (`...`) arriba a la derecha del lienzo -> **Import from File**.
   * Seleccionar el archivo JSON correspondiente desde la carpeta `infra/n8n-backups/workflows/`.
4. **Vincular Credenciales:**
   En cada nodo que lo requiera, seleccionar o dar de alta la credencial correspondiente:
   * **Postgres account:** Host `postgres` (o `db-loadbalancer`), puerto `5432`, base `expojuy`, usuario `expojuy_app`.
   * **Telegram account:** Token provisto por @BotFather.
   * **Google Gemini(PaLM) Api account:** API Key de Google AI Studio.
   * **NextCloud account:** Host `http://nextcloud`, usuario `Santiago`, clave `ExpoJuy2026!`.
   * **Redis account:** Host `redis`, puerto `6379`.
