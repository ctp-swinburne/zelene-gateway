// src/index.ts
import { app } from "./app";
import { createLogger } from "./utils/logger";

const logger = createLogger("Server");
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

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
  logger.info(`${baseUrl}/api/v1/topics`);
  logger.info(`${baseUrl}/api/v1/subscriptions`);
} else {
  logger.error("Failed to start the server");
  process.exit(1);
}
