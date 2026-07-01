# Guía de estilo

## Paleta de colores

| Token | Color | Hex | Uso |
|-------|-------|-----|-----|
| Primary | Azul intenso | `#1565C0` | Botones, encabezados, links |
| Primary Light | Azul claro | `#1E88E5` | Hover, active states |
| Primary BG | Azul fondo | `#E3F2FD` | Fondos suaves, contenedores |
| Accent | Cian | `#00ACC1` | Detalles, badges |
| Neutral 900 | Casi negro | `#0D1B2A` | Texto principal |
| Neutral 600 | Gris medio | `#546E7A` | Texto secundario |
| Neutral 200 | Gris claro | `#CFD8DC` | Bordes, separadores |
| Neutral 50 | Gris fondo | `#F5F7FA` | Fondo de pantalla |
| Success | Verde | `#2E7D32` | Estados exitosos |
| Error | Rojo | `#C62828` | Errores, alertas |

## Tipografía

- **Font**: System (React Native default)
- **Headings**: `variant="headlineLarge"`, `headlineMedium`, `headlineSmall`
- **Body**: `variant="bodyLarge"`, `bodyMedium`, `bodySmall`
- **Bold**: `fontWeight: 'bold'` o `<Text fontWeight="bold">`

## Componentes

Usar React Native Paper como librería base:
- `Button` → `mode="contained"` para primario, `mode="text"` para secundario
- `TextInput` → `mode="outlined"` para inputs
- `Surface` → Con `elevation={2}` para tarjetas
- `Searchbar` → Para búsquedas
- `SegmentedButtons` → Para selección de opciones

## Layout

- Padding general: 16px
- Esquinas redondeadas: `borderRadius: 12` (componentes), `borderRadius: 20` (tarjetas)
- Tarjetas: Surface con padding 24-32, fondo blanco, elevation 2
- Espaciado entre inputs: `marginBottom: 14`
