import { defineConfig, loadEnv } from "vite";

// 종단 평가 전용 설정. .env.local 을 서버 환경변수로 읽고(키는 출력하지 않는다), 기본 테스트(npm test)에는 포함되지 않는다.
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    test: { include: ["evals/e2e/*.e2e.ts"], testTimeout: 3_600_000, hookTimeout: 60_000 },
  };
});
