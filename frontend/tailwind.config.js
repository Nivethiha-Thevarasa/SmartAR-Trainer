/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f0c29",
        surface: "#1a1a2e",
        primary: "#667eea",
        secondary: "#764ba2",
        accent: "#10b981",
        textHint: "rgba(255, 255, 255, 0.7)",
      },
      fontFamily: {
        sans: ['"Segoe UI"', "sans-serif"],
      },
    },
  },
  plugins: [],
}
