// src/routes/subscription.routes.ts
import { Elysia, t } from "elysia";
import { subscriptionController } from "../controllers/subscription.controller";
import { createLogger } from "../utils/logger";
import { SubscriptionSchema, ApiResponse } from "../types/mqtt";

const logger = createLogger("SubscriptionRoutes");

// QoS update schema
const QoSUpdateSchema = t.Object({
  qos: t.Number({
    minimum: 0,
    maximum: 2,
    error: "QoS must be 0, 1, or 2",
  }),
});

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
  )
  .get(
    "/:id",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(`Received request to get subscription with ID: ${id}`);

      try {
        const subscription = await subscriptionController.getSubscriptionById(
          id
        );

        if (!subscription) {
          logger.warn(`Subscription not found with ID: ${id}`);
          set.status = 404;
          return { success: false, error: "Subscription not found" };
        }

        return { success: true, data: subscription };
      } catch (error: any) {
        logger.error(
          `Error processing get subscription request for ID: ${id}`,
          error
        );
        set.status = 500;
        return {
          success: false,
          error: error.message || "Failed to fetch subscription",
        };
      }
    },
    {
      params: t.Object({
        id: t.String({
          minLength: 1,
          error: "The subscription ID field cannot be empty",
        }),
      }),
      detail: {
        tags: ["Subscriptions"],
        summary: "Get subscription by ID",
        description: "Retrieves a specific subscription by its ID",
      },
    }
  )
  .put(
    "/:id",
    async ({ params, body, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      const { qos } = body;
      logger.info(`Received request to update subscription with ID: ${id}`);

      try {
        const result = await subscriptionController.updateSubscription(id, qos);
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing update subscription request for ID: ${id}`,
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
          error: error.message || "Failed to update subscription",
        };
      }
    },
    {
      params: t.Object({
        id: t.String({
          minLength: 1,
          error: "The subscription ID field cannot be empty",
        }),
      }),
      body: QoSUpdateSchema,
      detail: {
        tags: ["Subscriptions"],
        summary: "Update a subscription",
        description: "Updates a subscription's QoS level",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(`Received request to delete subscription with ID: ${id}`);

      try {
        const result = await subscriptionController.deleteSubscription(id);
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing delete subscription request for ID: ${id}`,
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
          error: error.message || "Failed to delete subscription",
        };
      }
    },
    {
      params: t.Object({
        id: t.String({
          minLength: 1,
          error: "The subscription ID field cannot be empty",
        }),
      }),
      detail: {
        tags: ["Subscriptions"],
        summary: "Delete a subscription",
        description: "Deletes a subscription",
      },
    }
  );
