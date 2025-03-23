// src/index.ts
import { app } from "./app";
import { createLogger } from "./utils/logger";
import {
  initializeSubscriptions,
  disconnectAllDevices,
} from "./services/mqtt.service";
import { startScheduler, stopScheduler } from "./services/scheduler.service";

const logger = createLogger("Server");
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

async function startServer() {
  try {
    logger.info("Starting Zelene Gateway server...");

    // Initialize MQTT subscriptions
    logger.info("Initializing MQTT subscriptions...");
    await initializeSubscriptions();

    // Start the publication scheduler
    startScheduler();

    // Start the server
    const server = app.listen(PORT);

    if (server) {
      const baseUrl = `http://${app.server?.hostname}:${app.server?.port}`;
      logger.info(`🦊 Elysia is running at ${baseUrl}`);
      logger.info(`📚 Swagger documentation available at ${baseUrl}/docs`);
      logger.info(`🚀 API v1 available at ${baseUrl}/api/v1`);

      // Log available endpoints for quick reference
      logger.info("Available API endpoints:");
      logger.info(`${baseUrl}/api/v1/devices`);
      logger.info(`${baseUrl}/api/v1/subscriptions`);
      logger.info(`${baseUrl}/api/v1/publications`);
      logger.info(`${baseUrl}/api/v1/publications/schedule`);
    } else {
      logger.error("Failed to start the server");
      process.exit(1);
    }

    // Set up cleanup handler
    const cleanup = async () => {
      logger.info("Shutting down server...");
      try {
        // Stop the scheduler first
        stopScheduler();

        // Then disconnect MQTT clients
        await disconnectAllDevices();
        logger.info("All MQTT connections closed");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown", error);
        process.exit(1);
      }
    };

    // Register cleanup handlers
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  } catch (error: any) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
}

// Start the server
startServer();
