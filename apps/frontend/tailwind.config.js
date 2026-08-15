/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ide: {
          bg: "#1e1e1e",
          sidebar: "#252526",
          activity: "#333333",
          border: "#3c3c3c",
          hover: "#2a2d2e",
          active: "#37373d",
          tab: "#2d2d2d",
          tabActive: "#1e1e1e",
          panel: "#1e1e1e",
          status: "#007acc",
          accent: "#0e639c",
          accentHover: "#1177bb",
          text: "#cccccc",
          muted: "#858585",
          green: "#89d185",
          orange: "#e2c08d",
          input: "#3c3c3c",
        },
      },
      fontFamily: {
        ui: [
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          "Cascadia Code",
          "Consolas",
          "Menlo",
          "Monaco",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
