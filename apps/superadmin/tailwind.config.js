/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Map dark slate to light beige tones
        slate: {
          950: '#F5F5DC', // Base Beige background (was very dark)
          900: '#EFEFCE', // Card Beige background
          800: '#D5D5B8', // Borders
          500: '#5A728F', // Muted text mapped to a soft blue-grey
          400: '#2A4365', // Primary text mapped to deep blue
          300: '#1E3A8A', // Headers mapped to navy blue
        },
        // Make sure whites become deep blue to invert the text
        white: '#0F172A',
      }
    },
  },
  plugins: [],
}