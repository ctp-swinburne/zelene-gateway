// src/routes/api.routes.ts
import { Elysia } from "elysia";
import { deviceRoutes } from "./device.routes";
import { topicRoutes } from "./topic.routes";
import { subscriptionRoutes } from "./subscription.routes";
import { createLogger } from "../utils/logger";

const logger = createLogger("ApiRoutes");

// API v1 router
export const apiV1Routes = new Elysia({ prefix: "/v1" })
  .use(deviceRoutes)
  .use(topicRoutes)
  .use(subscriptionRoutes);

// Main API router with versioning
export const apiRoutes = new Elysia({ prefix: "/api" })
  .use(apiV1Routes)
  .get("/", () => {
    logger.info("API root endpoint accessed");
    return {
      name: "Zelene Gateway API",
      version: "1.0.0",
      availableVersions: ["v1"],
    };
  });

logger.info("API routes configured with versioning");
