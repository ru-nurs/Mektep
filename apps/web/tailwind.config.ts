import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#16A34A",
        "primary-light": "#EAF7EE",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        "bg-base": "#F7FBF7",
        "bg-card": "#FFFFFF",
        "sidebar-bg": "#123322",
        "sidebar-hover": "#1F7A3A",
        "text-primary": "#102014",
        "text-muted": "#607066",
      },
      fontFamily: {
        heading: ["Onest", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;

