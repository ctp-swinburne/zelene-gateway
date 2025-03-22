// src/routes/subscription.routes.ts
import { Elysia, t } from "elysia";
import { subscriptionController } from "../controllers/subscription.controller";
import { createLogger } from "../utils/logger";
import { SubscriptionSchema, ApiResponse } from "../types/mqtt";

const logger = createLogger("SubscriptionRoutes");

export const subscriptionRoutes = new Elysia({ prefix: "/subscriptions" })
  .post(
    "/",
    async ({ body, set }): Promise<ApiResponse<any>> => {
      logger.info(
        `Received request to create a new subscription for device: ${body.deviceId} to topic: ${body.topicPath}`
      );

      try {
        const result = await subscriptionController.createSubscription(body);
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing create subscription request for device: ${body.deviceId}`,
          error
        );

        // Set appropriate status code based on error type
        if (
          error.message.includes("not found") ||
          error.message.includes("Invalid device ID")
        ) {
          set.status = 404; // Not Found
        } else if (error.message.includes("already exists")) {
          set.status = 409; // Conflict
        } else {
          set.status = 500; // Internal Server Error
        }

        return {
          success: false,
          error: error.message || "Failed to create subscription",
        };
      }
    },
    {
      body: SubscriptionSchema,
      detail: {
        tags: ["Subscriptions"],
        summary: "Create a new subscription",
        description:
          "Creates a new subscription linking a device to an MQTT topic",
      },
    }
  )
  .get(
    "/device/:deviceId",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { deviceId } = params;
      logger.info(
        `Received request to get subscriptions for device: ${deviceId}`
      );

      try {
        const result = await subscriptionController.getDeviceSubscriptions(
          deviceId
        );
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing get subscriptions request for device: ${deviceId}`,
          error
        );

        // Set appropriate status code based on error type
        if (error.message.includes("not found")) {
          set.status = 404; // Not Found
        } else {
          set.status = 500; // Internal Server Error
        }

        return {
          success: false,
          error: error.message || "Failed to fetch subscriptions",
        };
      }
    },
    {
      params: t.Object({
        deviceId: t.String({
          minLength: 1,
          error: "The device ID field cannot be empty",
        }),
      }),
      detail: {
        tags: ["Subscriptions"],
        summary: "Get device subscriptions",
        description: "Retrieves all topic subscriptions for a specific device",
      },
    }
  );
