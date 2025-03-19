// src/app.ts
import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { apiRoutes } from "./routes/api.routes";
import { createLogger } from "./utils/logger";

const logger = createLogger("App");

// Create and configure the Elysia application
export const app = new Elysia()
  .use(
    swagger({
      path: "/docs", // Custom path for Swagger documentation
      documentation: {
        info: {
          title: "Zelene Gateway API",
          version: "1.0.0",
          description: "API for managing MQTT subscriptions",
        },
        tags: [
          { name: "Devices", description: "Device management" },
          { name: "Topics", description: "Topic management" },
          { name: "Subscriptions", description: "Subscription management" },
        ],
      },
    })
  )
  .use(apiRoutes)
  .get("/", () => {
    logger.info("Root endpoint accessed");
    return "Zelene Gateway API - MQTT Subscription Management";
  });

// Log when the app is configured
logger.info("Application configured successfully");
