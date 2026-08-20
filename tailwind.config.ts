import type { Config } from "tailwindcss";

const designTokens = {
  colors: {
    navy: {
      DEFAULT: "#0D0D5B",
      deep: "#08083C",
      light: "#14147A",
    },
    ink: "#0B1C30",
    surface: {
      DEFAULT: "#F8F9FF",
      alt: "#FFFFFF",
      pale: "#EFF4FF",
      pale2: "#E5EEFF",
      pale3: "#DCE9FF",
      pale4: "#D3E4FE",
    },
    accent: {
      DEFAULT: "#FE5900",
      dark: "#E04F00",
      light: "#FF7A33",
      ambient: "rgba(254, 89, 0, 0.18)",
    },
    error: {
      DEFAULT: "#BA1A1A",
      container: "#FFDAD6",
    },
    success: {
      DEFAULT: "#047857",
      container: "#D1FAE5",
    },
    slate: {
      border: "#CBD5E1",
    },
  },
  fontFamily: {
    heading: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
    body: ["Roboto Flex", "ui-sans-serif", "system-ui", "sans-serif"],
    technical: ["Nunito Sans", "ui-sans-serif", "system-ui", "sans-serif"],
  },
  fontSize: {
    "display-lg": ["48px", "56px"],
    "display-md": ["32px", "40px"],
    "display-sm": ["28px", "36px"],
    body: ["16px", "24px"],
    "tech-label": ["13px", "16px"],
  },
  letterSpacing: {
    tech: "0.05em",
  },
  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "24px",
    pill: "9999px",
  },
  spacing: {
    // 8px rhythm
    "0.5": "2px",
    "1.5": "6px",
    "2.5": "10px",
    "3.5": "14px",
    "6.5": "26px",
    "7": "28px",
    "8": "32px",
    "9": "36px",
    "10": "40px",
    "11": "44px",
    "12": "48px",
    "13": "52px",
    "14": "56px",
    "15": "60px",
    "16": "64px",
    "18": "72px",
    "20": "80px",
    "24": "96px",
    "28": "112px",
    "32": "128px",
    "40": "160px",
  },
};

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: designTokens,
  },
  plugins: [],
} satisfies Config;