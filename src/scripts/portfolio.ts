import Alpine from "alpinejs";

document.addEventListener("alpine:init", () => {
  Alpine.data("portfolioTabs", (initial: string, tabs: string[]) => ({
    active: initial,
    tabs,
    move(event: KeyboardEvent) {
      let index = this.tabs.indexOf(this.active);
      if (event.key === "ArrowRight") index = (index + 1) % this.tabs.length;
      else if (event.key === "ArrowLeft")
        index = (index + this.tabs.length - 1) % this.tabs.length;
      else if (event.key === "Home") index = 0;
      else if (event.key === "End") index = this.tabs.length - 1;
      else return;
      event.preventDefault();
      this.active = this.tabs[index];
      this.$nextTick(() => this.$refs[this.active]?.focus());
    },
  }));

  Alpine.data("portfolioCarousel", () => ({
    page: 0,
    pages: 1,
    observer: undefined as ResizeObserver | undefined,
    init() {
      this.$nextTick(() => {
        this.observer = new ResizeObserver(() => this.refresh());
        this.observer.observe(this.$refs.track);
        this.refresh();
      });
    },
    refresh() {
      const track = this.$refs.track;
      if (!track.clientWidth) return;
      const gap = parseFloat(getComputedStyle(track).columnGap);
      this.pages = Math.max(
        1,
        Math.ceil(
          (track.scrollWidth + gap) / (track.clientWidth + gap) - 0.0001,
        ),
      );
      const maxScroll = track.scrollWidth - track.clientWidth;
      this.page = maxScroll
        ? Math.round(
            (Math.abs(track.scrollLeft) / maxScroll) * (this.pages - 1),
          )
        : 0;
    },
    go(page: number) {
      const track = this.$refs.track;
      const target = Math.max(0, Math.min(this.pages - 1, page));
      const direction = getComputedStyle(track).direction === "rtl" ? -1 : 1;
      track.scrollTo({
        left:
          this.pages > 1
            ? (direction * target * (track.scrollWidth - track.clientWidth)) /
              (this.pages - 1)
            : 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
      this.page = target;
    },
    destroy() {
      this.observer?.disconnect();
    },
  }));
});
