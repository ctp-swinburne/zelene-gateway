// src/services/publication.service.ts
import { PrismaClient } from "@prisma/client";
import {
  PublicationDto,
  MqttMessage,
  ScheduledPublicationDto,
} from "../types/mqtt";
import { createLogger } from "../utils/logger";
import { getDeviceById } from "./device.service";
import {
  getDeviceSubscriptions,
  getOrCreateTopic,
} from "./subscription.service";
import { matchTopic } from "../utils/mqtt-pattern";

const prisma = new PrismaClient();
const logger = createLogger("PublicationService");

// In-memory message bus for subscribers
// In a real-world scenario, this would be replaced with an actual MQTT broker
type MessageCallback = (message: MqttMessage) => void;
const subscribers: Map<string, MessageCallback[]> = new Map();

/**
 * Subscribe to message notifications
 * @param clientId A unique identifier for the subscriber
 * @param callback Function to call when a matching message is published
 */
export const subscribeToMessages = (
  clientId: string,
  callback: MessageCallback
) => {
  if (!subscribers.has(clientId)) {
    subscribers.set(clientId, []);
  }
  subscribers.get(clientId)?.push(callback);
  logger.info(`Client ${clientId} subscribed to message notifications`);
};

/**
 * Unsubscribe from message notifications
 * @param clientId The client ID to unsubscribe
 */
export const unsubscribeFromMessages = (clientId: string) => {
  subscribers.delete(clientId);
  logger.info(`Client ${clientId} unsubscribed from message notifications`);
};

/**
 * Publish a message to a topic
 * @param publicationData Data for the publication
 * @returns The published message
 */
export const publishToTopic = async (publicationData: PublicationDto) => {
  logger.info(
    `Publishing message from device: ${publicationData.deviceId} to topic: ${publicationData.topicPath}`
  );

  try {
    // Verify the device exists before publishing
    const device = await getDeviceById(publicationData.deviceId);
    if (!device) {
      logger.warn(`Device not found with ID: ${publicationData.deviceId}`);
      throw new Error(`Device not found with ID: ${publicationData.deviceId}`);
    }

    // Check if this is a scheduled publication
    if (publicationData.scheduleTime) {
      return await schedulePublication({
        deviceId: publicationData.deviceId,
        topicPath: publicationData.topicPath,
        payload: publicationData.payload,
        qos: publicationData.qos,
        retain: publicationData.retain,
        scheduledTime: publicationData.scheduleTime,
      });
    }

    // Get or create the topic
    const topic = await getOrCreateTopic(publicationData.topicPath);

    // Check if topic is public for publishing
    if (!topic.isPublic) {
      logger.warn(
        `Topic is not public for publishing: ${publicationData.topicPath}`
      );
      throw new Error(
        `Topic is not public for publishing: ${publicationData.topicPath}`
      );
    }

    // Create the publication record
    const publication = await prisma.publication.create({
      data: {
        deviceId: publicationData.deviceId,
        topicId: topic.id,
        payload: publicationData.payload,
        qos: publicationData.qos || 0,
        retain: publicationData.retain || false,
      },
      include: {
        topic: true,
      },
    });

    // Create the message object
    const message: MqttMessage = {
      topic: topic.topicPath,
      payload: publicationData.payload,
      qos: publicationData.qos || 0,
      retain: publicationData.retain || false,
      deviceId: publicationData.deviceId,
      timestamp: new Date(),
    };

    // Deliver to all matching subscriptions
    await deliverMessageToSubscribers(message);

    // Notify all in-memory subscribers
    notifySubscribers(message);

    logger.info(
      `Successfully published message to topic: ${publicationData.topicPath}`
    );
    return publication;
  } catch (error: any) {
    logger.error(
      `Failed to publish message to topic: ${publicationData.topicPath}`,
      error
    );
    throw error;
  }
};

/**
 * Schedule a publication for future delivery
 * @param scheduledPublicationData Data for the scheduled publication
 * @returns The scheduled publication record
 */
export const schedulePublication = async (
  scheduledPublicationData: ScheduledPublicationDto
) => {
  logger.info(
    `Scheduling publication from device: ${scheduledPublicationData.deviceId} to topic: ${scheduledPublicationData.topicPath} at: ${scheduledPublicationData.scheduledTime}`
  );

  try {
    // Verify the device exists
    const device = await getDeviceById(scheduledPublicationData.deviceId);
    if (!device) {
      logger.warn(
        `Device not found with ID: ${scheduledPublicationData.deviceId}`
      );
      throw new Error(
        `Device not found with ID: ${scheduledPublicationData.deviceId}`
      );
    }

    // Get or create the topic
    const topic = await getOrCreateTopic(scheduledPublicationData.topicPath);

    // Check if topic is public for publishing
    if (!topic.isPublic) {
      logger.warn(
        `Topic is not public for publishing: ${scheduledPublicationData.topicPath}`
      );
      throw new Error(
        `Topic is not public for publishing: ${scheduledPublicationData.topicPath}`
      );
    }

    // Parse the scheduled time
    const scheduledTime = new Date(scheduledPublicationData.scheduledTime);

    if (isNaN(scheduledTime.getTime())) {
      logger.warn(
        `Invalid scheduled time: ${scheduledPublicationData.scheduledTime}`
      );
      throw new Error(
        `Invalid scheduled time: ${scheduledPublicationData.scheduledTime}`
      );
    }

    // Create or update the scheduled publication
    let scheduledPublication;

    if (scheduledPublicationData.id) {
      // Update existing scheduled publication
      scheduledPublication = await prisma.scheduledPublication.update({
        where: { id: scheduledPublicationData.id },
        data: {
          deviceId: scheduledPublicationData.deviceId,
          topicId: topic.id,
          payload: scheduledPublicationData.payload,
          qos: scheduledPublicationData.qos || 0,
          retain: scheduledPublicationData.retain || false,
          scheduledTime,
          status: "PENDING",
          publishedAt: null,
        },
        include: {
          topic: true,
        },
      });

      logger.info(
        `Updated scheduled publication with ID: ${scheduledPublication.id}`
      );
    } else {
      // Create new scheduled publication
      scheduledPublication = await prisma.scheduledPublication.create({
        data: {
          deviceId: scheduledPublicationData.deviceId,
          topicId: topic.id,
          payload: scheduledPublicationData.payload,
          qos: scheduledPublicationData.qos || 0,
          retain: scheduledPublicationData.retain || false,
          scheduledTime,
        },
        include: {
          topic: true,
        },
      });

      logger.info(
        `Created scheduled publication with ID: ${scheduledPublication.id}`
      );
    }

    return scheduledPublication;
  } catch (error: any) {
    logger.error(
      `Failed to schedule publication to topic: ${scheduledPublicationData.topicPath}`,
      error
    );
    throw error;
  }
};

/**
 * Update a scheduled publication
 * @param id The scheduled publication ID
 * @param updateData Data to update
 * @returns The updated scheduled publication
 */
export const updateScheduledPublication = async (
  id: string,
  updateData: Partial<ScheduledPublicationDto>
) => {
  logger.info(`Updating scheduled publication with ID: ${id}`);

  try {
    // Check if the scheduled publication exists
    const existingPublication = await prisma.scheduledPublication.findUnique({
      where: { id },
      include: { topic: true },
    });

    if (!existingPublication) {
      logger.warn(`Scheduled publication not found with ID: ${id}`);
      throw new Error(`Scheduled publication not found with ID: ${id}`);
    }

    // Check if it's already published
    if (existingPublication.status === "PUBLISHED") {
      logger.warn(`Cannot update already published message with ID: ${id}`);
      throw new Error(`Cannot update already published message with ID: ${id}`);
    }

    // Prepare update data
    const updatePayload: any = {};

    // Handle topic path change if provided
    let topicId = existingPublication.topicId;
    if (
      updateData.topicPath &&
      updateData.topicPath !== existingPublication.topic.topicPath
    ) {
      // Get or create the new topic
      const newTopic = await getOrCreateTopic(updateData.topicPath);
      topicId = newTopic.id;
      updatePayload.topicId = topicId;

      // Check if the new topic allows publications
      if (!newTopic.isPublic) {
        logger.warn(
          `Topic is not public for publishing: ${updateData.topicPath}`
        );
        throw new Error(
          `Topic is not public for publishing: ${updateData.topicPath}`
        );
      }
    }

    // Handle payload update if provided
    if (updateData.payload !== undefined) {
      updatePayload.payload = updateData.payload;
    }

    // Handle QoS update if provided
    if (updateData.qos !== undefined) {
      updatePayload.qos = updateData.qos;
    }

    // Handle retain flag update if provided
    if (updateData.retain !== undefined) {
      updatePayload.retain = updateData.retain;
    }

    // Handle scheduled time update if provided
    if (updateData.scheduledTime) {
      const scheduledTime = new Date(updateData.scheduledTime);

      if (isNaN(scheduledTime.getTime())) {
        logger.warn(`Invalid scheduled time: ${updateData.scheduledTime}`);
        throw new Error(`Invalid scheduled time: ${updateData.scheduledTime}`);
      }

      updatePayload.scheduledTime = scheduledTime;
    }

    // Update the scheduled publication
    const updatedPublication = await prisma.scheduledPublication.update({
      where: { id },
      data: updatePayload,
      include: {
        topic: true,
        device: true,
      },
    });

    logger.info(`Successfully updated scheduled publication with ID: ${id}`);
    return updatedPublication;
  } catch (error: any) {
    logger.error(
      `Failed to update scheduled publication with ID: ${id}`,
      error
    );
    throw error;
  }
};

/**
 * Get all scheduled publications (with optional filtering)
 * @param status Optional status filter
 * @returns Array of scheduled publications
 */
export const getAllScheduledPublications = async (status?: string) => {
  logger.info(
    `Fetching all scheduled publications${
      status ? ` with status: ${status}` : ""
    }`
  );

  try {
    const filter = status ? { status } : {};

    const scheduledPublications = await prisma.scheduledPublication.findMany({
      where: filter,
      include: {
        topic: true,
        device: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: {
        scheduledTime: "asc",
      },
    });

    logger.info(
      `Successfully fetched ${scheduledPublications.length} scheduled publications`
    );
    return scheduledPublications;
  } catch (error: any) {
    logger.error(`Failed to fetch scheduled publications`, error);
    throw error;
  }
};

/**
 * Get a scheduled publication by ID
 * @param id The scheduled publication ID
 * @returns The scheduled publication or null if not found
 */
export const getScheduledPublicationById = async (id: string) => {
  logger.info(`Fetching scheduled publication with ID: ${id}`);

  try {
    const scheduledPublication = await prisma.scheduledPublication.findUnique({
      where: { id },
      include: {
        topic: true,
        device: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!scheduledPublication) {
      logger.warn(`Scheduled publication not found with ID: ${id}`);
      return null;
    }

    logger.info(`Successfully fetched scheduled publication with ID: ${id}`);
    return scheduledPublication;
  } catch (error: any) {
    logger.error(`Failed to fetch scheduled publication with ID: ${id}`, error);
    throw error;
  }
};

/**
 * Get all scheduled publications for a device
 * @param deviceId The device ID
 * @returns Array of scheduled publications
 */
export const getDeviceScheduledPublications = async (deviceId: string) => {
  logger.info(`Fetching scheduled publications for device: ${deviceId}`);

  try {
    // Verify the device exists
    const device = await getDeviceById(deviceId);
    if (!device) {
      logger.warn(`Device not found with ID: ${deviceId}`);
      throw new Error(`Device not found with ID: ${deviceId}`);
    }

    const scheduledPublications = await prisma.scheduledPublication.findMany({
      where: { deviceId },
      include: {
        topic: true,
      },
      orderBy: {
        scheduledTime: "asc",
      },
    });

    logger.info(
      `Successfully fetched ${scheduledPublications.length} scheduled publications for device: ${deviceId}`
    );
    return scheduledPublications;
  } catch (error: any) {
    logger.error(
      `Failed to fetch scheduled publications for device: ${deviceId}`,
      error
    );
    throw error;
  }
};

/**
 * Cancel a scheduled publication
 * @param id The scheduled publication ID
 * @returns The cancelled publication
 */
export const cancelScheduledPublication = async (id: string) => {
  logger.info(`Canceling scheduled publication with ID: ${id}`);

  try {
    const scheduledPublication = await prisma.scheduledPublication.findUnique({
      where: { id },
    });

    if (!scheduledPublication) {
      logger.warn(`Scheduled publication not found with ID: ${id}`);
      throw new Error(`Scheduled publication not found with ID: ${id}`);
    }

    // Only cancel if not already published
    if (scheduledPublication.status === "PUBLISHED") {
      logger.warn(`Cannot cancel already published message with ID: ${id}`);
      throw new Error(`Cannot cancel already published message with ID: ${id}`);
    }

    // Update the status to cancelled
    const cancelledPublication = await prisma.scheduledPublication.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
      include: {
        topic: true,
      },
    });

    logger.info(`Successfully cancelled scheduled publication with ID: ${id}`);
    return cancelledPublication;
  } catch (error: any) {
    logger.error(
      `Failed to cancel scheduled publication with ID: ${id}`,
      error
    );
    throw error;
  }
};

/**
 * Process due scheduled publications
 * This would typically be called by a job scheduler/cron
 */
export const processScheduledPublications = async () => {
  logger.info("Processing scheduled publications");

  try {
    const now = new Date();

    // Find all due publications
    const duePublications = await prisma.scheduledPublication.findMany({
      where: {
        scheduledTime: {
          lte: now,
        },
        status: "PENDING",
      },
      include: {
        topic: true,
      },
    });

    logger.info(`Found ${duePublications.length} due publications to process`);

    // Publish each due message
    for (const publication of duePublications) {
      try {
        // Create the message object
        const message: MqttMessage = {
          topic: publication.topic.topicPath,
          payload: publication.payload,
          qos: publication.qos,
          retain: publication.retain,
          deviceId: publication.deviceId,
          timestamp: now,
        };

        // Deliver to subscribers
        await deliverMessageToSubscribers(message);

        // Notify in-memory subscribers
        notifySubscribers(message);

        // Update the publication status
        await prisma.scheduledPublication.update({
          where: { id: publication.id },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
          },
        });

        logger.info(
          `Successfully published scheduled message: ${publication.id}`
        );
      } catch (error: any) {
        logger.error(
          `Failed to publish scheduled message: ${publication.id}`,
          error
        );

        // Mark as failed
        await prisma.scheduledPublication.update({
          where: { id: publication.id },
          data: {
            status: "FAILED",
          },
        });
      }
    }

    return duePublications.length;
  } catch (error: any) {
    logger.error("Failed to process scheduled publications", error);
    throw error;
  }
};

/**
 * Deliver a message to all relevant device subscriptions
 * This simulates what an MQTT broker would do
 */
async function deliverMessageToSubscribers(message: MqttMessage) {
  try {
    // Get all devices with subscriptions
    const allDevices = await prisma.device.findMany({
      select: { id: true },
    });

    // Check each device's subscriptions for matches
    for (const device of allDevices) {
      const subscriptions = await getDeviceSubscriptions(device.id);

      // Check if any subscription matches the published topic
      for (const subscription of subscriptions) {
        if (matchTopic(subscription.topic.topicPath, message.topic)) {
          logger.info(
            `Message delivered to device: ${device.id} subscribed to: ${subscription.topic.topicPath}`
          );

          // In a real system, this would actually deliver the message to the device
          // For now, just log it
        }
      }
    }
  } catch (error: any) {
    logger.error("Error delivering message to subscribers", error);
  }
}

/**
 * Notify all in-memory subscribers
 */
function notifySubscribers(message: MqttMessage) {
  subscribers.forEach((callbacks, clientId) => {
    callbacks.forEach((callback) => {
      try {
        callback(message);
      } catch (error: any) {
        logger.error(`Error notifying client ${clientId}`, error);
      }
    });
  });
}
