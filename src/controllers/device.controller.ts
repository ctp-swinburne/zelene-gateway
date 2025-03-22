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
      return { success: true, data: device };
    } catch (error: any) {
      logger.error("Failed to create device", error);
      throw error;
    }
  },

  async getDeviceById(id: string) {
    logger.info(`Handling request to get device with ID: ${id}`);

    try {
      const device = await getDeviceById(id);

      if (!device) {
        logger.warn(`Device not found with ID: ${id}`);
        return null;
      }

      logger.info(`Successfully fetched device with ID: ${id}`);
      return device;
    } catch (error: any) {
      logger.error(`Failed to fetch device with ID: ${id}`, error);
      throw error;
    }
  },

  async getAllDevices() {
    logger.info("Handling request to get all devices");

    try {
      const devices = await getAllDevices();
      logger.info(`Successfully fetched ${devices.length} devices`);
      return { success: true, data: devices };
    } catch (error: any) {
      logger.error("Failed to fetch all devices", error);
      throw error;
    }
  },

  async updateDevice(id: string, body: Partial<DeviceDto>) {
    logger.info(`Handling request to update device with ID: ${id}`);

    try {
      const device = await updateDevice(id, body);
      logger.info(`Device updated successfully with ID: ${id}`);
      return { success: true, data: device };
    } catch (error: any) {
      logger.error(`Failed to update device with ID: ${id}`, error);
      throw error;
    }
  },

  async deleteDevice(id: string) {
    logger.info(`Handling request to delete device with ID: ${id}`);

    try {
      const result = await deleteDevice(id);
      logger.info(`Device deleted successfully with ID: ${id}`);
      return { success: true, data: result };
    } catch (error: any) {
      logger.error(`Failed to delete device with ID: ${id}`, error);
      throw error;
    }
  },
};
