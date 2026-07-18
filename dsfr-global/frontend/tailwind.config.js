/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: "#0b0f19", card: "#111827", border: "#1f2937" },
        brand: { DEFAULT: "#6366f1", hover: "#818cf8" }
      }
    }
  },
  plugins: []
};
