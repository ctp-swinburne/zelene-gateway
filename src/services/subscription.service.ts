// src/services/subscription.service.ts
import { PrismaClient } from "@prisma/client";
import { SubscriptionDto } from "../types/mqtt";
import { createLogger } from "../utils/logger";
import { getDeviceById } from "./device.service";
import { validateTopicPattern, hasWildcards } from "../utils/mqtt-pattern";

const prisma = new PrismaClient();
const logger = createLogger("SubscriptionService");

/**
 * Get or create a topic
 * @param topicPath The topic path
 * @param description Optional topic description
 * @returns The topic object
 */
async function getOrCreateTopic(topicPath: string, description?: string) {
  logger.info(`Getting or creating topic: ${topicPath}`);

  try {
    // Try to find existing topic
    let topic = await prisma.topic.findUnique({
      where: { topicPath },
    });

    // Create if it doesn't exist
    if (!topic) {
      logger.info(`Topic not found, creating new one: ${topicPath}`);

      // Validate topic pattern if it contains wildcards
      if (hasWildcards(topicPath)) {
        logger.info(`Topic contains wildcards: ${topicPath}`);

        if (!validateTopicPattern(topicPath)) {
          logger.warn(`Invalid topic pattern: ${topicPath}`);
          throw new Error(`Invalid topic pattern: ${topicPath}`);
        }
      }

      topic = await prisma.topic.create({
        data: {
          topicPath,
          description,
          isPublic: true,
          allowSubscribe: true,
        },
      });

      logger.info(`Successfully created topic with ID: ${topic.id}`);
    }

    return topic;
  } catch (error: any) {
    logger.error(`Failed to get or create topic: ${topicPath}`, error);
    throw error;
  }
}

export const createSubscription = async (subscriptionData: SubscriptionDto) => {
  logger.info(
    `Creating subscription for device: ${subscriptionData.deviceId} to topic: ${subscriptionData.topicPath}`
  );

  try {
    // Verify the device exists before attempting to create subscription
    const device = await getDeviceById(subscriptionData.deviceId);
    if (!device) {
      logger.warn(`Device not found with ID: ${subscriptionData.deviceId}`);
      throw new Error(`Device not found with ID: ${subscriptionData.deviceId}`);
    }

    // Auto-create the topic if it doesn't exist
    const topic = await getOrCreateTopic(subscriptionData.topicPath);

    // Check if topic allows subscriptions
    if (!topic.allowSubscribe) {
      logger.warn(
        `Topic does not allow subscriptions: ${subscriptionData.topicPath}`
      );
      throw new Error(
        `Topic does not allow subscriptions: ${subscriptionData.topicPath}`
      );
    }

    // Create the subscription
    const subscription = await prisma.subscription.create({
      data: {
        deviceId: subscriptionData.deviceId,
        topicId: topic.id,
        qos: subscriptionData.qos || 0,
      },
      include: {
        device: true,
        topic: true,
      },
    });

    logger.info(
      `Successfully created subscription with ID: ${subscription.id}`
    );
    return subscription;
  } catch (error: any) {
    // Check if it's a unique constraint violation (duplicate subscription)
    if (error.code === "P2002") {
      logger.warn(
        `Subscription already exists for device: ${subscriptionData.deviceId} to topic: ${subscriptionData.topicPath}`
      );
      throw new Error(`Subscription already exists for this device and topic`);
    }

    // Check if it's a foreign key constraint violation
    if (error.code === "P2003") {
      logger.warn(`Foreign key constraint violation: ${error.message}`);
      throw new Error(`Invalid device ID or topic ID`);
    }

    logger.error(
      `Failed to create subscription for device: ${subscriptionData.deviceId} to topic: ${subscriptionData.topicPath}`,
      error
    );
    throw error;
  }
};

export const getDeviceSubscriptions = async (deviceId: string) => {
  logger.info(`Fetching subscriptions for device: ${deviceId}`);

  try {
    // Verify the device exists before fetching subscriptions
    const device = await getDeviceById(deviceId);
    if (!device) {
      logger.warn(`Device not found with ID: ${deviceId}`);
      throw new Error(`Device not found with ID: ${deviceId}`);
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { deviceId },
      include: {
        topic: true,
      },
    });

    logger.info(
      `Successfully fetched ${subscriptions.length} subscriptions for device: ${deviceId}`
    );
    return subscriptions;
  } catch (error: any) {
    logger.error(
      `Failed to fetch subscriptions for device: ${deviceId}`,
      error
    );
    throw error;
  }
};

export const getSubscriptionById = async (id: string) => {
  logger.info(`Fetching subscription with ID: ${id}`);

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        topic: true,
        device: true,
      },
    });

    if (!subscription) {
      logger.warn(`Subscription not found with ID: ${id}`);
      return null;
    }

    logger.info(`Successfully fetched subscription with ID: ${id}`);
    return subscription;
  } catch (error: any) {
    logger.error(`Failed to fetch subscription with ID: ${id}`, error);
    throw error;
  }
};

export const updateSubscription = async (id: string, qos: number) => {
  logger.info(`Updating subscription with ID: ${id}`);

  try {
    // Verify the subscription exists
    const subscription = await getSubscriptionById(id);
    if (!subscription) {
      logger.warn(`Subscription not found with ID: ${id}`);
      throw new Error(`Subscription not found with ID: ${id}`);
    }

    // Update the subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: {
        qos,
      },
      include: {
        topic: true,
        device: true,
      },
    });

    logger.info(`Successfully updated subscription with ID: ${id}`);
    return updatedSubscription;
  } catch (error: any) {
    logger.error(`Failed to update subscription with ID: ${id}`, error);
    throw error;
  }
};

export const deleteSubscription = async (id: string) => {
  logger.info(`Deleting subscription with ID: ${id}`);

  try {
    // Verify the subscription exists
    const subscription = await getSubscriptionById(id);
    if (!subscription) {
      logger.warn(`Subscription not found with ID: ${id}`);
      throw new Error(`Subscription not found with ID: ${id}`);
    }

    // Delete the subscription
    await prisma.subscription.delete({
      where: { id },
    });

    logger.info(`Successfully deleted subscription with ID: ${id}`);
    return { id };
  } catch (error: any) {
    logger.error(`Failed to delete subscription with ID: ${id}`, error);
    throw error;
  }
};

/**
 * Expose the getOrCreateTopic function for use by other services
 */
export { getOrCreateTopic };
