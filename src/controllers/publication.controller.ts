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
      return { success: true, data: message, statusCode: 200 };
    } catch (error: any) {
      logger.error(`Failed to publish to topic: ${body.topicPath}`, error);

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message?.toLowerCase().includes("not found")) {
        statusCode = 404; // Not Found
      } else if (error.message?.toLowerCase().includes("not public")) {
        statusCode = 403; // Forbidden
      }

      return {
        success: false,
        error: error.message || "Failed to publish to topic",
        statusCode,
      };
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
      return { success: true, data: scheduledPublication, statusCode: 201 };
    } catch (error: any) {
      logger.error(
        `Failed to schedule publication to topic: ${body.topicPath}`,
        error
      );

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message?.toLowerCase().includes("not found")) {
        statusCode = 404; // Not Found
      } else if (error.message?.toLowerCase().includes("not public")) {
        statusCode = 403; // Forbidden
      } else if (
        error.message?.toLowerCase().includes("invalid scheduled time")
      ) {
        statusCode = 400; // Bad Request
      }

      return {
        success: false,
        error: error.message || "Failed to schedule publication",
        statusCode,
      };
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
      // Check if the scheduled publication exists
      const existingPublication = await getScheduledPublicationById(id);
      if (!existingPublication) {
        logger.warn(`Scheduled publication not found with ID: ${id}`);
        return {
          success: false,
          error: "Scheduled publication not found",
          statusCode: 404,
        };
      }

      const updatedPublication = await updateScheduledPublication(
        id,
        updateData
      );
      logger.info(`Successfully updated scheduled publication with ID: ${id}`);
      return { success: true, data: updatedPublication, statusCode: 200 };
    } catch (error: any) {
      logger.error(
        `Failed to update scheduled publication with ID: ${id}`,
        error
      );

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message?.toLowerCase().includes("already published")) {
        statusCode = 400; // Bad Request
      } else if (
        error.message?.toLowerCase().includes("invalid scheduled time")
      ) {
        statusCode = 400; // Bad Request
      }

      return {
        success: false,
        error: error.message || "Failed to update scheduled publication",
        statusCode,
      };
    }
  },

  async getScheduledPublicationById(id: string) {
    logger.info(`Handling request to get scheduled publication with ID: ${id}`);

    try {
      const publication = await getScheduledPublicationById(id);

      if (!publication) {
        logger.warn(`Scheduled publication not found with ID: ${id}`);
        return {
          success: false,
          error: "Scheduled publication not found",
          statusCode: 404,
        };
      }

      logger.info(`Successfully fetched scheduled publication with ID: ${id}`);
      return { success: true, data: publication, statusCode: 200 };
    } catch (error: any) {
      logger.error(
        `Failed to fetch scheduled publication with ID: ${id}`,
        error
      );
      return {
        success: false,
        error: error.message || "Failed to fetch scheduled publication",
        statusCode: 500,
      };
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
      return { success: true, data: publications, statusCode: 200 };
    } catch (error: any) {
      logger.error(`Failed to fetch scheduled publications`, error);
      return {
        success: false,
        error: error.message || "Failed to fetch scheduled publications",
        statusCode: 500,
      };
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
      return { success: true, data: scheduledPublications, statusCode: 200 };
    } catch (error: any) {
      logger.error(
        `Failed to fetch scheduled publications for device: ${deviceId}`,
        error
      );

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message?.toLowerCase().includes("not found")) {
        statusCode = 404; // Not Found
      }

      return {
        success: false,
        error: error.message || "Failed to fetch scheduled publications",
        statusCode,
      };
    }
  },

  async cancelScheduledPublication(id: string) {
    logger.info(
      `Handling request to cancel scheduled publication with ID: ${id}`
    );

    try {
      // Check if the scheduled publication exists
      const existingPublication = await getScheduledPublicationById(id);
      if (!existingPublication) {
        logger.warn(`Scheduled publication not found with ID: ${id}`);
        return {
          success: false,
          error: "Scheduled publication not found",
          statusCode: 404,
        };
      }

      const cancelledPublication = await cancelScheduledPublication(id);
      logger.info(
        `Successfully cancelled scheduled publication with ID: ${id}`
      );
      return { success: true, data: cancelledPublication, statusCode: 200 };
    } catch (error: any) {
      logger.error(
        `Failed to cancel scheduled publication with ID: ${id}`,
        error
      );

      // Determine appropriate status code
      let statusCode = 500;
      if (
        error.message?.toLowerCase().includes("cannot cancel already published")
      ) {
        statusCode = 400; // Bad Request
      }

      return {
        success: false,
        error: error.message || "Failed to cancel scheduled publication",
        statusCode,
      };
    }
  },

  async processScheduledPublications() {
    logger.info(`Handling request to process due scheduled publications`);

    try {
      const processedCount = await processScheduledPublications();
      logger.info(
        `Successfully processed ${processedCount} scheduled publications`
      );
      return { success: true, data: { processedCount }, statusCode: 200 };
    } catch (error: any) {
      logger.error(`Failed to process scheduled publications`, error);
      return {
        success: false,
        error: error.message || "Failed to process scheduled publications",
        statusCode: 500,
      };
    }
  },
};
