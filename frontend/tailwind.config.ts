import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        chalk: ['Caveat', 'cursive'],
        notebook: ['Patrick Hand', 'cursive'],
      },
      colors: {
        // Theme: Tablica
        chalk: {
          bg: '#1a4a2e',
          bgLight: '#235c38',
          text: '#f0f0f0',
          accent: '#ffd700',
          line: 'rgba(255,255,255,0.25)',
          error: '#ff6b6b',
          success: '#69db7c',
        },
        // Theme: Zeszyt
        notebook: {
          bg: '#fdf6e3',
          bgDark: '#f0e9d2',
          text: '#1a237e',
          accent: '#c62828',
          line: '#b3c5e8',
          error: '#c62828',
          success: '#2e7d32',
        },
      },
      backgroundImage: {
        'notebook-grid': `
          repeating-linear-gradient(
            #b3c5e8 0px, #b3c5e8 1px, transparent 1px, transparent 100%
          ),
          repeating-linear-gradient(
            90deg, #b3c5e8 0px, #b3c5e8 1px, transparent 1px, transparent 100%
          )
        `,
      },
      backgroundSize: {
        'grid-32': '32px 32px',
      },
      animation: {
        'chalk-write': 'chalkWrite 0.3s ease-in',
        'star-pop': 'starPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'shake': 'shake 0.4s ease-in-out',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        chalkWrite: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        starPop: {
          '0%': { transform: 'scale(0) rotate(0deg)' },
          '100%': { transform: 'scale(1) rotate(15deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
