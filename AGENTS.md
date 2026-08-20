# AGENTS.md

## Project overview
Piñol Rent — mobile car rental platform built with Expo 56 (React Native) and Supabase.

## Tech stack
- **Framework**: Expo 56, React Native 0.85, React 19
- **Navigation**: expo-router (file-based) + @react-navigation/drawer
- **Backend**: Supabase (auth, database, storage, realtime, push notifications)
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **UI**: React Native Paper

## Dev commands
- Install deps: `npm install`
- Start dev: `npm start`
- Lint: `npm run lint`
- Build web: `npm run build:web`

## Code conventions
- TypeScript strict
- Commit format: conventional commits (`feat:`, `fix:`, `chore:`)
- No AI agent attributions in commits (no `Co-Authored-By`, `🤖 Generated with`, or similar)
- Spanish UI text for end users
- English code, comments, and commit messages

## Project structure
- `app/` — expo-router screens organized by role: `(public)`, `(renter)`, `(owner)`, `(admin)`
- `src/components/` — reusable UI components
- `src/stores/` — Zustand stores
- `src/hooks/` — custom React hooks
- `src/lib/` — utilities, Supabase client, theme
- `src/types/` — TypeScript type definitions
- `supabase/` — Supabase migrations and functions

## User roles
- **public**: login, register
- **renter**: browse cars, book, manage reservations
- **owner**: publish/edit cars, manage bookings
- **admin**: manage all bookings and payments
