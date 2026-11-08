import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/study.css";
import "./styles/app.css";
import { App } from "./app/App";
import { applyConfig } from "./app/store";

applyConfig(null);

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
