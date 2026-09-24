/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./context/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1B2440", // Elanlar səhifələri üçün əsas göy tonu (və ya "#0F172A")
          50: "#F1F5F9",
          100: "#E2E8F0",
          600: "#1E293B",
          900: "#0B0F19",
        },
        copper: {
          DEFAULT: "#C9743E", // Elanlar səhifələri üçün mis tonu
          light: "#D97706",
          dark: "#92400E",
        },
        cream: {
          50: "#FBF9F5",
          100: "#F5F1E8",
          200: "#EDE6D6",
          300: "#E2D8C0",
        },
        charcoal: {
          DEFAULT: "#1C1B19", // Zərif tünd boz
          700: "#2A2926",
          600: "#38362F",
          400: "#5C594F",
        },
        gold: {
          DEFAULT: "#C9A24A", // Qızılı detal
          50: "#FBF3E2",
          100: "#F3E2B8",
          300: "#DDB86B",
          400: "#C9A24A",
          500: "#B08D3E",
          600: "#8F7132",
        },
      },
      fontFamily: {
        heading: ["Poppins", "Segoe UI", "sans-serif"],
        body: ["Inter", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px rgba(28, 27, 25, 0.08)",
        cardHover: "0 10px 32px rgba(28, 27, 25, 14)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};