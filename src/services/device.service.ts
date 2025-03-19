// src/services/device.service.ts
import { PrismaClient } from "@prisma/client";
import { DeviceDto } from "../types/mqtt";
import { createLogger } from "../utils/logger";

const prisma = new PrismaClient();
const logger = createLogger("DeviceService");

export const createDevice = async (deviceData: DeviceDto) => {
  logger.info(`Creating new device: ${deviceData.name}`);

  try {
    const device = await prisma.device.create({
      data: {
        name: deviceData.name,
        username: deviceData.username,
        password: deviceData.password,
        description: deviceData.description,
      },
    });

    logger.info(`Successfully created device with ID: ${device.id}`);
    return device;
  } catch (error: any) {
    // Check for specific Prisma errors
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0] || "field";
      logger.warn(`Device creation failed: ${field} already exists`);
      throw new Error(`A device with this ${field} already exists`);
    }

    logger.error(`Failed to create device: ${deviceData.name}`, error);
    throw error;
  }
};

export const getDeviceById = async (id: string) => {
  logger.info(`Fetching device with ID: ${id}`);

  try {
    const device = await prisma.device.findUnique({
      where: { id },
    });

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
};
