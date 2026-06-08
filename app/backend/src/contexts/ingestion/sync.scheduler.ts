import type { CatalogService } from "./catalog.service.js";

export type SyncSchedulerConfig = {
  startupEnabled: boolean;
  intervalMs: number;
  disabled: boolean;
};

export class SyncScheduler {
  private interval: NodeJS.Timeout | undefined;

  constructor(
    private readonly catalog: CatalogService,
    private readonly config: SyncSchedulerConfig
  ) {}

  start(): void {
    if (this.config.disabled) return;

    if (this.config.startupEnabled) {
      void this.catalog.runScheduledSync("startup");
    }

    if (this.config.intervalMs > 0) {
      this.interval = setInterval(() => {
        void this.catalog.runScheduledSync("interval");
      }, this.config.intervalMs);
      this.interval.unref();
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}
