/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f3faf4",
          100: "#e2f4e5",
          200: "#bfe5c4",
          300: "#97d3a0",
          400: "#5bb566",
          500: "#2e9440",
          600: "#217333",
          700: "#18572a",
          800: "#0f3b20",
          900: "#082415"
        }
      }
    }
  },
  plugins: []
};
