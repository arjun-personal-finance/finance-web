/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          primary: '#D4AF37',
          light: '#E8D5A3',
          dark: '#B8941F',
        },
        silver: {
          primary: '#C0C0C0',
          light: '#E5E5E5',
          dark: '#8B8B8B',
        },
      },
    },
  },
  plugins: [],
}

