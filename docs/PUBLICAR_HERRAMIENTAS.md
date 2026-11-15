# Publicar las herramientas en la tailnet (Tailscale Serve)

Las herramientas administrativas se publican **solo dentro de la tailnet**, con HTTPS. La
aplicación web sigue pública por Funnel en el puerto 443. Contexto completo y razones:
[`PUBLICACION_ACCESO.md`](PUBLICACION_ACCESO.md).

| Herramienta | Puerto local | URL en la tailnet |
|---|---|---|
| Mantis | 8082 | `https://<maquina>.<tailnet>.ts.net:8082` |
| Nextcloud | 8083 | `https://<maquina>.<tailnet>.ts.net:8083` |
| Grafana | 3001 | `https://<maquina>.<tailnet>.ts.net:3001` |
| Prometheus | 9090 | `https://<maquina>.<tailnet>.ts.net:9090` |
| pgAdmin | 5050 | `https://<maquina>.<tailnet>.ts.net:5050` |
| HAProxy stats | 8404 | `https://<maquina>.<tailnet>.ts.net:8404/stats` |

> **Nunca usar el puerto 443 para las herramientas:** Funnel se habilita por puerto y todo lo que
> esté en el 443 queda público.

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

Servicios válidos: `mantis`, `nextcloud`, `grafana`, `prometheus`, `pgadmin`, `haproxy`.
Código de salida: 0 OK, 1 error.

## Ajustes de las aplicaciones

Algunas herramientas guardan su dirección y hay que avisarles la nueva:

| Herramienta | Ajuste |
|---|---|
| Nextcloud | Agregar `<maquina>.<tailnet>.ts.net` a `trusted_domains` (`occ config:system:set trusted_domains <n> --value=...`) |
| Mantis | `$g_path` en `config/config_inc.php` está fijo en `http://127.0.0.1:8082/`: cambiarlo a la URL de la tailnet |
| Grafana, Prometheus, pgAdmin, HAProxy | Sin ajustes |

## Verificación

1. Desde otro dispositivo **conectado** a la tailnet: la URL abre el login de la herramienta.
2. Desde un dispositivo **fuera** de la tailnet (celular con datos y Tailscale desconectado): la
   URL **no** abre.
3. `tailscale serve status`: solo el 443 con `Funnel on`.

## Estado

| Ítem | Estado |
|---|---|
| Comandos y script | Escritos; pendiente de probar |
| Ajustes de Nextcloud y Mantis | Pendiente |
| Verificación desde dentro y fuera de la tailnet | Pendiente |
