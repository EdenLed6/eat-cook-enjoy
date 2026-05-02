import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f0',
          500: '#e8826b',
          600: '#d96650',
          700: '#b54a36',
        },
      },
      fontFamily: {
        heebo: ['Heebo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
