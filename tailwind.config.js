/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'terminal': {
          black: '#080C10',
          dark: '#0D1117',
          card: '#161B22',
          border: '#1E2A38',
          muted: '#21262D',
        },
        'signal': {
          green: '#00FF88',
          red: '#FF3B5C',
          amber: '#FFB800',
          blue: '#4D9EFF',
          cyan: '#00D4FF',
          purple: '#A855F7',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-green': 'pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 3s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(0, 255, 136, 0.4)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 0 8px rgba(0, 255, 136, 0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
