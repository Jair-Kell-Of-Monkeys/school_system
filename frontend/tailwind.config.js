/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        // Primary — deep institutional blue (replaces old sky blue)
        primary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        // Accent — vibrant teal
        accent: {
          50:  '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        // Gold — for highlights and awards
        gold: {
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgba(10,22,60,.06), 0 4px 16px 0 rgba(10,22,60,.06)',
        'card-hover': '0 4px 8px -2px rgba(10,22,60,.10), 0 12px 24px -4px rgba(10,22,60,.10)',
        'sidebar':    '4px 0 32px rgba(10,22,60,.18)',
        'glow':       '0 0 20px rgba(99,102,241,.35)',
      },
      backgroundImage: {
        'gradient-sidebar': 'linear-gradient(180deg, #0F1C4D 0%, #0A1234 100%)',
        'gradient-brand':   'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
        'gradient-page':    'linear-gradient(135deg, #F0F2FF 0%, #F5F7FF 50%, #F0F5FF 100%)',
        'gradient-page-dk': 'linear-gradient(135deg, #080D20 0%, #0A1028 50%, #060B1C 100%)',
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease-out both',
        'fade-in':    'fadeIn 0.3s ease-out both',
        'slide-in-l': 'slideInLeft 0.3s ease-out both',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(.34,1.56,.64,1)',
      },
    },
  },
  plugins: [],
}
