import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";

import { router } from "./app/router";
import SplashScreen from "./components/SplashScreen";

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <SplashScreen />
    <RouterProvider router={router} />
  </StrictMode>
);