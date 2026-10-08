/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#171717',
        primary: '#737373',
        secondary: '#a3a3a3',
        border: '#404040',
        muted: '#737373',
      }
    },
  },
  plugins: [],
}
