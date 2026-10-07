import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

// 화면(경로)이 바뀔 때마다 이전 화면의 스크롤 위치를 물려받지 않고 맨 위부터 보이게 한다.
function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return <Outlet />;
}

export default ScrollToTop;
