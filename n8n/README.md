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

## Instalación en Ubuntu (WSL)

### 1. Backend
En `backend/.env` agrega una clave para n8n (la misma va en la credencial del paso 4):
```bash
echo "BOT_API_TOKEN=$(openssl rand -hex 24)" >> backend/.env
```
Opcional, para el botón "ábrelo aquí" del portal: `frontend/.env` con `VITE_BOT_TELEGRAM=usuario_del_bot` (sin @).

### 2. Ollama
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:3b        # ~2 GB; corre en CPU. Con más RAM/GPU: qwen2.5:7b o llama3.1:8b
```
Si cambias de modelo, cámbialo también en el nodo **Ollama** del flujo.

### 3. n8n
n8n 2.x pide **Node 24** (el backend corre con Node 22 o 24). Con nvm:
```bash
nvm install 24 && nvm use 24
npx n8n@2            # primera vez tarda; abre http://localhost:5678 y crea tu usuario
```
Telegram solo manda mensajes a una dirección **https pública**. En WSL la forma más simple es un túnel gratuito:
```bash
# terminal aparte
curl -L -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared && ./cloudflared tunnel --url http://localhost:5678
# copia la dirección https://….trycloudflare.com que imprime y arranca n8n con ella:
WEBHOOK_URL=https://xxxx.trycloudflare.com npx n8n@2
```
La dirección del túnel cambia cada vez que lo abres; al cambiarla, desactiva y vuelve a activar el flujo.

### 4. Importar el flujo
1. En n8n: **Create workflow → ⋯ → Import from file** y elige `n8n/bot-siae.json`.
2. Credenciales (n8n las pide al abrir los nodos):
   - **Bot Control Escolar** (Telegram API): el token de @BotFather, el mismo que `TELEGRAM_BOT_TOKEN`.
   - **API Control Escolar (X-Bot-Token)** (Header Auth): nombre `X-Bot-Token`, valor el `BOT_API_TOKEN` del paso 1.
3. **Activa** el flujo (interruptor arriba a la derecha). Al activarlo, n8n registra el webhook en Telegram.

### 5. Vincular y probar
1. En el portal entra como alumno (p. ej. `A260001` / `alumno123`), abre **Bot de Telegram** y genera el código.
2. En Telegram mándale al bot `/vincular 123456`.
3. Pregunta con tus palabras: "¿cómo voy en mis materias?", "quiero mi constancia de estudios".

## Notas
- El mismo bot sirve para las alertas de rezago que manda el backend: el backend solo *envía* mensajes y n8n
  *recibe*, así que no chocan. Lo que sí choca es otro programa leyendo el bot con `getUpdates` (polling):
  apágalo mientras el flujo esté activo.
- Si Ollama no contesta, el bot responde con la lista de lo que sabe hacer en lugar de quedarse callado.
- El código de vinculación vence en 10 minutos, sirve una vez y un chat solo admite 5 códigos equivocados por hora.
- Si la API o Ollama corren en otra máquina, cambia `localhost` en los nodos **Contexto**, **Ollama** y **Responder**.
