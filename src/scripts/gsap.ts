import { gsap } from "gsap";

document
  .querySelectorAll<HTMLElement>("[data-featured-viewport]")
  .forEach((viewport) => {
    const track = viewport.querySelector<HTMLElement>("[data-featured-track]");
    const group = viewport.querySelector<HTMLElement>("[data-featured-group]");
    const toggle = viewport.parentElement?.querySelector<HTMLButtonElement>(
      "[data-featured-toggle]",
    );
    const hero = viewport.closest("section");
    const left = hero?.querySelectorAll<HTMLElement>("[data-hero-left]");
    const right = hero?.querySelector<HTMLElement>("[data-hero-right]");
    const badge = hero?.querySelector<HTMLElement>("[data-hero-badge]");
    if (!track || !group || !toggle) return;

    let animation: gsap.core.Tween | undefined;
    let paused = false;
    toggle.addEventListener("click", () => {
      paused = !paused;
      animation?.paused(paused);
      toggle.textContent = paused
        ? "Play logo animation"
        : "Pause logo animation";
    });

    gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
      if (left?.length)
        gsap.from(left, { x: "-40vw", duration: 1.4, ease: "power2.out" });
      if (right)
        gsap.from(right, { x: "40vw", duration: 1.4, ease: "power2.out" });
      if (badge)
        gsap.from(badge, { y: -120, duration: 1.4, ease: "power2.out" });

      viewport.dataset.active = "";
      toggle.hidden = false;

      const update = () => {
        animation?.kill();
        track
          .querySelectorAll("[data-featured-copy]")
          .forEach((copy) => copy.remove());
        const width = group.getBoundingClientRect().width;
        if (!width) return;

        const copies = Math.ceil(viewport.clientWidth / width);
        for (let i = 0; i < copies; i++) {
          const copy = group.cloneNode(true);
          if (copy instanceof HTMLElement) {
            copy.dataset.featuredCopy = "";
            copy.setAttribute("aria-hidden", "true");
            track.append(copy);
          }
        }

        animation = gsap.fromTo(
          track,
          { x: -width },
          {
            x: 0,
            duration: width / 45,
            ease: "none",
            repeat: -1,
            paused,
          },
        );
      };

      const observer = new ResizeObserver(update);
      observer.observe(viewport);
      update();

      return () => {
        observer.disconnect();
        animation?.kill();
        animation = undefined;
        gsap.set(track, { clearProps: "transform" });
        track
          .querySelectorAll("[data-featured-copy]")
          .forEach((copy) => copy.remove());
        delete viewport.dataset.active;
        toggle.hidden = true;
      };
    });
  });
