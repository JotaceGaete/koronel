import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initAnalytics } from "./lib/analytics";
import "./styles/tailwind.css";
import "./styles/index.css";

initAnalytics();

const container = document.getElementById("root");
const root = createRoot(container);

root.render(<App />);
