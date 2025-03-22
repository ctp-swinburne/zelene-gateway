// src/routes/publication.routes.ts
import { Elysia, t } from "elysia";
import { publicationController } from "../controllers/publication.controller";
import { createLogger } from "../utils/logger";
import {
  PublicationSchema,
  ScheduledPublicationSchema,
  ApiResponse,
} from "../types/mqtt";

const logger = createLogger("PublicationRoutes");

export const publicationRoutes = new Elysia({ prefix: "/publications" })
  .post(
    "/",
    async ({ body, set }): Promise<ApiResponse<any>> => {
      logger.info(
        `Received request to publish to topic: ${body.topicPath} from device: ${body.deviceId}`
      );

      try {
        const result = await publicationController.publishToTopic(body);
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing publish request to topic: ${body.topicPath}`,
          error
        );

        // Set appropriate status code based on error type
        if (error.message.includes("not found")) {
          set.status = 404; // Not Found
        } else if (error.message.includes("not public")) {
          set.status = 403; // Forbidden
        } else {
          set.status = 500; // Internal Server Error
        }

        return {
          success: false,
          error: error.message || "Failed to publish message",
        };
      }
    },
    {
      body: PublicationSchema,
      detail: {
        tags: ["Publications"],
        summary: "Publish a message to a topic",
        description:
          "Publishes a message to a topic from an authenticated device. Can be scheduled for future delivery by providing a scheduleTime parameter.",
      },
    }
  )
  .post(
    "/schedule",
    async ({ body, set }): Promise<ApiResponse<any>> => {
      logger.info(
        `Received request to schedule publication to topic: ${body.topicPath} from device: ${body.deviceId}`
      );

      try {
        const result = await publicationController.schedulePublication(body);
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing schedule publication request to topic: ${body.topicPath}`,
          error
        );

        // Set appropriate status code based on error type
        if (error.message.includes("not found")) {
          set.status = 404; // Not Found
        } else if (error.message.includes("not public")) {
          set.status = 403; // Forbidden
        } else if (error.message.includes("Invalid scheduled time")) {
          set.status = 400; // Bad Request
        } else {
          set.status = 500; // Internal Server Error
        }

        return {
          success: false,
          error: error.message || "Failed to schedule publication",
        };
      }
    },
    {
      body: ScheduledPublicationSchema,
      detail: {
        tags: ["Publications"],
        summary: "Schedule a publication for future delivery",
        description:
          "Schedules a message to be published at a specified time in the future",
      },
    }
  )
  .get(
    "/schedule",
    async ({ query, set }): Promise<ApiResponse<any>> => {
      const { status } = query;
      logger.info(
        `Received request to get all scheduled publications${
          status ? ` with status: ${status}` : ""
        }`
      );

      try {
        const result = await publicationController.getAllScheduledPublications(
          status
        );
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          "Error processing get all scheduled publications request",
          error
        );
        set.status = 500;
        return {
          success: false,
          error: error.message || "Failed to fetch scheduled publications",
        };
      }
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Publications"],
        summary: "Get all scheduled publications",
        description:
          "Retrieves all scheduled publications with optional status filtering",
      },
    }
  )
  .get(
    "/schedule/:id",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(
        `Received request to get scheduled publication with ID: ${id}`
      );

      try {
        const publication =
          await publicationController.getScheduledPublicationById(id);

        if (!publication) {
          logger.warn(`Scheduled publication not found with ID: ${id}`);
          set.status = 404;
          return { success: false, error: "Scheduled publication not found" };
        }

        return { success: true, data: publication };
      } catch (error: any) {
        logger.error(
          `Error processing get scheduled publication request for ID: ${id}`,
          error
        );
        set.status = 500;
        return {
          success: false,
          error: error.message || "Failed to fetch scheduled publication",
        };
      }
    },
    {
      params: t.Object({
        id: t.String({
          minLength: 1,
          error: "The scheduled publication ID field cannot be empty",
        }),
      }),
      detail: {
        tags: ["Publications"],
        summary: "Get scheduled publication by ID",
        description: "Retrieves a specific scheduled publication by its ID",
      },
    }
  )
  .get(
    "/schedule/device/:deviceId",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { deviceId } = params;
      logger.info(
        `Received request to get scheduled publications for device: ${deviceId}`
      );

      try {
        const result =
          await publicationController.getDeviceScheduledPublications(deviceId);
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing get scheduled publications request for device: ${deviceId}`,
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
          error: error.message || "Failed to fetch scheduled publications",
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
        tags: ["Publications"],
        summary: "Get device's scheduled publications",
        description:
          "Retrieves all scheduled publications for a specific device",
      },
    }
  )
  .put(
    "/schedule/:id",
    async ({ params, body, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(
        `Received request to update scheduled publication with ID: ${id}`
      );

      try {
        const result = await publicationController.updateScheduledPublication(
          id,
          body
        );
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing update scheduled publication request for ID: ${id}`,
          error
        );

        // Set appropriate status code based on error type
        if (error.message.includes("not found")) {
          set.status = 404; // Not Found
        } else if (error.message.includes("already published")) {
          set.status = 400; // Bad Request
        } else if (error.message.includes("Invalid scheduled time")) {
          set.status = 400; // Bad Request
        } else {
          set.status = 500; // Internal Server Error
        }

        return {
          success: false,
          error: error.message || "Failed to update scheduled publication",
        };
      }
    },
    {
      params: t.Object({
        id: t.String({
          minLength: 1,
          error: "The scheduled publication ID field cannot be empty",
        }),
      }),
      body: t.Object({
        topicPath: t.Optional(t.String()),
        payload: t.Optional(t.String()),
        qos: t.Optional(t.Number()),
        retain: t.Optional(t.Boolean()),
        scheduledTime: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Publications"],
        summary: "Update a scheduled publication",
        description:
          "Updates a previously scheduled publication that has not yet been published",
      },
    }
  )
  .delete(
    "/schedule/:id",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(
        `Received request to cancel scheduled publication with ID: ${id}`
      );

      try {
        const result = await publicationController.cancelScheduledPublication(
          id
        );
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing cancel scheduled publication request for ID: ${id}`,
          error
        );

        // Set appropriate status code based on error type
        if (error.message.includes("not found")) {
          set.status = 404; // Not Found
        } else if (error.message.includes("Cannot cancel already published")) {
          set.status = 400; // Bad Request
        } else {
          set.status = 500; // Internal Server Error
        }

        return {
          success: false,
          error: error.message || "Failed to cancel scheduled publication",
        };
      }
    },
    {
      params: t.Object({
        id: t.String({
          minLength: 1,
          error: "The scheduled publication ID field cannot be empty",
        }),
      }),
      detail: {
        tags: ["Publications"],
        summary: "Cancel a scheduled publication",
        description:
          "Cancels a previously scheduled publication that has not yet been published",
      },
    }
  )
  .post(
    "/schedule/process",
    async ({ set }): Promise<ApiResponse<any>> => {
      logger.info("Received request to process due scheduled publications");

      try {
        const result =
          await publicationController.processScheduledPublications();
        return { success: true, data: result };
      } catch (error: any) {
        logger.error("Error processing scheduled publications", error);

        set.status = 500; // Internal Server Error

        return {
          success: false,
          error: error.message || "Failed to process scheduled publications",
        };
      }
    },
    {
      detail: {
        tags: ["Publications"],
        summary: "Process due scheduled publications",
        description:
          "Processes all scheduled publications that are due for delivery",
      },
    }
  );
