import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { isAndroid } from "./platform";
import "./styles/index.css";

if (isAndroid) document.documentElement.classList.add("android");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
