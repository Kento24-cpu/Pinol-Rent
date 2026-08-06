# Configuración del proyecto

## 1. Clonar e instalar

```bash
git clone <repo-url>
cd pinol-rent
npm install
```

## 2. Configurar Supabase

1. Crear proyecto gratis en [supabase.com](https://supabase.com)
2. Ir a Project Settings → API → copiar URL y anon key
3. Crear archivo `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-anon-key
```

4. Aplicar las migraciones en orden (`supabase/migrations/*.sql`). Con la CLI local:

```bash
supabase link --project-ref <tu-proyecto>
supabase db push
```

> Si migras desde el esquema viejo (migración 20240001000000_init.sql), aplica las
> siguientes en orden: `20240024000000_commissions.sql`, `20240024000001_admin_rpc_security.sql`,
> `20240024000002_lazy_expire.sql`, `20240024000003_admin_code_guc.sql`,
> `20240024000004_realtime_tables.sql`, `20240024000005_car_rpcs.sql`,
> `20240024000006_mark_read_reviews.sql`.

5. Configurar los settings del proyecto (Project Settings → Database → Configuration, o con `supabase config`) para que los GUCs declarados en `[db.settings]` de `supabase/config.toml` tengan los valores reales de producción:

```env
app.settings.admin_secret_code=<código secreto de admin>
app.settings.commission_rate=<0.05>
app.settings.service_fee_rate=<0.07>
app.settings.pending_expiry_minutes=<30>
```

> Sin estos valores, la app usa los defaults razonables (5% comisión, 7% fee, 30 min,
> código admin en `_settings`). **Siempre** cambia el código admin antes de publicar.

6. Desplegar las edge functions:

```bash
supabase functions deploy process-payment
supabase functions deploy notify-booking
supabase functions deploy notify-chat
```

> `process-payment` requiere JWT (`verify_jwt = true`) y un bucket `chat-attachments`
> + `car-images` en Storage con las políticas del doc de base de datos.

## 3. Ejecutar en desarrollo

```bash
# Web (navegador)
npm run web

# Android (requiere Expo Go)
npm run android

# iOS (requiere Expo Go en macOS)
npm run ios

# QR para celular (Expo Go)
npm start
```

## 4. Mantener servidor activo (opcional)

```bash
npm install -g pm2
pm2 start npm --name pinol-rent -- run web
pm2 logs pinol-rent    # Ver logs
pm2 stop pinol-rent    # Detener
```

## 5. Verificar conexión

```bash
# Prueba rápida de conexión a Supabase
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
supabase.from('profiles').select('count', { count: 'exact', head: true })
  .then(({ count }) => console.log('Conexión OK. Perfiles:', count))
"
```

## Solución de problemas

- **Error de compilación**: `npx expo start --clear` (limpia caché)
- **Module not found**: `npm install` o eliminar `node_modules` y reinstalar
- **Error de conexión Supabase**: verificar `.env` y que el proyecto esté activo
