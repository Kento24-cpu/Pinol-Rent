# Arquitectura del proyecto

## Estructura de carpetas

```
pinol-rent/
├── app/                    # Expo Router (file-based routing)
│   ├── _layout.tsx         # Root layout (tema global, providers)
│   ├── index.tsx           # Punto de entrada (redirect por sesión)
│   ├── (public)/           # Pantallas públicas (login, register)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (owner)/            # Dashboard del propietario
│   │   ├── _layout.tsx     # Tabs layout
│   │   └── index.tsx       # Lista de autos publicados
│   └── (renter)/           # Dashboard del arrendatario
│       ├── _layout.tsx     # Tabs layout
│       └── index.tsx       # Búsqueda de autos
├── src/                    # Código fuente reusable
│   ├── components/         # Componentes UI reutilizables
│   ├── hooks/              # Custom hooks (useAuth, etc.)
│   ├── lib/                # Utilidades y configuraciones
│   │   ├── supabase.ts     # Cliente Supabase
│   │   └── theme.ts        # Tema de React Native Paper (paleta azul)
│   ├── stores/             # Zustand stores
│   └── types/              # Tipos compartidos y DB types
├── supabase/               # Backend
│   └── migrations/         # Schema SQL de la base de datos
│   └── functions/          # Edge functions
├── docs/                   # Documentación del proyecto
├── assets/                 # Imágenes, íconos, fuentes
├── global.css              # Estilos globales Tailwind
├── tailwind.config.js      # Configuración de Tailwind
├── metro.config.js         # Configuración de Metro (NativeWind)
└── babel.config.js         # Configuración de Babel (NativeWind)
```

## Flujo de navegación

```
App arranca → index.tsx
  ├── ¿Sesión activa? → NO  → /login
  └── ¿Sesión activa? → SÍ
        ├── role = owner → /(owner)
        └── role = renter → /(renter)

(public) login/register
  └── Login exitoso → redirect según role

(owner) → CRUD autos, ver reservas
(renter) → Buscar autos, reservar
```

## Base de datos

Ver [DATABASE.md](./DATABASE.md) para schema completo.

## Diseño visual

Ver [STYLE_GUIDE.md](./STYLE_GUIDE.md) para paleta de colores y tokens.
