/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          violet:  'hsl(220 100% 60%)',
          fuchsia: 'hsl(290 100% 65%)',
          cyan:    'hsl(190 100% 50%)',
        },
        surface: {
          0: '#09090f',
          1: '#111118',
          2: '#1a1a26',
          3: '#23232f',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out forwards',
        'slide-up':   'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(139, 92, 246, 0)' },
          '50%':       { boxShadow: '0 0 24px 4px rgba(139, 92, 246, 0.25)' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, hsl(220 100% 60%), hsl(290 100% 65%))',
        'gradient-card':  'linear-gradient(145deg, #111118, #1a1a26)',
      },
    },
  },
  plugins: [],
}
