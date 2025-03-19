// src/controllers/subscription.controller.ts
import {
  createSubscription,
  getDeviceSubscriptions,
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
      return { success: true, data: subscription };
    } catch (error: any) {
      logger.error(
        `Failed to create subscription for device: ${body.deviceId}`,
        error
      );
      throw error;
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
      return { success: true, data: subscriptions };
    } catch (error: any) {
      logger.error(
        `Failed to fetch subscriptions for device: ${deviceId}`,
        error
      );
      throw error;
    }
  },
};
