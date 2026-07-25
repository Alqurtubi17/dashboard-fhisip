import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#3B82F6',
        accent: '#F59E0B',
        bg: '#F8FAFC',
      },
      borderRadius: {
        xl2: '20px',
      },
    },
  },
  plugins: [],
}
export default config
