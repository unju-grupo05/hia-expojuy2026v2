# Publicar las herramientas en la tailnet (Tailscale Serve)

Las herramientas administrativas se publican **solo dentro de la tailnet**, con HTTPS. La
aplicación web sigue pública por Funnel en el puerto 443. Contexto completo y razones:
[`PUBLICACION_ACCESO.md`](PUBLICACION_ACCESO.md).

| Herramienta | Puerto en el contenedor | Puerto en la PC | Comando Serve | URL en la tailnet |
|---|---|---|---|---|
| Mantis | 80 | **8082** | `--https=8082 http://127.0.0.1:8082` | `https://<maquina>.<tailnet>.ts.net:8082` |
| Nextcloud | 80 | **8083** | `--https=8083 http://127.0.0.1:8083` | `https://<maquina>.<tailnet>.ts.net:8083` |
| Grafana | 3000 | **3001** | `--https=3001 http://127.0.0.1:3001` | `https://<maquina>.<tailnet>.ts.net:3001` |
| Prometheus | 9090 | **9090** | `--https=9090 http://127.0.0.1:9090` | `https://<maquina>.<tailnet>.ts.net:9090` |
| pgAdmin | 80 | **5050** | `--https=5050 http://127.0.0.1:5050` | `https://<maquina>.<tailnet>.ts.net:5050` |
| HAProxy stats | 8404 | **8404** | `--https=8404 http://127.0.0.1:8404` | `https://<maquina>.<tailnet>.ts.net:8404/stats` |
| n8n (editor) | 5678 | **5679** | `--https=5679 http://127.0.0.1:5679` | `https://<maquina>.<tailnet>.ts.net:5679` |

Excepción: los **webhooks de n8n** (`/webhook`) van por **Funnel** en el puerto 8443, porque
Telegram tiene que llegar desde Internet con https. Ver [n8n: webhooks públicos](#n8n-webhooks-públicos-funnel).

> **Siempre el puerto de la PC, no el del contenedor.** Tailscale corre en Windows, fuera de
> Docker: solo ve lo que Docker publica en `127.0.0.1` (el número de la izquierda en
> `"127.0.0.1:3001:3000"`). Por convención, el puerto HTTPS de la tailnet es el mismo número.

> **Nunca usar el puerto 443 para las herramientas:** Funnel se habilita por puerto y todo lo que
> esté en el 443 queda público.

## Orden recomendado

1. **Grafana** (no necesita ajustes): publicar y verificar desde dentro y fuera de la tailnet.
2. **Prometheus, pgAdmin y HAProxy** (tampoco necesitan ajustes).
3. **Mantis y Nextcloud**: publicar y después hacer sus ajustes (ver más abajo).
4. Compartir la máquina con el equipo y la cátedra.

## Forma 1: manual

Un comando por herramienta (en PowerShell):

```powershell
tailscale serve --bg --https=3001 http://127.0.0.1:3001   # publicar (ejemplo: Grafana)
tailscale serve --https=3001 off                          # dejar de publicar
tailscale serve status                                    # ver qué está publicado
```

- `--https=3001`: puerto por el que se entra desde la tailnet, con HTTPS.
- `http://127.0.0.1:3001`: adónde se reenvía (la herramienta local).
- `--bg`: queda en segundo plano y guardado; sobrevive a reinicios.

Repetir con cada puerto de la tabla. En `tailscale serve status`, solo el 443 tiene que decir
`Funnel on`.

## Forma 2: script

`infra/scripts/tailscale-publicar.ps1` hace lo mismo para todas o para algunas herramientas y al
final **verifica que ningún puerto administrativo tenga Funnel**.

```powershell
# Ver el estado (no cambia nada)
powershell -ExecutionPolicy Bypass -File infra/scripts/tailscale-publicar.ps1

# Publicar todas
powershell -ExecutionPolicy Bypass -File infra/scripts/tailscale-publicar.ps1 -Accion publicar

# Publicar o quitar una sola
powershell -ExecutionPolicy Bypass -File infra/scripts/tailscale-publicar.ps1 -Accion publicar -Servicio grafana
powershell -ExecutionPolicy Bypass -File infra/scripts/tailscale-publicar.ps1 -Accion quitar -Servicio pgadmin
```

Servicios válidos: `mantis`, `nextcloud`, `grafana`, `prometheus`, `pgadmin`, `haproxy`, `n8n`
(el script publica solo el editor de n8n; el webhook se publica a mano, ver abajo).
Código de salida: 0 OK, 1 error.

## Ajustes de las aplicaciones

Algunas herramientas guardan su dirección y hay que avisarles la nueva:

| Herramienta | Problema sin el ajuste | Ajuste |
|---|---|---|
| Nextcloud | Error 400: no reconoce el dominio | Agregarlo a `trusted_domains` |
| Nextcloud | Redirige a `http://` y por la tailnet solo hay HTTPS | Confiar en el gateway de Docker como proxy (`trusted_proxies`): así usa el `X-Forwarded-Proto: https` que envía Tailscale, y el acceso local sigue en `http` |
| Mantis | Redirige a `http://127.0.0.1:8082`, que no existe en otro dispositivo | Cambiar `$g_path` en `config/config_inc.php` a la URL de la tailnet |
| n8n | Enlaces y webhooks con `localhost` | `N8N_EDITOR_BASE_URL` y `N8N_WEBHOOK_URL` en `infra/.env` (ver abajo) |
| Grafana, Prometheus, pgAdmin, HAProxy | — | Sin ajustes |

Comandos (reemplazar `<maquina>.<tailnet>` por el nombre real):

```powershell
# Nextcloud: dominio confiable (índice 3, el siguiente libre; ver con occ config:system:get trusted_domains)
docker exec -u www-data expojuy-nextcloud php occ config:system:set trusted_domains 3 --value=<maquina>.<tailnet>.ts.net

# Nextcloud: proxy confiable = gateway de Docker (es la IP que aparece en docker logs expojuy-nextcloud)
docker exec -u www-data expojuy-nextcloud php occ config:system:set trusted_proxies 0 --value=172.18.0.1

# Mantis: URL base (hace copia de seguridad antes)
docker exec expojuy-mantis cp /var/www/html/config/config_inc.php /var/www/html/config/config_inc.php.bak
docker exec expojuy-mantis sed -i "s#^\`$g_path .*#\`$g_path = 'https://<maquina>.<tailnet>.ts.net:8082/';#" /var/www/html/config/config_inc.php
```

- Los ajustes quedan en los volúmenes de cada herramienta: se pierden con `down -v` y hay que repetirlos.
- `172.18.0.1` es el gateway de la red de Docker: si se recrean las redes puede cambiar. Verificarlo en `docker logs`.
- Con el ajuste, Mantis arma sus enlaces con la URL de la tailnet también cuando se entra por `127.0.0.1` (funciona porque la notebook está en la tailnet).

## n8n: webhooks públicos (Funnel)

El editor de n8n es administrativo (credenciales, flujos): va por **Serve**, como el resto. Los
webhooks son la excepción: el disparador de Telegram solo acepta una URL **https pública**, y
Telegram no está en la tailnet. Se publica por Funnel **solo la ruta `/webhook`**, en el puerto
8443 (Funnel admite 443, 8443 y 10000; el 443 es de la aplicación web):

```powershell
# Editor: solo tailnet (o con el script: -Accion publicar -Servicio n8n)
tailscale serve --bg --https=5679 http://127.0.0.1:5679

# Webhooks: públicos, solo esas rutas
tailscale funnel --bg --https=8443 --set-path=/webhook http://127.0.0.1:5679/webhook
tailscale funnel --bg --https=8443 --set-path=/webhook-test http://127.0.0.1:5679/webhook-test   # pruebas desde el editor
tailscale funnel status

# Quitar
tailscale funnel --https=8443 --set-path=/webhook off
tailscale funnel --https=8443 --set-path=/webhook-test off
```

En `infra/.env` (y recrear n8n con `up -d`, todos los `-f`):

```
N8N_EDITOR_BASE_URL=https://<maquina>.<tailnet>.ts.net:5679/
N8N_WEBHOOK_URL=https://<maquina>.<tailnet>.ts.net:8443/
```

- Por el 8443 solo responde `/webhook*`: cualquier otra ruta (el editor, `/rest`) da 404.
- El webhook de Alertmanager no necesita Funnel: va de contenedor a contenedor
  (`http://expojuy-n8n:5678/webhook/alertmanager`).
- La primera persona que abre el editor crea la cuenta **Owner**: crearla antes de compartir.

## Dar acceso al equipo y a la cátedra

Consola de Tailscale: https://login.tailscale.com/admin (con la cuenta de la notebook).

| Para qué | Dónde |
|---|---|
| Ver dispositivos y su estado | **Machines** |
| Ver qué está publicado | En la notebook: `tailscale serve status` y `tailscale funnel status` |
| **Compartir la notebook** (recomendado) | **Machines** → la máquina → menú **⋯** → **Share…** → enviar el enlace |
| Agregar miembros a la tailnet | **Users** → **Invite users** |

**Share** da acceso solo a esta máquina: cada persona usa su propia cuenta de Tailscale y no ve
el resto de los dispositivos. **Invite** suma miembros a la tailnet y el plan gratuito limita la
cantidad de usuarios (revisar el límite en la consola).

Cada compañero:
1. Instala Tailscale y crea su cuenta.
2. Abre el enlace de *Share* y lo acepta.
3. Entra a `https://<maquina>.<tailnet>.ts.net:<puerto>`.

## Verificación

1. Desde otro dispositivo **conectado** a la tailnet: la URL abre el login de la herramienta.
2. Desde un dispositivo **fuera** de la tailnet (celular con datos y Tailscale desconectado): la
   URL **no** abre.
3. `tailscale serve status`: `Funnel on` solo en el 443 (web) y en el 8443 (rutas `/webhook*`).

## Estado

| Ítem | Estado |
|---|---|
| Serve de las 6 herramientas (forma manual) | Verificado 15/11/2026: todas "tailnet only"; solo el 443 con Funnel |
| Script, modo `estado` y control de Funnel | Verificado 15/11/2026 |
| Script, modo `publicar` | Verificado 16/11/2026 (n8n) |
| Script, modo `quitar` | Pendiente de probar |
| Ajustes de Nextcloud y Mantis | Verificado 15/11/2026: por la tailnet redirigen a su login en https; en local siguen funcionando |
| Acceso desde otro dispositivo de la tailnet y rechazo desde fuera | Pendiente |
| n8n: editor por Serve (5679) y webhooks por Funnel (8443) | Verificado 16/11/2026 desde la notebook: editor "tailnet only"; en el 8443 solo `/webhook*` llega a n8n y el resto da 404. Falta probar desde fuera de la tailnet |
