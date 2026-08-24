import type { Config } from "tailwindcss";

// All color tokens resolve to CSS variables defined in src/index.css
// (:root for light theme, .dark overrides). RGB triplets keep Tailwind's
// opacity modifiers (e.g. text-ink/70) working in both themes.
const rgb = (token: string) => `rgb(var(--c-${token}) / <alpha-value>)`;

const designTokens = {
  colors: {
    navy: {
      DEFAULT: rgb("navy"),
      deep: rgb("navy-deep"),
      light: rgb("navy-light"),
    },
    ink: rgb("ink"),
    surface: {
      DEFAULT: rgb("surface"),
      alt: rgb("surface-alt"),
      pale: rgb("surface-pale"),
      pale2: rgb("surface-pale-2"),
      pale3: rgb("surface-pale-3"),
      pale4: rgb("surface-pale-4"),
    },
    primary: {
      DEFAULT: rgb("primary"),
      hover: rgb("primary-hover"),
    },
    accent: {
      DEFAULT: rgb("accent"),
      dark: rgb("accent-dark"),
      light: "#FF7A33",
      ambient: "rgba(254, 89, 0, 0.18)",
    },
    error: {
      DEFAULT: rgb("error"),
      container: rgb("error-container"),
    },
    success: {
      DEFAULT: rgb("success"),
      fg: rgb("success-fg"),
      container: rgb("success-container"),
    },
    slate: {
      border: rgb("slate-border"),
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
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: designTokens,
  },
  plugins: [],
} satisfies Config;