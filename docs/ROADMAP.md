# Roadmap

## MVP (actual)
- [x] Autenticación (registro/login con email)
- [x] Roles de usuario (owner/renter)
- [x] Navegación con tabs
- [x] Tema visual azul
- [x] Tailwind CSS / NativeWind

## Fase 1 — Funcionalidades core
- [x] CRUD de autos (owner publica, edita, elimina)
- [x] Subir fotos a Supabase Storage
- [x] Búsqueda y filtros de autos (marca, precio, ubicación)
- [x] Vista detalle del auto
- [x] Sistema de reservas con selección de fechas
- [x] Comisiones server-side (trigger) con desglose persistido en bookings

## Fase 2 — Experiencia de usuario
- [x] Perfil de usuario editable
- [x] Historial de reservas (owner y renter)
- [x] Notificaciones (confirmación, recordatorio)
- [x] Calificaciones y reseñas
- [x] Chat entre owner y renter (con adjuntos)

## Fase 3 — Producción
- [x] Pagos (procesados manualmente por admin vía dashboard)
- [x] Revisión de pagos admin (aprobación/rechazo con RPCs seguras)
- [x] Expiración de pagos pendientes (lazy + batch)
- [x] Push notifications (tokens, canales Android, prefs por usuario)
- [x] Realtime (conversaciones y notificaciones)
- [x] Seguridad RPC (verificación JWT, ownership checks, GUC admin code)
- [ ] Modo offline
- [ ] EAS Build para Android APK / iOS IPA
- [ ] Deploy web a VPS con Nginx + PM2 + SSL
- [ ] Publicación en Google Play y App Store
