# Subir Control Escolar a internet (AWS: EC2 + RDS)

Al final tendrás la web en `http://IP-DE-TU-SERVIDOR` (y, si quieres, en `https://tu-nombre.duckdns.org`).

```
Navegador ──► EC2 (Ubuntu: nginx ──► app ASP.NET) ──► RDS (PostgreSQL)
```

Necesitas: una cuenta de AWS, tu proyecto en Windows y unos 40 minutos.
Usa la región **us-east-1 (N. Virginia)** para todo, así EC2 y RDS se ven entre sí.

---

## 1. Crear el servidor (EC2)

1. En la consola de AWS busca **EC2** → **Lanzar instancia**.
2. Nombre: `control-escolar`. Imagen: **Ubuntu Server 24.04 LTS**.
3. Tipo: **t3.micro** (o la que diga "Apta para la capa gratuita").
4. Par de claves: **Crear nuevo par** → nombre `llave-escolar`, tipo RSA, formato **.pem**. Se descarga `llave-escolar.pem` en tu carpeta Descargas; déjalo ahí y no lo compartas.
5. Configuración de red → **Editar** y marca: SSH desde **Mi IP**, **HTTP** desde internet y **HTTPS** desde internet.
6. **Lanzar instancia**. Cuando diga "En ejecución", copia su **Dirección IPv4 pública**.

## 2. Crear la base de datos (RDS)

1. Busca **RDS** → **Crear base de datos** → **Creación estándar** → **PostgreSQL** (versión 16 o 17).
2. Plantilla: **Capa gratuita** (o "Desarrollo y pruebas"). Clase: **db.t4g.micro** o **db.t3.micro**, 20 GB.
3. Identificador: `control-escolar-db`. Usuario maestro: `postgres`. Escribe una contraseña y **apúntala**.
4. Conectividad: elige **Conectarse a un recurso informático de EC2** y selecciona `control-escolar`. (Esto abre el puerto 5432 solo para tu servidor; la base no queda expuesta a internet.)
5. Configuración adicional → **Nombre de base de datos inicial**: `control_escolar`.
6. **Crear**. Tarda unos 10 minutos. Cuando diga "Disponible", copia el **Punto de enlace** (algo como `control-escolar-db.abc123.us-east-1.rds.amazonaws.com`).

## 3. Preparar los archivos en Windows

La carpeta `deploy` (la que trae esta guía) va dentro de tu proyecto, junto a `ControlEscolar.csproj`. Ya incluye los scripts de la base (`001`, `002` y `003`).

Abre **PowerShell** en esa carpeta del proyecto (donde está `ControlEscolar.csproj`):

```powershell
dotnet publish -c Release -o ..\publish
tar -czf ..\publish.tar.gz -C ..\publish .
```

La primera vez, quítale permisos a otros usuarios a la llave (si no, `ssh` la rechaza):

```powershell
icacls "$HOME\Downloads\llave-escolar.pem" /inheritance:r /grant:r "$($env:USERNAME):R"
```

Sube todo al servidor (cambia `IP` por la de tu EC2 y escribe `yes` si pregunta):

```powershell
scp -i "$HOME\Downloads\llave-escolar.pem" ..\publish.tar.gz deploy\* ubuntu@IP:~
```

## 4. Instalar en el servidor

Entra al servidor:

```powershell
ssh -i "$HOME\Downloads\llave-escolar.pem" ubuntu@IP
```

Ya dentro (la terminal dice `ubuntu@ip-...`):

```bash
bash instalar-en-ec2.sh
```

### Cargar la base de datos en RDS

Cambia `PUNTO-DE-ENLACE` por el de tu RDS; te pedirá la contraseña del paso 2 en cada comando:

```bash
export B="host=PUNTO-DE-ENLACE dbname=control_escolar user=postgres sslmode=require"
psql "$B" -f 001_schema.sql
psql "$B" -f 002_avance1.sql
psql "$B" -f 003_datos_realistas.sql
```

El último debe terminar con la tabla de totales (12 grupos, 171 alumnos…).

### Poner la conexión y el token

```bash
sudo nano /etc/controlescolar.env
```

Cambia `TU-BASE...` por el punto de enlace y `TU_CLAVE` por la contraseña de RDS. Si quieres avisos de Telegram, pega el token después de `Telegram__BotToken=`. Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

### Arrancar la app

```bash
bash publicar.sh publish.tar.gz
```

Debe decir `La app responde: HTTP 200`. Abre en tu navegador **http://IP** y entra como `director@escuela.mx` / `docente123`.

---

## 5. (Opcional) Dirección con nombre y candado https

1. Entra a <https://www.duckdns.org> con tu cuenta de Google, crea un nombre (ej. `escuelaberriozabal`) y pon la IP de tu EC2.
2. En el servidor:

```bash
sudo sed -i 's/server_name _;/server_name escuelaberriozabal.duckdns.org;/' /etc/nginx/sites-available/controlescolar
sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d escuelaberriozabal.duckdns.org
```

Acepta los términos y elige redirigir a https. Listo: `https://escuelaberriozabal.duckdns.org`.
Sin https las contraseñas viajan sin cifrar; para una demo está bien, para uso real hazlo.

## 6. Subir una versión nueva

En Windows repite los dos comandos de `dotnet publish` y `tar`, luego `scp -i "$HOME\Downloads\llave-escolar.pem" ..\publish.tar.gz ubuntu@IP:~`, y en el servidor:

```bash
bash publicar.sh publish.tar.gz
```

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El navegador no carga `http://IP` | El grupo de seguridad del EC2 debe permitir HTTP (paso 1.5). |
| `publicar.sh` no dice HTTP 200 | `sudo journalctl -u controlescolar -n 50` muestra el error. |
| "Error de conexión con la base de datos" en `/Conexion` | Punto de enlace o contraseña en `/etc/controlescolar.env`; luego `sudo systemctl restart controlescolar`. |
| `psql` se queda esperando | RDS no se conectó al EC2 en el paso 2.4: RDS → tu base → Acciones → "Configurar conexión de EC2". |
| La IP cambió | Pasa si detienes el EC2. Para fijarla: EC2 → IP elásticas → Asignar → Asociar a tu instancia. |

## Cuidado con el costo

Las cuentas nuevas tienen capa gratuita o créditos, pero **RDS y EC2 cobran por hora si se acaban**. Después de presentar: EC2 → Detener instancia y RDS → Detener temporalmente (o eliminar ambos si ya no los usas). Revisa **Facturación** en la consola de AWS.
