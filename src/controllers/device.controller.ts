// src/controllers/device.controller.ts
import {
  createDevice,
  getDeviceById,
  getAllDevices,
  updateDevice,
  deleteDevice,
} from "../services/device.service";
import { createLogger } from "../utils/logger";
import { DeviceDto } from "../types/mqtt";

const logger = createLogger("DeviceController");

export const deviceController = {
  async createDevice(body: DeviceDto) {
    logger.info("Handling request to create a new device");

    try {
      const device = await createDevice(body);
      logger.info(`Device created successfully with ID: ${device.id}`);
      return { success: true, data: device, statusCode: 201 };
    } catch (error: any) {
      logger.error("Failed to create device", error);

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message?.toLowerCase().includes("already exists")) {
        statusCode = 409; // Conflict
      }

      return {
        success: false,
        error: error.message || "Failed to create device",
        statusCode,
      };
    }
  },

  async getDeviceById(id: string) {
    logger.info(`Handling request to get device with ID: ${id}`);

    try {
      const device = await getDeviceById(id);

      if (!device) {
        logger.warn(`Device not found with ID: ${id}`);
        return {
          success: false,
          error: "Device not found",
          statusCode: 404,
        };
      }

      logger.info(`Successfully fetched device with ID: ${id}`);
      return { success: true, data: device, statusCode: 200 };
    } catch (error: any) {
      logger.error(`Failed to fetch device with ID: ${id}`, error);
      return {
        success: false,
        error: error.message || "Failed to fetch device",
        statusCode: 500,
      };
    }
  },

  async getAllDevices() {
    logger.info("Handling request to get all devices");

    try {
      const devices = await getAllDevices();
      logger.info(`Successfully fetched ${devices.length} devices`);
      return { success: true, data: devices, statusCode: 200 };
    } catch (error: any) {
      logger.error("Failed to fetch all devices", error);
      return {
        success: false,
        error: error.message || "Failed to fetch all devices",
        statusCode: 500,
      };
    }
  },

  async updateDevice(id: string, body: Partial<DeviceDto>) {
    logger.info(`Handling request to update device with ID: ${id}`);

    try {
      // First check if the device exists
      const existingDevice = await getDeviceById(id);
      if (!existingDevice) {
        logger.warn(`Device not found with ID: ${id}`);
        return {
          success: false,
          error: "Device not found",
          statusCode: 404,
        };
      }

      const device = await updateDevice(id, body);
      logger.info(`Device updated successfully with ID: ${id}`);
      return { success: true, data: device, statusCode: 200 };
    } catch (error: any) {
      logger.error(`Failed to update device with ID: ${id}`, error);

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message?.toLowerCase().includes("already exists")) {
        statusCode = 409; // Conflict
      }

      return {
        success: false,
        error: error.message || "Failed to update device",
        statusCode,
      };
    }
  },

  async deleteDevice(id: string) {
    logger.info(`Handling request to delete device with ID: ${id}`);

    try {
      // First check if the device exists
      const existingDevice = await getDeviceById(id);
      if (!existingDevice) {
        logger.warn(`Device not found with ID: ${id}`);
        return {
          success: false,
          error: "Device not found",
          statusCode: 404,
        };
      }

      const result = await deleteDevice(id);
      logger.info(`Device deleted successfully with ID: ${id}`);
      return { success: true, data: result, statusCode: 200 };
    } catch (error: any) {
      logger.error(`Failed to delete device with ID: ${id}`, error);
      return {
        success: false,
        error: error.message || "Failed to delete device",
        statusCode: 500,
      };
    }
  },
};
