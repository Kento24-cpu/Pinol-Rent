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

4. Ir a SQL Editor en Supabase, pegar y ejecutar `supabase/migrations/20240001000000_init.sql`

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
