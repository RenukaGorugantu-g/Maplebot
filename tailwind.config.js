/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        maple: {
          50: '#e6fff5',
          100: '#b3ffe0',
          200: '#80ffcc',
          300: '#4dffb8',
          400: '#1affa3',
          500: '#00DC82', // Primary Brand Green
          600: '#00b368',
          700: '#008a50',
          800: '#006138',
          900: '#003820',
        },
        dark: {
          bg: '#050505',
          card: '#081426',
          surface: '#0B1728',
          elevated: '#101D2F',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(0, 220, 130, 0.3)',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(0, 220, 130, 0.15)',
        'glow-md': '0 0 25px rgba(0, 220, 130, 0.25)',
        'glow-lg': '0 0 35px rgba(0, 220, 130, 0.35)',
        'dark-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'card': '16px',
      }
    },
  },
  plugins: [],
}
