/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aqua: {
          DEFAULT: '#22D3EE',
          hover: '#06B6D4',
          strong: '#0891B2',
          soft: 'rgba(34, 211, 238, 0.12)',
        },
        dark: {
          bg: '#070B14',
          surface: '#0C1320',
          card: '#111927',
          elevated: '#16202F',
          border: '#1E293B',
          hover: '#1A2436',
        },
        surface: {
          light: '#F1F5F9',
          white: '#FFFFFF',
          secondary: '#CBD5E1',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
        border: {
          subtle: '#334155',
        },
        gold: {
          DEFAULT: '#FBBF24',
          hover: '#F59E0B',
          soft: 'rgba(251, 191, 36, 0.12)',
        },
        success: {
          DEFAULT: '#10B981',
          hover: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
        },
        error: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
        },
        accent: {
          DEFAULT: '#8B5CF6',
          hover: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '1rem',
        btn: '0.625rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      spacing: {
        4.5: '1.125rem',
        13: '3.25rem',
        18: '4.5rem',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(34, 211, 238, 0.15)',
        'glow': '0 0 24px rgba(34, 211, 238, 0.2)',
        'glow-lg': '0 0 40px rgba(34, 211, 238, 0.25)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255, 255, 255, 0.04)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 24px rgba(34, 211, 238, 0.12)',
        'elevated': '0 4px 20px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'shimmer': 'shimmerMove 1.8s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(34, 211, 238, 0.2)' },
          '50%': { boxShadow: '0 0 28px rgba(34, 211, 238, 0.45)' },
        },
        shimmerMove: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #070B14 0%, #0C1320 50%, #111927 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(22, 32, 47, 0.6) 0%, rgba(17, 25, 39, 0.9) 100%)',
        'accent-gradient': 'linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)',
      },
    },
  },
  plugins: [],
};
