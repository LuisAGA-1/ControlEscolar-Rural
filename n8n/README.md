# Bot de Telegram con n8n + Ollama

El bot es otro adaptador de entrada del backend: n8n recibe el mensaje, Ollama decide **qué** pide la persona
y la API hace lo demás con los mismos casos de uso y permisos que el portal. La IA nunca toca la base.

```
Telegram ──► n8n: Telegram Trigger
               │
               ├─► POST /api/bot/contexto  ¿quién es este chat? (/vincular, /start y chats sin vincular se contestan aquí)
               │        listo: true ───────────────────────────────────────────────► Enviar texto
               │        listo: false + instrucciones para su rol
               ├─► Ollama /api/chat  →  {"intencion": "constancia", "parametros": {"tipo": "estudios"}}
               ├─► POST /api/bot/responder  corre el caso de uso y arma la respuesta
               │        con archivo ─► PDF (base64 → archivo) ─► Enviar PDF
               └──────  sin archivo ───────────────────────────────────────────────► Enviar texto
```

| Rol | Le puede pedir |
|---|---|
| Alumno | calificaciones del periodo, kárdex, constancia de estudios o de calificaciones (llega el PDF), horario de hoy o de un día |
| Docente | horario, alertas de sus grupos, reporte de sus materias |
| Administrador | reporte de la facultad, alertas, calificaciones de un alumno por matrícula, constancias de un alumno |

## Instalación
n8n, Ollama (con el modelo) y el túnel https que necesita Telegram ya vienen en el `docker-compose.yml` de la raíz:
sigue [INSTALACION.md](../INSTALACION.md). Aquí quedan los pasos propios del flujo.

### 1. Importar el flujo
1. En n8n (http://localhost:5678): **Create workflow → ⋯ → Import from file** y elige `n8n/bot-siae.json`.
2. Credenciales (n8n las pide al abrir los nodos):
   - **Bot Control Escolar** (Telegram API): el token de @BotFather, el mismo que `TELEGRAM_BOT_TOKEN`.
   - **API Control Escolar (X-Bot-Token)** (Header Auth): nombre `X-Bot-Token`, valor el `BOT_API_TOKEN` de tu `.env`.
3. **Activa** el flujo (interruptor arriba a la derecha). Al activarlo, n8n registra el webhook en Telegram.

### 2. Vincular y probar
1. En el portal entra como alumno (p. ej. `A260001` / `alumno123`), abre **Bot de Telegram** y genera el código.
2. En Telegram mándale al bot `/vincular 123456`.
3. Pregunta con tus palabras: "¿cómo voy en mis materias?", "quiero mi constancia de estudios".

## Notas
- El mismo bot sirve para las alertas de rezago que manda el backend: el backend solo *envía* mensajes y n8n
  *recibe*, así que no chocan. Lo que sí choca es otro programa leyendo el bot con `getUpdates` (polling):
  apágalo mientras el flujo esté activo.
- Si Ollama no contesta, el bot responde con la lista de lo que sabe hacer en lugar de quedarse callado.
- El código de vinculación vence en 10 minutos, sirve una vez y un chat solo admite 5 códigos equivocados por hora.
- Los nodos **Contexto** y **Responder** llaman a `http://api:3000` y **Ollama** a `http://ollama:11434`: son los nombres
  de los servicios del compose. Si corres n8n fuera de Docker (`npx n8n@2`, pide Node 24), cámbialos por `localhost`.
- Si cambias de modelo (`OLLAMA_MODELO` en `.env`), cámbialo también en el nodo **Ollama**.
