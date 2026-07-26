import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ut: {
          navy: '#002B49',
          'navy-dark': '#001D33',
          blue: '#005691',
          'blue-light': '#0077C8',
          gold: '#FFC700',
          'gold-dark': '#D99B00',
          amber: '#F59E0B',
          bg: '#F4F7FA',
          card: '#FFFFFF',
        },
        primary: '#005691',
        secondary: '#002B49',
        accent: '#FFC700',
        bg: '#F4F7FA',
      },
      borderRadius: {
        xl2: '20px',
      },
      boxShadow: {
        'ut-card': '0 4px 20px -2px rgba(0, 43, 73, 0.06), 0 2px 6px -1px rgba(0, 43, 73, 0.04)',
        'ut-glow': '0 0 25px rgba(255, 199, 0, 0.25)',
      },
      backgroundImage: {
        'ut-gradient': 'linear-gradient(135deg, #002B49 0%, #005691 100%)',
        'ut-gold-gradient': 'linear-gradient(135deg, #FFC700 0%, #E6B200 100%)',
      },
    },
  },
  plugins: [],
}
export default config
