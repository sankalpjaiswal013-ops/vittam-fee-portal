import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14172B",
        "ink-card": "#1E2238",
        "ledger-line": "#232848",
        paper: "#FCFAF4",
        marigold: "#F0A202",
        banyan: "#2F6F4E",
        alert: "#E4572E",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        "ledger-rules":
          "repeating-linear-gradient(to bottom, transparent, transparent 39px, rgba(240,162,2,0.07) 40px)",
      },
      boxShadow: {
        paper: "0 20px 60px -15px rgba(20, 23, 43, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;