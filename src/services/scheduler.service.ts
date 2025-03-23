// src/services/scheduler.service.ts
import { createLogger } from "../utils/logger";
import { processScheduledPublications } from "./publication.service";

const logger = createLogger("SchedulerService");

// Configuration for the publication scheduler
const SCHEDULER_INTERVAL_MS = 60000; // Run every minute (60000ms)
let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

/**
 * Process any pending scheduled publications
 */
export async function checkScheduledPublications(): Promise<number> {
  // Prevent concurrent processing
  if (isProcessing) {
    logger.debug("Scheduler: Already processing publications, skipping");
    return 0;
  }

  isProcessing = true;
  try {
    const count = await processScheduledPublications();

    if (count > 0) {
      logger.info(`Scheduler: Published ${count} messages`);
    } else {
      logger.debug("Scheduler: No publications due");
    }

    return count;
  } catch (error: any) {
    logger.error("Scheduler: Failed to process publications", error);
    return 0;
  } finally {
    isProcessing = false;
  }
}

/**
 * Trigger an immediate check of scheduled publications
 * This should be called when publications are added, updated, or canceled
 */
export function triggerScheduledPublicationsCheck(): void {
  logger.debug(
    "Scheduler: Triggering immediate check of scheduled publications"
  );
  checkScheduledPublications().catch((error) => {
    logger.error("Scheduler: Failed during triggered check", error);
  });
}

/**
 * Start the scheduler for processing scheduled publications
 */
export function startScheduler(): void {
  logger.info("Starting scheduled publications processor");

  // Immediately process any pending publications at startup
  checkScheduledPublications()
    .then((count) => {
      logger.info(`Processed ${count} scheduled publications at startup`);
    })
    .catch((error) => {
      logger.error(
        "Failed to process scheduled publications at startup",
        error
      );
    });

  // Setup recurring interval for processing scheduled publications
  schedulerInterval = setInterval(() => {
    checkScheduledPublications().catch((error) => {
      logger.error("Scheduled processor failed", error);
    });
  }, SCHEDULER_INTERVAL_MS);

  logger.info(
    `Scheduler configured to process publications every ${
      SCHEDULER_INTERVAL_MS / 1000
    } seconds`
  );
}

/**
 * Stop the publication scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info("Stopped scheduled publications processor");
  }
}
