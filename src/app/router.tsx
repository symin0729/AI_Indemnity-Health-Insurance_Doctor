import { createBrowserRouter } from "react-router-dom";

import M01StartPage from "../pages/M01StartPage/M01StartPage";
import M02InputPage from "../pages/M02InputPage/M02InputPage";
import M03ConfirmPage from "../pages/M03ConfirmPage/M03ConfirmPage";
import M04ResultPage from "../pages/M04ResultPage/M04ResultPage";
import ScrollToTop from "./ScrollToTop";
import ResultChatbot from "../features/chatbot/ResultChatbot";

// 소비자용 화면: 설계사용 화면을 복사해 둔 독립 코드·독립 상태(src/consumer)로, 설계사용과 연결되지 않는다.
import ConsumerInputPage from "../consumer/pages/M02InputPage/M02InputPage";
import ConsumerConfirmPage from "../consumer/pages/M03ConfirmPage/M03ConfirmPage";
import ConsumerResultPage from "../consumer/pages/M04ResultPage/M04ResultPage";
import ConsumerResultChatbot from "../consumer/features/chatbot/ResultChatbot";

export const router = createBrowserRouter([
  {
    element: <ScrollToTop />,
    children: [
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
    {
      path: "/chat",
      element: <ResultChatbot />,
    },
    {
      path: "/consumer/input",
      element: <ConsumerInputPage />,
    },
    {
      path: "/consumer/confirm",
      element: <ConsumerConfirmPage />,
    },
    {
      path: "/consumer/result",
      element: <ConsumerResultPage />,
    },
    {
      path: "/consumer/chat",
      element: <ConsumerResultChatbot />,
    },
    ],
  },
]);
