import type { Alpine } from "alpinejs";
import collapse from "@alpinejs/collapse";
import focus from "@alpinejs/focus";

export default (Alpine: Alpine) => {
  Alpine.plugin(collapse);
  Alpine.plugin(focus);
};
