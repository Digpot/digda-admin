/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 디그팟 앱과 동일한 중성 그레이 스케일 (warm-neutral)
        ink: {
          50: "#f2f4f6",
          100: "#e5e8eb",
          200: "#d1d6db",
          300: "#b0b8c1",
          400: "#8b95a1",
          500: "#6b7684",
          600: "#4e5968",
          700: "#333d4b",
          800: "#191f28",
          900: "#191f28",
          950: "#12151f"
        },
        // 디그팟 브랜드 코랄 (앱 primary #FF6B6B)
        accent: {
          DEFAULT: "#ff6b6b",
          soft: "#ffb3b8",
          strong: "#ff4d4d"
        }
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Pretendard Variable",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans KR",
          "sans-serif"
        ]
      },
      borderRadius: {
        xl: "0.875rem", // 14px
        "2xl": "1.25rem", // 20px
        "3xl": "1.75rem" // 28px — 앱 카드 라운드
      },
      boxShadow: {
        card: "0 1px 2px rgba(25, 31, 40, 0.04), 0 10px 28px rgba(25, 31, 40, 0.06)",
        coral: "0 8px 20px rgba(255, 107, 107, 0.25)"
      }
    }
  },
  plugins: []
};
