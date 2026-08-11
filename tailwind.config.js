/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f8',
          100: '#d4dfee',
          600: '#2c4a7c',
          700: '#1f3864',
          800: '#182c4d',
          900: '#101d33',
        },
        gold: {
          400: '#d3bb85',
          500: '#c0a46b',
          600: '#a9895077',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
