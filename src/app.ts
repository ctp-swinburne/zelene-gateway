// src/app.ts
import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { apiRoutes } from "./routes/api.routes";
import { createLogger } from "./utils/logger";
import { bigintJsonReplacer } from "./utils/serializer";

const logger = createLogger("App");

// Create a BigInt serializer plugin
const bigintSerializer = new Elysia().onTransform(({ response }) => {
  // Skip if not an object or null
  if (typeof response !== "object" || response === null) {
    return response;
  }

  try {
    // Transform the response by serializing and then parsing back with BigInt handling
    const serialized = JSON.stringify(response, bigintJsonReplacer);
    return JSON.parse(serialized);
  } catch (error) {
    logger.error("Failed to transform response with BigInt values", error);
    return response;
  }
});

// Create and configure the Elysia application
export const app = new Elysia()
  .use(
    swagger({
      path: "/docs", // Custom path for Swagger documentation
      documentation: {
        info: {
          title: "Zelene Gateway API",
          version: "1.0.0",
          description: "API for managing MQTT subscriptions and publications",
        },
        tags: [
          { name: "Devices", description: "Device management" },
          { name: "Subscriptions", description: "Subscription management" },
          { name: "Publications", description: "Topic publication management" },
        ],
      },
    })
  )
  // Add BigInt serialization
  .use(bigintSerializer)
  .onError(({ code, error, set, request }) => {
    // Get the route path for better error context
    const path = request.url || "unknown path";

    if (code === "VALIDATION") {
      logger.warn(`Validation error at ${path}: ${JSON.stringify(error.all)}`);
      set.status = 400;

      return {
        success: false,
        error: "Validation failed",
        validationErrors: error.all,
      };
    }

    // Handle not found errors specifically
    if (code === "NOT_FOUND") {
      logger.warn(`Route not found: ${path}`);
      set.status = 404;

      return {
        success: false,
        error: "Resource not found",
      };
    }

    // Safely handle error message with fallback
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    logger.error(`Unhandled error at ${path}:`, error);
    set.status = 500;

    return {
      success: false,
      error: "Internal server error",
    };
  })
  .use(apiRoutes)
  .get("/", () => {
    logger.info("Root endpoint accessed");
    return "Zelene Gateway API - MQTT Subscription and Publication Management";
  });

// Log when the app is configured
logger.info("Application configured successfully");
