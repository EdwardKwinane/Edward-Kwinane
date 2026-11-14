import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource-variable/roboto-flex/wght.css";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-600.css";
import "@fontsource/nunito-sans/latin-700.css";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "@/hooks/use-theme";
import { initConsent } from "@/lib/consent/cookieConsent";

// Start CookieConsent synchronously, before React renders. This guarantees
// window.CookieConsent and the stored consent state exist by the time any
// component (MetaPixel included) reads them. Idempotent.
initConsent();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
