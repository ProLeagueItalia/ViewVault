"use client";

import { useEffect, useState } from "react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 450);
    }

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    onScroll();

    return () =>
      window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <button
      type="button"
      aria-label="Torna su"
      title="Torna su"
      onClick={scrollToTop}
      className={`
        fixed
        bottom-7
        right-7
        z-[999]
        flex
        h-14
        w-14
        items-center
        justify-center
        rounded-full
        border
        border-violet-400/30
        bg-[#7C3AED]
        text-white
        shadow-[0_0_30px_rgba(124,58,237,0.55)]
        transition-all
        duration-300
        hover:scale-110
        hover:bg-[#6D28D9]
        hover:shadow-[0_0_45px_rgba(124,58,237,0.75)]
        active:scale-95
        ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-6 opacity-0"
        }
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}