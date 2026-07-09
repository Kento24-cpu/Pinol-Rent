# Arquitectura del proyecto

## Estructura de carpetas

```
pinol-rent/
├── app/                    # Expo Router (file-based routing)
│   ├── _layout.tsx         # Root layout (tema global, providers)
│   ├── index.tsx           # Punto de entrada (redirect por sesión)
│   ├── (public)/           # Pantallas públicas (login, register)
│   ├── (owner)/            # Dashboard del propietario (Drawer)
│   │   ├── _layout.tsx
│   │   ├── index.tsx       # Mis autos publicados
│   │   ├── publish.tsx     # Publicar nuevo auto
│   │   ├── [id].tsx        # Detalle del auto (owner)
│   │   ├── edit/[id].tsx   # Editar auto
│   │   ├── profile.tsx     # Mi perfil
│   │   └── conversations/  # Chat
│   │       ├── index.tsx   # Lista de conversaciones
│   │       └── [id].tsx    # Chat individual
│   └── (renter)/           # Dashboard del arrendatario (Drawer)
│       ├── _layout.tsx
│       ├── index.tsx       # Búsqueda de autos
│       ├── [id].tsx        # Detalle del auto + contactar dueño
│       ├── profile.tsx     # Mi perfil
│       └── conversations/  # Chat
│           ├── index.tsx   # Lista de conversaciones
│           └── [id].tsx    # Chat individual
├── src/                    # Código fuente reusable
│   ├── components/         # Componentes UI reutilizables
│   │   ├── AppDrawerContent.tsx   # Drawer personalizado
│   │   ├── CarCard.tsx            # Card de auto
│   │   ├── ChatScreen.tsx         # Pantalla de chat compartida
│   │   ├── DepartmentPicker.tsx   # Selector de departamentos
│   │   ├── ProfileScreen.tsx      # Perfil (vista + edición)
│   │   └── TagSelector.tsx        # Selector de tags
│   ├── hooks/              # Custom hooks
│   │   ├── useAuth.ts            # Auth listener + profile fetch
│   │   ├── useCars.ts            # Búsqueda/filtro de autos
│   │   ├── useChat.ts            # Mensajes + Realtime
│   │   ├── useConversations.ts   # Lista de conversaciones
│   │   └── usePushNotifications.ts
│   ├── lib/                # Utilidades y configuraciones
│   │   ├── supabase.ts     # Cliente Supabase
│   │   ├── theme.ts        # Tema RN Paper (azul)
│   │   ├── upload.ts       # uriToBlob + mimeToExt
│   │   └── chat.ts         # findOrCreateConversation
│   ├── stores/             # Zustand
│   │   └── authStore.ts
│   └── types/              # Tipos DB
│       ├── database.ts     # Tipos generados de Supabase
│       └── database.types.ts  # Tipos manuales para joins
├── supabase/
│   ├── migrations/         # 6 migrations SQL
│   └── functions/
│       └── notify-chat/    # Edge Function para push notifications
├── docs/
├── assets/
└── package.json
```

## Flujo de navegación

```
App arranca → index.tsx
  ├── ¿Sesión activa? → NO  → /login
  └── ¿Sesión activa? → SÍ
        ├── role = owner → /(owner)
        └── role = renter → /(renter)

(public) login/register → redirect según role

(owner) → CRUD autos, ver/conversar con arrendatarios
(renter) → Buscar autos, contactar dueños (chat + llamada)

Chat:
  Renter: Detalle auto → "Enviar mensaje" → chat
  Owner: Drawer "Mensajes" → lista → chat
  Notificaciones push via Edge Function en INSERT a messages
```

## Base de datos

Ver [DATABASE.md](./DATABASE.md) para schema completo.

## Diseño visual

Ver [STYLE_GUIDE.md](./STYLE_GUIDE.md) para paleta de colores y tokens.
