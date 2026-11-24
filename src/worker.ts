// The Cloudflare Worker: Astro's handler from EmDash, with its co-editing
// rooms and the scheduled handler for publishing and maintenance.
import handler, {
  createScheduledHandler,
  EmDashRoom,
  EmDashRoomSite,
  PluginBridge,
} from "@emdash-cms/cloudflare/worker";

export { EmDashRoom, EmDashRoomSite, PluginBridge };

export default {
  ...handler,
  scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
