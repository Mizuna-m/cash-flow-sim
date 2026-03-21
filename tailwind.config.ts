import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#13212b",
        sand: "#f3efe5",
        moss: "#708b75",
        ember: "#d46a4c",
        brass: "#b98a3b"
      },
      fontFamily: {
        sans: [
          "'IBM Plex Sans JP'",
          "'Inter'",
          "'Hiragino Sans'",
          "'Hiragino Kaku Gothic ProN'",
          "'Yu Gothic UI'",
          "'Meiryo'",
          "sans-serif"
        ]
      },
      boxShadow: {
        panel: "0 20px 45px rgba(19, 33, 43, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
