// src/services/device.service.ts
import { PrismaClient } from "@prisma/client";
import { DeviceDto } from "../types/mqtt";
import { createLogger } from "../utils/logger";
import { disconnectDevice } from "./mqtt.service";

const prisma = new PrismaClient();
const logger = createLogger("DeviceService");

export const createDevice = async (deviceData: DeviceDto) => {
  logger.info(`Creating new device: ${deviceData.name}`);

  try {
    // Validate required fields
    if (!deviceData.name || deviceData.name.trim() === "") {
      throw new Error("Device name cannot be empty");
    }

    if (!deviceData.username || deviceData.username.trim() === "") {
      throw new Error("Device username cannot be empty");
    }

    if (!deviceData.password || deviceData.password.trim() === "") {
      throw new Error("Device password cannot be empty");
    }

    const device = await prisma.device.create({
      data: {
        name: deviceData.name.trim(),
        username: deviceData.username.trim(),
        password: deviceData.password.trim(),
        description: deviceData.description
          ? deviceData.description.trim()
          : null,
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
    // Validate ID format first
    if (!id || id.trim() === "") {
      logger.warn(`Invalid device ID provided: ${id}`);
      return null;
    }

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

export const getAllDevices = async () => {
  logger.info("Fetching all devices");

  try {
    const devices = await prisma.device.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    logger.info(`Successfully fetched ${devices.length} devices`);
    return devices;
  } catch (error: any) {
    logger.error("Failed to fetch all devices", error);
    throw error;
  }
};

export const updateDevice = async (
  id: string,
  deviceData: Partial<DeviceDto>
) => {
  logger.info(`Updating device with ID: ${id}`);

  try {
    // First check if the device exists
    const existingDevice = await getDeviceById(id);
    if (!existingDevice) {
      logger.warn(`Device not found with ID: ${id}`);
      throw new Error(`Device not found with ID: ${id}`);
    }

    // Only include properties that are actually provided AND not empty strings
    const updateData: any = {};

    if (deviceData.name !== undefined) {
      if (deviceData.name.trim() === "") {
        throw new Error("Device name cannot be empty");
      }
      updateData.name = deviceData.name.trim();
    }

    if (deviceData.username !== undefined) {
      if (deviceData.username.trim() === "") {
        throw new Error("Device username cannot be empty");
      }
      updateData.username = deviceData.username.trim();
    }

    if (deviceData.password !== undefined) {
      if (deviceData.password.trim() === "") {
        throw new Error("Device password cannot be empty");
      }
      updateData.password = deviceData.password.trim();
    }

    if (deviceData.description !== undefined) {
      // Description can be empty (null)
      updateData.description = deviceData.description.trim() || null;
    }

    // If no valid fields to update, throw error
    if (Object.keys(updateData).length === 0) {
      throw new Error("No valid fields to update");
    }

    // Check if username or password is changing
    const credentialsChanged =
      (deviceData.username !== undefined &&
        deviceData.username !== existingDevice.username) ||
      (deviceData.password !== undefined &&
        deviceData.password !== existingDevice.password);

    // Disconnect device if credentials are changing
    if (credentialsChanged) {
      try {
        await disconnectDevice(id);
        logger.info(`Disconnected device: ${id} due to credential change`);
      } catch (mqttError: any) {
        logger.error(
          `Failed to disconnect device with ID: ${id} from MQTT broker`,
          mqttError
        );
        // Continue even if MQTT disconnection fails
      }
    }

    // Update the device in database
    const updatedDevice = await prisma.device.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Successfully updated device with ID: ${id}`);
    return updatedDevice;
  } catch (error: any) {
    // Check for specific Prisma errors
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0] || "field";
      logger.warn(`Device update failed: ${field} already exists`);
      throw new Error(`A device with this ${field} already exists`);
    }

    // Handle case where device doesn't exist
    if (error.code === "P2025") {
      logger.warn(`Device update failed: Device not found with ID: ${id}`);
      throw new Error(`Device not found with ID: ${id}`);
    }

    logger.error(`Failed to update device with ID: ${id}`, error);
    throw error;
  }
};

export const deleteDevice = async (id: string) => {
  logger.info(`Deleting device with ID: ${id}`);

  try {
    // First check if the device exists
    const existingDevice = await getDeviceById(id);
    if (!existingDevice) {
      logger.warn(`Device not found with ID: ${id}`);
      throw new Error(`Device not found with ID: ${id}`);
    }

    // Disconnect device from MQTT
    try {
      await disconnectDevice(id);
      logger.info(`Disconnected device: ${id} before deletion`);
    } catch (mqttError: any) {
      logger.error(
        `Failed to disconnect device with ID: ${id} from MQTT broker`,
        mqttError
      );
      // Continue even if MQTT disconnection fails
    }

    // Delete all subscriptions and scheduled publications first
    // This is needed due to foreign key constraints
    await prisma.$transaction([
      prisma.subscription.deleteMany({
        where: { deviceId: id },
      }),
      prisma.scheduledPublication.deleteMany({
        where: { deviceId: id },
      }),
      prisma.publication.deleteMany({
        where: { deviceId: id },
      }),
      prisma.deviceKey.deleteMany({
        where: { deviceId: id },
      }),
      prisma.deviceData.deleteMany({
        where: { deviceId: id },
      }),
      prisma.device.delete({
        where: { id },
      }),
    ]);

    logger.info(`Successfully deleted device with ID: ${id}`);
    return { id };
  } catch (error: any) {
    // Handle case where device doesn't exist
    if (error.code === "P2025") {
      logger.warn(`Device deletion failed: Device not found with ID: ${id}`);
      throw new Error(`Device not found with ID: ${id}`);
    }

    logger.error(`Failed to delete device with ID: ${id}`, error);
    throw error;
  }
};
