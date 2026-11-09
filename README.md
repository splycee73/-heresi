# Heresi Bot

Bot aesthetic con **Components V2**: bienvenidas, despedidas, niveles, autoroles, roles por boost, `/embed` (constructor), `/autorol` (panel de botones), antinuke, antiraid, estado rotativo y voz 24/7.

## 1) Discord Developer Portal
1. Crea la aplicación → **Bot** → copia el **TOKEN**.
2. Activa **Server Members Intent** (Privileged Gateway Intents). *Message Content no es necesario.*
3. Invita al bot con permiso **Administrador** (o al menos: gestionar roles/canales, expulsar, banear, ver registro de auditoría, conectar a voz).
4. **Importante:** el rol del bot debe estar **arriba** de los roles que dará/quitará y de los que quieras proteger.

## 2) Base de datos (gratis)
Crea un cluster en MongoDB Atlas → *Connect* → copia la `MONGO_URI`. En *Network Access* permite `0.0.0.0/0`.

## 3) GitHub
```bash
git init && git add . && git commit -m "bot"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/heresi-bot.git
git push -u origin main
```

## 4) Render
1. *New → Web Service* → conecta el repo (detecta `render.yaml`).
2. Variables: `TOKEN`, `MONGO_URI`, `OWNER_ID`, `VOICE_CHANNEL_ID` (opcional `GUILD_ID`).
3. Para que el plan gratis no se duerma, crea un monitor en **UptimeRobot** (HTTP, cada 5 min) a la URL de tu servicio.

## Comandos
| Comando | Qué hace |
|---|---|
| `/embed [canal] [plantilla]` | Constructor V2: texto, secciones con miniatura, imágenes/banners, separadores (con o sin línea), botones link, color, mover/editar bloques. Envía o **guarda como diseño** de bienvenida/despedida/boost/nivel |
| `/autorol rol1..rol8` | Envía panel con botones para auto-asignarse roles |
| `/config bienvenida|despedida|niveles|boost|autoroles` | Canales, estados, XP, premios por nivel, **rol por 1 boost / 2 boosts...**, autoroles al entrar (humanos/bots) |
| `/seguridad antinuke|antiraid` | Límites, castigo, whitelist, logs, restaurar, edad mínima, bloqueo |
| `/rank` · `/top` | Nivel y ranking |

### Variables para los textos
`{user}` `{user.name}` `{user.tag}` `{user.id}` `{user.avatar}` `{server}` `{server.icon}` `{memberCount}` `{serverBoosts}` y según el sistema `{level}` `{boosts}`.

### Notas
- **Boosts:** se cuentan con los mensajes de sistema de Discord (activa "Enviar un mensaje cuando alguien impulse" en Ajustes → Resumen). Si ya tenías boosters, usa `/config boost sincronizar`.
- **Estado:** rota entre `sal deidad`, `./heresi On Top` y `Observando a N miembros`. Edítalo en `src/config.js`.
- **Voz:** entra al canal `VOICE_CHANNEL_ID` y se reconecta solo.
- **Antinuke:** vigila borrar/crear canales y roles, baneos, expulsiones, webhooks y bots añadidos; restaura lo borrado y sanciona al superar el límite.
