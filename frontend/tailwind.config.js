/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#fdf3e7',
          DEFAULT: '#f4a261',
          dark: '#e76f51',
        },
        accent: {
          cream: '#fff4e6',
          peach: '#ffcc99',
          brown: '#4a3728',
        }
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      screens: {
        'xs': '480px',
      },
      fontFamily: {
        brand: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
