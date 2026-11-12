/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        telc: {
          blue: '#003a70',
          'blue-light': '#1a5a9a',
          red: '#c8102e',
          gray: '#f2f4f7',
          dark: '#1f2937',
          muted: '#6b7280',
          card: '#ffffff',
        },
        bg: {
          dark: '#0b1220',
          'dark-2': '#0f1a2e',
        },
        glass: {
          surface: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.10)',
          border: 'rgba(255,255,255,0.14)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '24px',
        '3xl': '36px',
        full: '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
