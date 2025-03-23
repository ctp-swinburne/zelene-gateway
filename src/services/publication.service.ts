// src/services/publication.service.ts
import { PrismaClient } from "@prisma/client";
import {
  PublicationDto,
  MqttMessage,
  ScheduledPublicationDto,
} from "../types/mqtt";
import { createLogger } from "../utils/logger";
import { getDeviceById } from "./device.service";
import { getOrCreateTopic } from "./subscription.service";

const prisma = new PrismaClient();
const logger = createLogger("PublicationService");

/**
 * Publish a message to a topic
 * @param publicationData Data for the publication
 * @returns The published message
 */
export const publishToTopic = async (publicationData: PublicationDto) => {
  logger.info(
    `Publishing message from device: ${publicationData.deviceId} to topic: ${publicationData.topicPath}`
  );

  // Validate required fields
  if (!publicationData.deviceId || publicationData.deviceId.trim() === "") {
    logger.warn("Device ID cannot be empty");
    throw new Error("Device ID cannot be empty");
  }

  if (!publicationData.topicPath || publicationData.topicPath.trim() === "") {
    logger.warn("Topic path cannot be empty");
    throw new Error("Topic path cannot be empty");
  }

  if (
    publicationData.payload === undefined ||
    publicationData.payload === null
  ) {
    logger.warn("Payload cannot be empty");
    throw new Error("Payload cannot be empty");
  }

  try {
    // Verify the device exists before publishing
    const device = await getDeviceById(publicationData.deviceId.trim());
    if (!device) {
      logger.warn(`Device not found with ID: ${publicationData.deviceId}`);
      throw new Error(`Device not found with ID: ${publicationData.deviceId}`);
    }

    // Check if this is a scheduled publication
    if (publicationData.scheduleTime) {
      return await schedulePublication({
        deviceId: publicationData.deviceId.trim(),
        topicPath: publicationData.topicPath.trim(),
        payload: publicationData.payload,
        qos: publicationData.qos,
        retain: publicationData.retain,
        scheduledTime: publicationData.scheduleTime,
      });
    }

    // Get or create the topic
    const topic = await getOrCreateTopic(publicationData.topicPath.trim());

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
        deviceId: publicationData.deviceId.trim(),
        topicId: topic.id,
        payload: publicationData.payload,
        qos: publicationData.qos || 0,
        retain: publicationData.retain || false,
      },
      include: {
        topic: true,
      },
    });

    logger.info(
      `Successfully published message to topic: ${publicationData.topicPath}`
    );

    // Only log the publication event, no need to actually deliver to subscribers
    logger.info(
      `Message would be delivered to subscribers of topic: ${topic.topicPath}`
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

  // Validate required fields
  if (
    !scheduledPublicationData.deviceId ||
    scheduledPublicationData.deviceId.trim() === ""
  ) {
    logger.warn("Device ID cannot be empty");
    throw new Error("Device ID cannot be empty");
  }

  if (
    !scheduledPublicationData.topicPath ||
    scheduledPublicationData.topicPath.trim() === ""
  ) {
    logger.warn("Topic path cannot be empty");
    throw new Error("Topic path cannot be empty");
  }

  if (
    scheduledPublicationData.payload === undefined ||
    scheduledPublicationData.payload === null
  ) {
    logger.warn("Payload cannot be empty");
    throw new Error("Payload cannot be empty");
  }

  if (!scheduledPublicationData.scheduledTime) {
    logger.warn("Scheduled time cannot be empty");
    throw new Error("Scheduled time cannot be empty");
  }

  try {
    // Verify the device exists
    const device = await getDeviceById(
      scheduledPublicationData.deviceId.trim()
    );
    if (!device) {
      logger.warn(
        `Device not found with ID: ${scheduledPublicationData.deviceId}`
      );
      throw new Error(
        `Device not found with ID: ${scheduledPublicationData.deviceId}`
      );
    }

    // Get or create the topic
    const topic = await getOrCreateTopic(
      scheduledPublicationData.topicPath.trim()
    );

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
      // Validate ID if provided
      if (scheduledPublicationData.id.trim() === "") {
        logger.warn("Publication ID cannot be empty");
        throw new Error("Publication ID cannot be empty");
      }

      // Check if the scheduled publication exists before updating
      const existingPublication = await getScheduledPublicationById(
        scheduledPublicationData.id.trim()
      );
      if (!existingPublication) {
        logger.warn(
          `Scheduled publication not found with ID: ${scheduledPublicationData.id}`
        );
        throw new Error(
          `Scheduled publication not found with ID: ${scheduledPublicationData.id}`
        );
      }

      // Update existing scheduled publication
      try {
        scheduledPublication = await prisma.scheduledPublication.update({
          where: { id: scheduledPublicationData.id.trim() },
          data: {
            deviceId: scheduledPublicationData.deviceId.trim(),
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
      } catch (error: any) {
        // Handle case where publication doesn't exist
        if (error.code === "P2025") {
          logger.warn(
            `Publication update failed: Publication not found with ID: ${scheduledPublicationData.id}`
          );
          throw new Error(
            `Scheduled publication not found with ID: ${scheduledPublicationData.id}`
          );
        }
        throw error;
      }

      logger.info(
        `Updated scheduled publication with ID: ${scheduledPublication.id}`
      );
    } else {
      // Create new scheduled publication
      scheduledPublication = await prisma.scheduledPublication.create({
        data: {
          deviceId: scheduledPublicationData.deviceId.trim(),
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

  // Validate ID
  if (!id || id.trim() === "") {
    logger.warn("Publication ID cannot be empty");
    throw new Error("Publication ID cannot be empty");
  }

  try {
    // Check if the scheduled publication exists
    const existingPublication = await prisma.scheduledPublication.findUnique({
      where: { id: id.trim() },
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
    if (updateData.topicPath !== undefined && updateData.topicPath !== null) {
      // Validate topic path is not empty
      if (updateData.topicPath.trim() === "") {
        logger.warn("Topic path cannot be empty");
        throw new Error("Topic path cannot be empty");
      }

      if (updateData.topicPath.trim() !== existingPublication.topic.topicPath) {
        // Get or create the new topic
        const newTopic = await getOrCreateTopic(updateData.topicPath.trim());
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
    }

    // Handle payload update if provided
    if (updateData.payload !== undefined) {
      // Payload can be empty in some cases
      updatePayload.payload = updateData.payload;
    }

    // Handle QoS update if provided
    if (updateData.qos !== undefined) {
      // Validate QoS
      if (
        typeof updateData.qos !== "number" ||
        updateData.qos < 0 ||
        updateData.qos > 2
      ) {
        logger.warn(`Invalid QoS value: ${updateData.qos}. Must be 0, 1, or 2`);
        throw new Error(
          `Invalid QoS value: ${updateData.qos}. Must be 0, 1, or 2`
        );
      }
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

    // If no valid fields to update, throw error
    if (Object.keys(updatePayload).length === 0) {
      throw new Error("No valid fields to update");
    }

    // Update the scheduled publication
    try {
      const updatedPublication = await prisma.scheduledPublication.update({
        where: { id: id.trim() },
        data: updatePayload,
        include: {
          topic: true,
          device: true,
        },
      });

      logger.info(`Successfully updated scheduled publication with ID: ${id}`);
      return updatedPublication;
    } catch (error: any) {
      // Handle case where publication doesn't exist
      if (error.code === "P2025") {
        logger.warn(
          `Publication update failed: Publication not found with ID: ${id}`
        );
        throw new Error(`Scheduled publication not found with ID: ${id}`);
      }
      throw error;
    }
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
    const filter: any = {};
    if (status) {
      // Validate status
      const validStatuses = ["PENDING", "PUBLISHED", "FAILED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        logger.warn(`Invalid status filter: ${status}`);
        throw new Error(
          `Invalid status filter: ${status}. Valid values are: ${validStatuses.join(
            ", "
          )}`
        );
      }
      filter.status = status;
    }

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

  // Validate ID
  if (!id || id.trim() === "") {
    logger.warn("Publication ID cannot be empty");
    return null;
  }

  try {
    const scheduledPublication = await prisma.scheduledPublication.findUnique({
      where: { id: id.trim() },
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

  // Validate device ID
  if (!deviceId || deviceId.trim() === "") {
    logger.warn("Device ID cannot be empty");
    throw new Error("Device ID cannot be empty");
  }

  try {
    // Verify the device exists
    const device = await getDeviceById(deviceId.trim());
    if (!device) {
      logger.warn(`Device not found with ID: ${deviceId}`);
      throw new Error(`Device not found with ID: ${deviceId}`);
    }

    const scheduledPublications = await prisma.scheduledPublication.findMany({
      where: { deviceId: deviceId.trim() },
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

  // Validate ID
  if (!id || id.trim() === "") {
    logger.warn("Publication ID cannot be empty");
    throw new Error("Publication ID cannot be empty");
  }

  try {
    const scheduledPublication = await prisma.scheduledPublication.findUnique({
      where: { id: id.trim() },
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
    try {
      const cancelledPublication = await prisma.scheduledPublication.update({
        where: { id: id.trim() },
        data: {
          status: "CANCELLED",
        },
        include: {
          topic: true,
        },
      });

      logger.info(
        `Successfully cancelled scheduled publication with ID: ${id}`
      );
      return cancelledPublication;
    } catch (error: any) {
      // Handle case where publication doesn't exist
      if (error.code === "P2025") {
        logger.warn(
          `Publication cancellation failed: Publication not found with ID: ${id}`
        );
        throw new Error(`Scheduled publication not found with ID: ${id}`);
      }
      throw error;
    }
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

    let processedCount = 0;

    // Process each due publication (just mark as published)
    for (const publication of duePublications) {
      try {
        // Log the publication (no actual delivery)
        logger.info(
          `Processing publication: ${publication.id} to topic: ${publication.topic.topicPath}`
        );

        // Update the publication status
        await prisma.scheduledPublication.update({
          where: { id: publication.id },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
          },
        });

        logger.info(
          `Successfully marked scheduled message as published: ${publication.id}`
        );
        processedCount++;
      } catch (error: any) {
        logger.error(
          `Failed to process scheduled message: ${publication.id}`,
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

    return processedCount;
  } catch (error: any) {
    logger.error("Failed to process scheduled publications", error);
    throw error;
  }
};
