# Pinol Rent

Plataforma de renta de automóviles peer-to-peer para Nicaragua. Conecta propietarios de vehículos con personas que necesitan rentar un auto.

## Funcionalidades

### Para propietarios (owners)
- Publicar autos con fotos, precio, ubicación
- Gestionar disponibilidad (fechas ocupadas/libres)
- Ver y gestionar reservas entrantes
- Aceptar/rechazar solicitudes de renta

### Para arrendatarios (renters)
- Buscar autos por marca, modelo, ubicación
- Filtrar por precio y disponibilidad
- Reservar autos por fechas específicas
- Ver historial de reservas

### General
- Autenticación con email y contraseña
- Roles de usuario (owner / renter)
- Perfiles con información básica
- Diseño responsive (Android, iOS, Web)

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Expo SDK 56 (React Native 0.85) |
| Routing | Expo Router (file-based) |
| Estilos | NativeWind v4 (Tailwind CSS) + React Native Paper |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Lenguaje | TypeScript |
| Estado | Zustand |
| Formularios | React Hook Form + Zod |

## Requisitos

- Node.js >= 22.13
- npm >= 11
- Expo CLI (incluido en el proyecto)
- Cuenta gratuita en Supabase
