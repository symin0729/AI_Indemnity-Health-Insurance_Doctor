import {
  useEffect,
  useState,
} from "react";

import splashLogo from "../assets/main-logo.png";

const FADE_START_MS = 1050;
const REMOVE_MS = 1400;

function SplashScreen() {
  const [isVisible, setIsVisible] =
    useState(true);

  const [isLeaving, setIsLeaving] =
    useState(false);

  useEffect(() => {
    const fadeTimer =
      window.setTimeout(() => {
        setIsLeaving(true);
      }, FADE_START_MS);

    const removeTimer =
      window.setTimeout(() => {
        setIsVisible(false);
      }, REMOVE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div
        className={`app-splash${
          isLeaving
            ? " app-splash--leaving"
            : ""
        }`}
        role="status"
        aria-label="AI 실손 닥터 시작 화면"
      >
        <img
          className="app-splash__logo"
          src={splashLogo}
          alt="AI 실손 닥터"
          draggable={false}
        />
      </div>

      <style>{`
        .app-splash {
          position: fixed;
          inset: 0;
          z-index: 99999;
          width: 100%;
          min-height: 100vh;
          height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          overflow: hidden;
          padding: 0;
          background: #000000;
          opacity: 1;
          visibility: visible;
          transition:
            opacity 350ms ease,
            visibility 350ms ease;
        }

        .app-splash--leaving {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        .app-splash__logo {
          display: block;
          width: 100%;
          max-width: none;
          height: 100%;
          max-height: none;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
          animation:
            splash-logo-enter
            520ms
            ease-out
            both;
        }

        @keyframes splash-logo-enter {
          from {
            opacity: 0;
            transform: scale(0.96);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .app-splash,
          .app-splash__logo {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </>
  );
}

export default SplashScreen;
