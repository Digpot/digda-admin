/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f6fa",
          100: "#e9ecf3",
          200: "#c8cddd",
          300: "#9aa2bd",
          400: "#6a7391",
          500: "#4a5170",
          600: "#343a55",
          700: "#262b40",
          800: "#1b1f30",
          900: "#12152099",
          950: "#0b0e18"
        },
        accent: {
          DEFAULT: "#6366f1",
          soft: "#818cf8",
          strong: "#4f46e5"
        }
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans KR",
          "sans-serif"
        ]
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
};
