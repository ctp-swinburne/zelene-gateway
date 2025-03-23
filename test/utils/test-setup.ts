// test/utils/test-setup.ts
import { PrismaClient } from "@prisma/client";
import { app } from "../../src/app";
import mqtt, { MqttClient } from "mqtt";
import { stopScheduler } from "../../src/services/scheduler.service";
import { disconnectAllDevices } from "../../src/services/mqtt.service";

// Initialize Prisma for test database operations
export const prisma = new PrismaClient();

// Test configuration
export const TEST_CONFIG = {
  API_PORT: 4001,
  API_URL: "http://localhost:4001",
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
};

// Store for test resources to clean up
export const testResources = {
  mqttClient: null as MqttClient | null,
  deviceId: "",
  subscriptionId: "",
  topicPath: "test/mqtt/gateway",
};

/**
 * Start the test server and MQTT client
 */
export async function setupTestEnvironment() {
  console.log("Setting up test environment...");

  // Connect test MQTT client
  testResources.mqttClient = mqtt.connect(TEST_CONFIG.MQTT_BROKER_URL, {
    clientId: `test-client-${Math.random().toString(16).substring(2, 10)}`,
    clean: true,
  });

  // Wait for MQTT connection
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("MQTT connection timeout"));
    }, 5000);

    testResources.mqttClient!.on("connect", () => {
      clearTimeout(timeout);
      console.log("MQTT test client connected");
      resolve();
    });

    testResources.mqttClient!.on("error", (err) => {
      clearTimeout(timeout);
      console.error("MQTT connection error:", err);
      reject(err);
    });
  });
}

/**
 * Clean up test environment
 */
export async function teardownTestEnvironment() {
  console.log("Cleaning up test environment...");

  // Clean up database resources
  await cleanupTestData();

  // Disconnect MQTT client
  if (testResources.mqttClient) {
    await new Promise<void>((resolve) => {
      testResources.mqttClient!.end(false, {}, () => {
        console.log("MQTT test client disconnected");
        resolve();
      });
    });
    testResources.mqttClient = null;
  }

  // Stop the scheduler
  stopScheduler();

  // Disconnect all MQTT connections from the server
  await disconnectAllDevices();

  // Reset resource identifiers
  testResources.deviceId = "";
  testResources.subscriptionId = "";

  // Close Prisma connection
  await prisma.$disconnect();
}

/**
 * Clean up test data from the database
 */
export async function cleanupTestData() {
  console.log("Cleaning up test data...");

  try {
    // Delete test subscriptions if deviceId exists
    if (testResources.deviceId) {
      await prisma.subscription.deleteMany({
        where: { deviceId: testResources.deviceId },
      });
    }

    // Delete test publications
    if (testResources.deviceId) {
      await prisma.publication.deleteMany({
        where: { deviceId: testResources.deviceId },
      });

      await prisma.scheduledPublication.deleteMany({
        where: { deviceId: testResources.deviceId },
      });
    }

    // Delete test device keys and data
    if (testResources.deviceId) {
      await prisma.deviceKey.deleteMany({
        where: { deviceId: testResources.deviceId },
      });

      await prisma.deviceData.deleteMany({
        where: { deviceId: testResources.deviceId },
      });
    }

    // Delete test device
    if (testResources.deviceId) {
      await prisma.device
        .delete({
          where: { id: testResources.deviceId },
        })
        .catch(() => {
          /* Ignore if not exists */
        });
    }

    // Delete test topic if it exists
    await prisma.topic.deleteMany({
      where: { topicPath: testResources.topicPath },
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

/**
 * Utility to make API requests using Elysia's fetch method
 */
export async function makeRequest(method: string, path: string, body?: any) {
  const request: Request = new Request(`${TEST_CONFIG.API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Use app.handle to process the request without starting a server
  const response = await app.handle(request);

  let data;
  try {
    data = await response.json();
  } catch (error) {
    data = await response.text();
  }

  return {
    status: response.status,
    data,
  };
}

/**
 * Utility to wait for a specific amount of time
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
