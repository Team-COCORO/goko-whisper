import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { SurveyApp } from "./survey/SurveyApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SurveyApp />
  </StrictMode>,
);
