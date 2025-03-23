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

// Parameter schema with additional validation
const IdParamSchema = t.Object({
  id: t.String({
    minLength: 1,
    error: "The scheduled publication ID field cannot be empty",
  }),
});

const DeviceIdParamSchema = t.Object({
  deviceId: t.String({
    minLength: 1,
    error: "The device ID field cannot be empty",
  }),
});

// Schema for updating scheduled publications
const UpdateScheduledPublicationSchema = t.Object({
  topicPath: t.Optional(t.String()),
  payload: t.Optional(t.String()),
  qos: t.Optional(t.Number()),
  retain: t.Optional(t.Boolean()),
  scheduledTime: t.Optional(t.String()),
});

// Create a subrouter for scheduled publications
const scheduleRoutes = new Elysia()
  .post(
    "/",
    async ({ body, set }): Promise<ApiResponse<any>> => {
      logger.info(
        `Received request to schedule publication to topic: ${body.topicPath} from device: ${body.deviceId}`
      );

      const result = await publicationController.schedulePublication(body);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
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
    "/",
    async ({ query, set }): Promise<ApiResponse<any>> => {
      const { status } = query;
      logger.info(
        `Received request to get all scheduled publications${
          status ? ` with status: ${status}` : ""
        }`
      );

      const result = await publicationController.getAllScheduledPublications(
        status
      );
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
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
  // Important: Define more specific device route before general ID route
  .get(
    "/device/:deviceId",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { deviceId } = params;
      logger.info(
        `Received request to get scheduled publications for device: ${deviceId}`
      );

      const result = await publicationController.getDeviceScheduledPublications(
        deviceId
      );
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: DeviceIdParamSchema,
      detail: {
        tags: ["Publications"],
        summary: "Get device's scheduled publications",
        description:
          "Retrieves all scheduled publications for a specific device",
      },
    }
  )
  .get(
    "/:id",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(
        `Received request to get scheduled publication with ID: ${id}`
      );

      const result = await publicationController.getScheduledPublicationById(
        id
      );
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: IdParamSchema,
      detail: {
        tags: ["Publications"],
        summary: "Get scheduled publication by ID",
        description: "Retrieves a specific scheduled publication by its ID",
      },
    }
  )
  .put(
    "/:id",
    async ({ params, body, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(
        `Received request to update scheduled publication with ID: ${id}`
      );

      const result = await publicationController.updateScheduledPublication(
        id,
        body
      );
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: IdParamSchema,
      body: UpdateScheduledPublicationSchema,
      detail: {
        tags: ["Publications"],
        summary: "Update a scheduled publication",
        description:
          "Updates a previously scheduled publication that has not yet been published",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(
        `Received request to cancel scheduled publication with ID: ${id}`
      );

      const result = await publicationController.cancelScheduledPublication(id);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: IdParamSchema,
      detail: {
        tags: ["Publications"],
        summary: "Cancel a scheduled publication",
        description:
          "Cancels a previously scheduled publication that has not yet been published",
      },
    }
  )
  .post(
    "/process",
    async ({ set }): Promise<ApiResponse<any>> => {
      logger.info("Received request to process due scheduled publications");

      const result = await publicationController.processScheduledPublications();
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
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

// Main publications router
export const publicationRoutes = new Elysia({ prefix: "/publications" })
  .post(
    "/",
    async ({ body, set }): Promise<ApiResponse<any>> => {
      logger.info(
        `Received request to publish to topic: ${body.topicPath} from device: ${body.deviceId}`
      );

      const result = await publicationController.publishToTopic(body);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
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
  // Mount the schedule routes subrouter
  .group("/schedule", (app) => app.use(scheduleRoutes));
