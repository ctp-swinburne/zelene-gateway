// src/controllers/publication.controller.ts
import {
  publishToTopic,
  schedulePublication,
  getDeviceScheduledPublications,
  cancelScheduledPublication,
  processScheduledPublications,
  updateScheduledPublication,
  getScheduledPublicationById,
  getAllScheduledPublications,
} from "../services/publication.service";
import { createLogger } from "../utils/logger";
import { PublicationDto, ScheduledPublicationDto } from "../types/mqtt";

const logger = createLogger("PublicationController");

export const publicationController = {
  async publishToTopic(body: PublicationDto) {
    logger.info(
      `Handling request to publish to topic: ${body.topicPath} from device: ${body.deviceId}`
    );

    try {
      const message = await publishToTopic(body);
      logger.info(`Message published successfully to topic: ${body.topicPath}`);
      return { success: true, data: message };
    } catch (error: any) {
      logger.error(`Failed to publish to topic: ${body.topicPath}`, error);
      throw error;
    }
  },

  async schedulePublication(body: ScheduledPublicationDto) {
    logger.info(
      `Handling request to schedule publication to topic: ${body.topicPath} from device: ${body.deviceId}`
    );

    try {
      const scheduledPublication = await schedulePublication(body);
      logger.info(
        `Publication scheduled successfully for topic: ${body.topicPath} at: ${body.scheduledTime}`
      );
      return { success: true, data: scheduledPublication };
    } catch (error: any) {
      logger.error(
        `Failed to schedule publication to topic: ${body.topicPath}`,
        error
      );
      throw error;
    }
  },

  async updateScheduledPublication(
    id: string,
    updateData: Partial<ScheduledPublicationDto>
  ) {
    logger.info(
      `Handling request to update scheduled publication with ID: ${id}`
    );

    try {
      const updatedPublication = await updateScheduledPublication(
        id,
        updateData
      );
      logger.info(`Successfully updated scheduled publication with ID: ${id}`);
      return { success: true, data: updatedPublication };
    } catch (error: any) {
      logger.error(
        `Failed to update scheduled publication with ID: ${id}`,
        error
      );
      throw error;
    }
  },

  async getScheduledPublicationById(id: string) {
    logger.info(`Handling request to get scheduled publication with ID: ${id}`);

    try {
      const publication = await getScheduledPublicationById(id);

      if (!publication) {
        logger.warn(`Scheduled publication not found with ID: ${id}`);
        return null;
      }

      logger.info(`Successfully fetched scheduled publication with ID: ${id}`);
      return { success: true, data: publication };
    } catch (error: any) {
      logger.error(
        `Failed to fetch scheduled publication with ID: ${id}`,
        error
      );
      throw error;
    }
  },

  async getAllScheduledPublications(status?: string) {
    logger.info(
      `Handling request to get all scheduled publications${
        status ? ` with status: ${status}` : ""
      }`
    );

    try {
      const publications = await getAllScheduledPublications(status);
      logger.info(
        `Successfully fetched ${publications.length} scheduled publications`
      );
      return { success: true, data: publications };
    } catch (error: any) {
      logger.error(`Failed to fetch scheduled publications`, error);
      throw error;
    }
  },

  async getDeviceScheduledPublications(deviceId: string) {
    logger.info(
      `Handling request to get scheduled publications for device: ${deviceId}`
    );

    try {
      const scheduledPublications = await getDeviceScheduledPublications(
        deviceId
      );
      logger.info(
        `Successfully fetched ${scheduledPublications.length} scheduled publications for device: ${deviceId}`
      );
      return { success: true, data: scheduledPublications };
    } catch (error: any) {
      logger.error(
        `Failed to fetch scheduled publications for device: ${deviceId}`,
        error
      );
      throw error;
    }
  },

  async cancelScheduledPublication(id: string) {
    logger.info(
      `Handling request to cancel scheduled publication with ID: ${id}`
    );

    try {
      const cancelledPublication = await cancelScheduledPublication(id);
      logger.info(
        `Successfully cancelled scheduled publication with ID: ${id}`
      );
      return { success: true, data: cancelledPublication };
    } catch (error: any) {
      logger.error(
        `Failed to cancel scheduled publication with ID: ${id}`,
        error
      );
      throw error;
    }
  },

  async processScheduledPublications() {
    logger.info(`Handling request to process due scheduled publications`);

    try {
      const processedCount = await processScheduledPublications();
      logger.info(
        `Successfully processed ${processedCount} scheduled publications`
      );
      return { success: true, data: { processedCount } };
    } catch (error: any) {
      logger.error(`Failed to process scheduled publications`, error);
      throw error;
    }
  },
};
