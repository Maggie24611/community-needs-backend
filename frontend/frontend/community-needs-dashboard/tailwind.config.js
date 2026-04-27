/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        critical: { DEFAULT: "#F85149", light: "#1C0A09", border: "#6E2320" },
        high:     { DEFAULT: "#E3B341", light: "#191108", border: "#6E4F15" },
        medium:   { DEFAULT: "#3FB950", light: "#091D0E", border: "#1A4D24" },
        surface:  "#0D1117",
        card:     "#161B22",
        ink:      "#E6EDF3",
        muted:    "#7D8590",
        line:     "#21262D",
        accent:   "#58A6FF",
      },
      boxShadow: {
        card:     "0 1px 0 0 #21262D, 0 4px 24px 0 rgb(0 0 0 / 0.4)",
        hover:    "0 8px 24px 0 rgb(0 0 0 / 0.5)",
        critical: "0 0 16px 0 rgb(248 81 73 / 0.15)",
        high:     "0 0 16px 0 rgb(227 179 65 / 0.15)",
        medium:   "0 0 16px 0 rgb(63 185 80 / 0.15)",
      },
      keyframes: {
  fadeSlideIn: {
    '0%':   { opacity: '0', transform: 'translateY(10px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
        pulseRing: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
      },
      animation: {
        fadeSlideIn: 'fadeSlideIn 0.35s ease-out forwards',
        pulseRing:   'pulseRing 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}