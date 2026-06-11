import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Map Tailwind color names to BoothMagic CSS variables
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        primary: "var(--primary)",
        "primary-2": "var(--primary-2)",
        accent: "var(--accent)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        success: "var(--success)",
        error: "var(--error)",
        border: "var(--border)",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        poppins: ["var(--font-poppins)", "Poppins", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "14px",
        xl: "16px",
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%)",
      },
      maxWidth: {
        dashboard: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
