import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// O service worker só existe quando o painel é servido por http(s). Aberto
// como arquivo local (file://) o registro falharia — e não faz falta.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Sem service worker o painel funciona igual, só não abre offline.
    });
  });
}
