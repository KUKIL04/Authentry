/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gamboge: {
          50: 'var(--theme-50)', 100: 'var(--theme-100)', 200: 'var(--theme-200)', 300: 'var(--theme-300)', 400: 'var(--theme-400)', 
          500: 'var(--theme-500)', 600: 'var(--theme-600)', 700: 'var(--theme-700)', 800: 'var(--theme-800)', 900: 'var(--theme-900)',
        },
        lightgray: '#E6E9EF',
        slate: {
          850: '#151e2e',
          900: '#0f172a',
        },
        brand: {
          ochre: '#C7923E',
          gold: '#D4AF37',
          light: '#F3E5AB'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}