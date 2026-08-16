import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { StudentAuthProvider } from "./contexts/StudentAuthContext.jsx";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StudentAuthProvider>
          <App />
        </StudentAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);