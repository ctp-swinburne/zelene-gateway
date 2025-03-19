// src/services/subscription.service.ts
import { PrismaClient } from "@prisma/client";
import { SubscriptionDto } from "../types/mqtt";
import { createLogger } from "../utils/logger";
import { getOrCreateTopic } from "./topic.service";
import { getDeviceById } from "./device.service";

const prisma = new PrismaClient();
const logger = createLogger("SubscriptionService");

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

    // First ensure the topic exists or create it
    const topic = await getOrCreateTopic({
      topicPath: subscriptionData.topicPath,
    });

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
