// src/routes/device.routes.ts
import { Elysia, t } from "elysia";
import { deviceController } from "../controllers/device.controller";
import { createLogger } from "../utils/logger";
import { DeviceSchema, ApiResponse } from "../types/mqtt";

const logger = createLogger("DeviceRoutes");

// Partial device schema for updates (all fields optional)
const DeviceUpdateSchema = t.Object({
  name: t.Optional(t.String()),
  username: t.Optional(t.String()),
  password: t.Optional(t.String()),
  description: t.Optional(t.String()),
});

export const deviceRoutes = new Elysia({ prefix: "/devices" })
  .post(
    "/",
    async ({ body, set }): Promise<ApiResponse<any>> => {
      logger.info("Received request to create a new device");

      try {
        const result = await deviceController.createDevice(body);
        return { success: true, data: result };
      } catch (error: any) {
        logger.error("Error processing create device request", error);

        // Set appropriate status code based on error type
        if (error.message.includes("already exists")) {
          set.status = 409; // Conflict
        } else {
          set.status = 500; // Internal Server Error
        }

        return {
          success: false,
          error: error.message || "Failed to create device",
        };
      }
    },
    {
      body: DeviceSchema,
      detail: {
        tags: ["Devices"],
        summary: "Create a new device",
        description: "Creates a new device with MQTT credentials",
      },
    }
  )
  .get(
    "/",
    async ({ set }): Promise<ApiResponse<any>> => {
      logger.info("Received request to get all devices");

      try {
        const result = await deviceController.getAllDevices();
        return { success: true, data: result };
      } catch (error: any) {
        logger.error("Error processing get all devices request", error);
        set.status = 500;
        return {
          success: false,
          error: error.message || "Failed to fetch devices",
        };
      }
    },
    {
      detail: {
        tags: ["Devices"],
        summary: "Get all devices",
        description: "Retrieves a list of all devices",
      },
    }
  )
  .get(
    "/:id",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(`Received request to get device with ID: ${id}`);

      try {
        const device = await deviceController.getDeviceById(id);

        if (!device) {
          logger.warn(`Device not found with ID: ${id}`);
          set.status = 404;
          return { success: false, error: "Device not found" };
        }

        return { success: true, data: device };
      } catch (error: any) {
        logger.error(
          `Error processing get device request for ID: ${id}`,
          error
        );
        set.status = 500;
        return {
          success: false,
          error: error.message || "Failed to fetch device",
        };
      }
    },
    {
      params: t.Object({
        id: t.String({
          minLength: 1,
          error: "The device ID field cannot be empty",
        }),
      }),
      detail: {
        tags: ["Devices"],
        summary: "Get device by ID",
        description: "Retrieves device details by its unique identifier",
      },
    }
  )
  .put(
    "/:id",
    async ({ params, body, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(`Received request to update device with ID: ${id}`);

      try {
        const result = await deviceController.updateDevice(id, body);
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing update device request for ID: ${id}`,
          error
        );

        // Set appropriate status code based on error type
        if (error.message.includes("not found")) {
          set.status = 404; // Not Found
        } else if (error.message.includes("already exists")) {
          set.status = 409; // Conflict
        } else {
          set.status = 500; // Internal Server Error
        }

        return {
          success: false,
          error: error.message || "Failed to update device",
        };
      }
    },
    {
      params: t.Object({
        id: t.String({
          minLength: 1,
          error: "The device ID field cannot be empty",
        }),
      }),
      body: DeviceUpdateSchema,
      detail: {
        tags: ["Devices"],
        summary: "Update a device",
        description: "Updates an existing device's information",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params, set }): Promise<ApiResponse<any>> => {
      const { id } = params;
      logger.info(`Received request to delete device with ID: ${id}`);

      try {
        const result = await deviceController.deleteDevice(id);
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing delete device request for ID: ${id}`,
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
          error: error.message || "Failed to delete device",
        };
      }
    },
    {
      params: t.Object({
        id: t.String({
          minLength: 1,
          error: "The device ID field cannot be empty",
        }),
      }),
      detail: {
        tags: ["Devices"],
        summary: "Delete a device",
        description: "Deletes a device and all its associated subscriptions",
      },
    }
  );
