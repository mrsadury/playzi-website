/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aqua: {
          DEFAULT: '#78F6E1',
          hover: '#55E8D2',
          strong: '#18CDBB',
        },
        dark: {
          bg: '#000000',
          surface: '#0A0A0A',
          card: '#141414',
          border: '#1F1F1F',
          hover: '#1A1A1A',
        },
        surface: {
          light: '#F4FFFC',
          white: '#FFFFFF',
          secondary: '#E8F5F2',
        },
        ink: {
          DEFAULT: '#10171A',
          muted: '#617477',
        },
        border: {
          subtle: '#D5ECE8',
        },
        gold: {
          DEFAULT: '#F6C945',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '1rem',
        btn: '0.625rem',
      },
      spacing: {
        4.5: '1.125rem',
        13: '3.25rem',
        18: '4.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(120, 246, 225, 0.3)' },
          '50%': { boxShadow: '0 0 16px rgba(120, 246, 225, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
