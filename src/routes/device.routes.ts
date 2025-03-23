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

// Parameter schema with additional validation
const IdParamSchema = t.Object({
  id: t.String({
    minLength: 1,
    error: "The device ID field cannot be empty",
  }),
});

export const deviceRoutes = new Elysia({ prefix: "/devices" })
  .post(
    "/",
    async ({ body, set }): Promise<ApiResponse<any>> => {
      logger.info("Received request to create a new device");

      const result = await deviceController.createDevice(body);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
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

      const result = await deviceController.getAllDevices();
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
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

      const result = await deviceController.getDeviceById(id);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: IdParamSchema,
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

      const result = await deviceController.updateDevice(id, body);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: IdParamSchema,
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

      const result = await deviceController.deleteDevice(id);
      set.status = result.statusCode;

      const { success, data, error } = result;
      return { success, data, error };
    },
    {
      params: IdParamSchema,
      detail: {
        tags: ["Devices"],
        summary: "Delete a device",
        description: "Deletes a device and all its associated subscriptions",
      },
    }
  );
