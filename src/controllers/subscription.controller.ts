// src/controllers/subscription.controller.ts
import {
  createSubscription,
  getDeviceSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
} from "../services/subscription.service";
import { createLogger } from "../utils/logger";
import { SubscriptionDto } from "../types/mqtt";

const logger = createLogger("SubscriptionController");

export const subscriptionController = {
  async createSubscription(body: SubscriptionDto) {
    logger.info(
      `Handling request to create a new subscription for device: ${body.deviceId} to topic: ${body.topicPath}`
    );

    try {
      const subscription = await createSubscription(body);
      logger.info(
        `Subscription created successfully with ID: ${subscription.id}`
      );
      return { success: true, data: subscription, statusCode: 201 };
    } catch (error: any) {
      logger.error(
        `Failed to create subscription for device: ${body.deviceId}`,
        error
      );

      // Determine appropriate status code
      let statusCode = 500;
      if (
        error.message?.toLowerCase().includes("not found") ||
        error.message?.toLowerCase().includes("invalid device id")
      ) {
        statusCode = 404; // Not Found
      } else if (error.message?.toLowerCase().includes("already exists")) {
        statusCode = 409; // Conflict
      }

      return {
        success: false,
        error: error.message || "Failed to create subscription",
        statusCode,
      };
    }
  },

  async getDeviceSubscriptions(deviceId: string) {
    logger.info(
      `Handling request to get subscriptions for device: ${deviceId}`
    );

    try {
      const subscriptions = await getDeviceSubscriptions(deviceId);
      logger.info(
        `Successfully fetched ${subscriptions.length} subscriptions for device: ${deviceId}`
      );
      return { success: true, data: subscriptions, statusCode: 200 };
    } catch (error: any) {
      logger.error(
        `Failed to fetch subscriptions for device: ${deviceId}`,
        error
      );

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message?.toLowerCase().includes("not found")) {
        statusCode = 404; // Not Found
      }

      return {
        success: false,
        error: error.message || "Failed to fetch subscriptions",
        statusCode,
      };
    }
  },

  async getSubscriptionById(id: string) {
    logger.info(`Handling request to get subscription with ID: ${id}`);

    try {
      const subscription = await getSubscriptionById(id);

      if (!subscription) {
        logger.warn(`Subscription not found with ID: ${id}`);
        return {
          success: false,
          error: "Subscription not found",
          statusCode: 404,
        };
      }

      logger.info(`Successfully fetched subscription with ID: ${id}`);
      return { success: true, data: subscription, statusCode: 200 };
    } catch (error: any) {
      logger.error(`Failed to fetch subscription with ID: ${id}`, error);
      return {
        success: false,
        error: error.message || "Failed to fetch subscription",
        statusCode: 500,
      };
    }
  },

  async updateSubscription(id: string, qos: number) {
    logger.info(`Handling request to update subscription with ID: ${id}`);

    try {
      // Check if the subscription exists
      const existingSubscription = await getSubscriptionById(id);
      if (!existingSubscription) {
        logger.warn(`Subscription not found with ID: ${id}`);
        return {
          success: false,
          error: "Subscription not found",
          statusCode: 404,
        };
      }

      const subscription = await updateSubscription(id, qos);
      logger.info(`Successfully updated subscription with ID: ${id}`);
      return { success: true, data: subscription, statusCode: 200 };
    } catch (error: any) {
      logger.error(`Failed to update subscription with ID: ${id}`, error);
      return {
        success: false,
        error: error.message || "Failed to update subscription",
        statusCode: 500,
      };
    }
  },

  async deleteSubscription(id: string) {
    logger.info(`Handling request to delete subscription with ID: ${id}`);

    try {
      // Check if the subscription exists
      const existingSubscription = await getSubscriptionById(id);
      if (!existingSubscription) {
        logger.warn(`Subscription not found with ID: ${id}`);
        return {
          success: false,
          error: "Subscription not found",
          statusCode: 404,
        };
      }

      const result = await deleteSubscription(id);
      logger.info(`Successfully deleted subscription with ID: ${id}`);
      return { success: true, data: result, statusCode: 200 };
    } catch (error: any) {
      logger.error(`Failed to delete subscription with ID: ${id}`, error);
      return {
        success: false,
        error: error.message || "Failed to delete subscription",
        statusCode: 500,
      };
    }
  },
};
