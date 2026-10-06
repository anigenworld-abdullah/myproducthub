import { useEffect } from "react";

export function useScrollReveal() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observed = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            e.target.classList.remove("reveal-pending");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -24px 0px" }
    );
    function observeNewContent() {
      document.querySelectorAll<HTMLElement>(".reveal:not(.in-view)").forEach((el) => {
        if (motion.matches) {
          el.classList.remove("reveal-pending");
          el.classList.add("in-view");
          io.unobserve(el);
        } else if (!observed.has(el)) {
          observed.add(el);
          el.classList.add("reveal-pending");
          io.observe(el);
        }
      });
    }
    observeNewContent();
    // Products arrive asynchronously and navigation replaces page content.
    const mutations = new MutationObserver(observeNewContent);
    mutations.observe(document.body, { childList: true, subtree: true });
    motion.addEventListener("change", observeNewContent);
    return () => {
      io.disconnect();
      mutations.disconnect();
      motion.removeEventListener("change", observeNewContent);
      document.querySelectorAll(".reveal-pending").forEach((el) => el.classList.remove("reveal-pending"));
    };
  }, []);
}
