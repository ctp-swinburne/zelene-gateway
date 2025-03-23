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

// Parameter schema with additional validation
const IdParamSchema = t.Object({
  id: t.String({
    minLength: 1,
    error: "The subscription ID field cannot be empty",
  }),
});

const DeviceIdParamSchema = t.Object({
  deviceId: t.String({
    minLength: 1,
    error: "The device ID field cannot be empty",
  }),
});

export const subscriptionRoutes = new Elysia({ prefix: "/subscriptions" })
  .post(
    "/",
    async ({ body, set }): Promise<ApiResponse<any>> => {
      logger.info(
        `Received request to create a new subscription for device: ${body.deviceId} to topic: ${body.topicPath}`
      );

      const result = await subscriptionController.createSubscription(body);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
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

      const result = await subscriptionController.getDeviceSubscriptions(
        deviceId
      );
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: DeviceIdParamSchema,
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

      const result = await subscriptionController.getSubscriptionById(id);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: IdParamSchema,
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

      const result = await subscriptionController.updateSubscription(id, qos);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: IdParamSchema,
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

      const result = await subscriptionController.deleteSubscription(id);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: IdParamSchema,
      detail: {
        tags: ["Subscriptions"],
        summary: "Delete a subscription",
        description: "Deletes a subscription",
      },
    }
  );
