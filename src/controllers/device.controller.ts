// src/controllers/device.controller.ts
import { createDevice, getDeviceById } from "../services/device.service";
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
};
