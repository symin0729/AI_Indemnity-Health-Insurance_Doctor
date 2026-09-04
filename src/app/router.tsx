import { createBrowserRouter } from "react-router-dom";

import M01StartPage from "../pages/M01StartPage/M01StartPage";
import M02InputPage from "../pages/M02InputPage/M02InputPage";
import M03ConfirmPage from "../pages/M03ConfirmPage/M03ConfirmPage";
import M04ResultPage from "../pages/M04ResultPage/M04ResultPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <M01StartPage />,
  },
  {
    path: "/input",
    element: <M02InputPage />,
  },
  {
    path: "/confirm",
    element: <M03ConfirmPage />,
  },
  {
    path: "/result",
    element: <M04ResultPage />,
  },
]);