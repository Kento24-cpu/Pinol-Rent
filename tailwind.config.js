/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1565C0',
          light: '#1E88E5',
          bg: '#E3F2FD',
        },
        accent: '#00ACC1',
        neutral: {
          900: '#0D1B2A',
          600: '#546E7A',
          200: '#CFD8DC',
          50: '#F5F7FA',
        },
        success: '#2E7D32',
        error: '#C62828',
      },
    },
  },
  plugins: [],
}
