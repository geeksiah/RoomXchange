/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rx: {
          background: "#F7F7F7",
          surface: "#FFFFFF",
          text: "#111111",
          muted: "#6B7280",
          accent: "#FF385C",
          border: "#EAEAEA",
          accentSoft: "#FFE8EE"
        }
      },
      fontFamily: {
        jakarta: ["PlusJakartaSans_500Medium"],
        "jakarta-bold": ["PlusJakartaSans_700Bold"]
      },
      boxShadow: {
        card: "0px 10px 24px rgba(17,17,17,0.08)"
      }
    }
  },
  plugins: []
};
