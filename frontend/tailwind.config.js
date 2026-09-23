/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        erp: {
          bg: '#F7F8FA',
          card: '#FFFFFF',
          border: '#D7DCE3',
          navy: '#172033',
          slate: '#172033',
          muted: '#64748B',
          action: '#A61F24',
          'action-hover': '#8E1B20',
        },
        brand: {
          50: '#FBEDEE',
          100: '#F6DADC',
          500: '#A61F24',
          600: '#A61F24',
          700: '#8E1B20',
          800: '#74171B',
          900: '#5B1216',
        }
      }
    },
  },
  plugins: [],
}
