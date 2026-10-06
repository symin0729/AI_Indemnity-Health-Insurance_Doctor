import { useLayoutEffect } from "react";

export type AppMode = "planner" | "consumer";

/**
 * 화면이 설계사용인지 소비자용인지 문서 최상단(<body data-app-mode>)에 표시한다.
 * 스타일을 한쪽 모드에만 적용할 때 쓴다. 대화상자처럼 화면 밖으로 그려지는 요소도 body 아래라 같이 적용된다.
 *
 *   [data-app-mode="consumer"] .card-title { margin-bottom: 12px; }   ← 소비자용만
 *   [data-app-mode="planner"]  .card-title { margin-bottom: 6px; }    ← 설계사용만
 *   .card-title { margin-bottom: 6px; }                                ← 둘 다
 */
export function useAppMode(mode: AppMode) {
  useLayoutEffect(() => {
    document.body.dataset.appMode = mode;
    return () => {
      if (document.body.dataset.appMode === mode) delete document.body.dataset.appMode;
    };
  }, [mode]);
}
