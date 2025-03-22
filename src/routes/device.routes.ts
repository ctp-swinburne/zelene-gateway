// src/routes/device.routes.ts
import { Elysia, t } from "elysia";
import { deviceController } from "../controllers/device.controller";
import { createLogger } from "../utils/logger";
import { DeviceSchema, ApiResponse } from "../types/mqtt";

const logger = createLogger("DeviceRoutes");

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
  );
