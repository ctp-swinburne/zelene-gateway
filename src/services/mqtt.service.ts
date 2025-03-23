// src/services/mqtt.service.ts
import { PrismaClient } from "@prisma/client";
import { MqttClient } from "mqtt";
import { mqttClientManager } from "../utils/mqtt-client";
import { createLogger } from "../utils/logger";
import { matchTopic } from "../utils/mqtt-pattern";

// Define QoS type to match MQTT package requirements
type QoS = 0 | 1 | 2;

const prisma = new PrismaClient();
const logger = createLogger("MqttService");

/**
 * Get the UNIX timestamp for the beginning of the current month
 * Used for partitioning data
 */
function getCurrentMonthPartition(): bigint {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return BigInt(Math.floor(startOfMonth.getTime() / 1000));
}

/**
 * Try to parse a string as JSON
 * @param str String to parse
 * @returns Parsed object or null if not valid JSON
 */
function tryParseJson(str: string): Record<string, any> | null {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

/**
 * Extract device keys from a JSON object
 * @param json JSON object to extract keys from
 * @returns Array of key objects with name and type
 */
function extractKeysFromJson(
  json: Record<string, any>
): Array<{ name: string; type: string }> {
  const keys: Array<{ name: string; type: string }> = [];

  function processObject(obj: any, prefix: string = "") {
    for (const [key, value] of Object.entries(obj)) {
      const keyName = prefix ? `${prefix}.${key}` : key;
      const valueType = typeof value;

      if (valueType === "object" && value !== null) {
        // If the value is an array, we'll store it as JSON string
        if (Array.isArray(value)) {
          keys.push({ name: keyName, type: "array" });
        } else {
          // For nested objects, process recursively
          processObject(value, keyName);
        }
      } else {
        keys.push({ name: keyName, type: valueType });
      }
    }
  }

  processObject(json);
  return keys;
}

/**
 * Store device keys in database
 * @param deviceId Device ID
 * @param keys Array of keys with name and type
 */
async function storeDeviceKeys(
  deviceId: string,
  keys: Array<{ name: string; type: string }>
) {
  logger.info(`Storing ${keys.length} keys for device: ${deviceId}`);

  try {
    // Create or update keys in database
    for (const key of keys) {
      await prisma.deviceKey.upsert({
        where: {
          deviceId_keyName: {
            deviceId,
            keyName: key.name,
          },
        },
        create: {
          deviceId,
          keyName: key.name,
          keyType: key.type,
        },
        update: {
          keyType: key.type,
        },
      });
    }
    logger.info(`Successfully stored keys for device: ${deviceId}`);
  } catch (error: any) {
    logger.error(`Failed to store keys for device: ${deviceId}`, error);
    throw error;
  }
}

/**
 * Process and store device data
 * @param deviceId Device ID
 * @param topicPath Topic path
 * @param payload Message payload
 */
async function processDeviceData(
  deviceId: string,
  topicPath: string,
  payload: string
) {
  logger.info(
    `Processing data for device: ${deviceId} from topic: ${topicPath}`
  );

  try {
    const partition = getCurrentMonthPartition();
    const jsonData = tryParseJson(payload);

    if (jsonData) {
      // Process JSON data
      logger.info(`Processing JSON data for device: ${deviceId}`);

      // Extract and store keys
      const keys = extractKeysFromJson(jsonData);
      await storeDeviceKeys(deviceId, keys);

      // Store each key-value pair
      for (const key of keys) {
        // Get the value from the nested object
        let value: any = jsonData;
        const keyParts = key.name.split(".");
        for (const part of keyParts) {
          if (value === undefined || value === null) break;
          value = value[part];
        }

        // Skip if value is undefined or null
        if (value === undefined || value === null) continue;

        // Convert value to string based on type
        let stringValue: string;
        if (typeof value === "object") {
          stringValue = JSON.stringify(value);
        } else {
          stringValue = String(value);
        }

        // Get the key ID
        const deviceKey = await prisma.deviceKey.findUnique({
          where: {
            deviceId_keyName: {
              deviceId,
              keyName: key.name,
            },
          },
        });

        if (deviceKey) {
          // Store the data
          await prisma.deviceData.create({
            data: {
              deviceId,
              keyId: deviceKey.id,
              value: stringValue,
              partition,
            },
          });
        }
      }
    } else {
      // Process raw data (non-JSON)
      logger.info(`Processing raw data for device: ${deviceId}`);

      // For non-JSON data, store it directly with the topic as the key
      // First, get or create a key for this topic
      const topicKey = topicPath.replace(/\//g, ".");

      await storeDeviceKeys(deviceId, [{ name: topicKey, type: "string" }]);

      const deviceKey = await prisma.deviceKey.findUnique({
        where: {
          deviceId_keyName: {
            deviceId,
            keyName: topicKey,
          },
        },
      });

      if (deviceKey) {
        // Store the raw data
        await prisma.deviceData.create({
          data: {
            deviceId,
            keyId: deviceKey.id,
            value: payload,
            partition,
          },
        });
      }
    }

    logger.info(`Successfully processed data for device: ${deviceId}`);
  } catch (error: any) {
    logger.error(`Failed to process data for device: ${deviceId}`, error);
    throw error;
  }
}

/**
 * Handle incoming MQTT messages
 * @param deviceId Device ID
 * @param topic Topic the message was received on
 * @param payload Message payload
 */
function handleMessage(deviceId: string, topic: string, payload: Buffer) {
  const payloadStr = payload.toString();

  // Log the incoming message with payload content
  // Truncate large payloads to avoid excessive logs
  const maxPayloadLogLength = 1000;
  const logPayload =
    payloadStr.length <= maxPayloadLogLength
      ? payloadStr
      : payloadStr.substring(0, maxPayloadLogLength) + "... [truncated]";

  logger.info(
    `TELEMETRY: Device: ${deviceId} | Topic: ${topic} | Payload: ${logPayload}`
  );

  try {
    processDeviceData(deviceId, topic, payloadStr).catch((error) => {
      logger.error(`Error processing device data: ${error.message}`);
    });
  } catch (error: any) {
    logger.error(
      `Failed to handle MQTT message for device: ${deviceId}`,
      error
    );
  }
}

/**
 * Subscribe a device to an MQTT topic
 * @param deviceId Device ID
 * @param topicPath Topic to subscribe to
 * @param qos QoS level
 */
export async function subscribeToTopic(
  deviceId: string,
  topicPath: string,
  qos: QoS = 0
) {
  logger.info(`Subscribing device: ${deviceId} to topic: ${topicPath}`);

  try {
    // Get device credentials
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      logger.warn(`Device not found with ID: ${deviceId}`);
      throw new Error(`Device not found with ID: ${deviceId}`);
    }

    // Get MQTT broker URL from environment
    const brokerUrl = process.env.MQTT_BROKER_URL;
    if (!brokerUrl) {
      logger.error("MQTT broker URL not configured");
      throw new Error("MQTT broker URL not configured");
    }

    // Get or create MQTT client
    const client = await mqttClientManager.connect(
      deviceId,
      device.username,
      device.password,
      brokerUrl
    );

    // Subscribe to topic
    client.subscribe(topicPath, { qos }, (err) => {
      if (err) {
        logger.error(`Failed to subscribe to topic: ${topicPath}`, err);
        throw err;
      }
      logger.info(`Successfully subscribed to topic: ${topicPath}`);
    });

    // Setup message handler if not already added
    // First, remove all existing message handlers to prevent duplicates
    client.removeAllListeners("message");

    // Then add a new message handler
    client.on("message", (receivedTopic, payload) => {
      // Log all incoming messages on subscribed topics
      logger.info(
        `MQTT message received: Topic: ${receivedTopic} | Device: ${deviceId}`
      );

      // Check if this message is relevant to our subscribed topics
      if (matchTopic(topicPath, receivedTopic)) {
        handleMessage(deviceId, receivedTopic, payload);
      }
    });

    return true;
  } catch (error: any) {
    logger.error(
      `Failed to subscribe device: ${deviceId} to topic: ${topicPath}`,
      error
    );
    throw error;
  }
}

/**
 * Unsubscribe a device from an MQTT topic
 * @param deviceId Device ID
 * @param topicPath Topic to unsubscribe from
 */
export async function unsubscribeFromTopic(
  deviceId: string,
  topicPath: string
) {
  logger.info(`Unsubscribing device: ${deviceId} from topic: ${topicPath}`);

  try {
    const client = mqttClientManager.getClient(deviceId);
    if (!client) {
      logger.warn(`No MQTT client for device: ${deviceId}`);
      return false;
    }

    client.unsubscribe(topicPath, (err) => {
      if (err) {
        logger.error(`Failed to unsubscribe from topic: ${topicPath}`, err);
        throw err;
      }
      logger.info(`Successfully unsubscribed from topic: ${topicPath}`);
    });

    return true;
  } catch (error: any) {
    logger.error(
      `Failed to unsubscribe device: ${deviceId} from topic: ${topicPath}`,
      error
    );
    throw error;
  }
}

/**
 * Initialize MQTT subscriptions for all devices
 */
export async function initializeSubscriptions() {
  logger.info("Initializing MQTT subscriptions for all devices");

  try {
    // Get all subscriptions
    const subscriptions = await prisma.subscription.findMany({
      include: {
        device: true,
        topic: true,
      },
    });

    logger.info(`Found ${subscriptions.length} subscriptions to initialize`);

    for (const subscription of subscriptions) {
      try {
        await subscribeToTopic(
          subscription.deviceId,
          subscription.topic.topicPath,
          subscription.qos as QoS
        );
      } catch (error: any) {
        logger.error(
          `Failed to initialize subscription for device: ${subscription.deviceId} to topic: ${subscription.topic.topicPath}`,
          error
        );
        // Continue with other subscriptions even if one fails
      }
    }

    logger.info("MQTT subscriptions initialized successfully");
  } catch (error: any) {
    logger.error("Failed to initialize MQTT subscriptions", error);
    throw error;
  }
}

/**
 * Disconnect a device from MQTT broker
 * @param deviceId Device ID
 */
export async function disconnectDevice(deviceId: string) {
  logger.info(`Disconnecting device: ${deviceId} from MQTT broker`);

  try {
    await mqttClientManager.disconnect(deviceId);
    logger.info(`Device: ${deviceId} disconnected from MQTT broker`);
    return true;
  } catch (error: any) {
    logger.error(`Failed to disconnect device: ${deviceId}`, error);
    throw error;
  }
}

/**
 * Disconnect all devices from MQTT broker
 */
export async function disconnectAllDevices() {
  logger.info("Disconnecting all devices from MQTT broker");

  try {
    await mqttClientManager.disconnectAll();
    logger.info("All devices disconnected from MQTT broker");
    return true;
  } catch (error: any) {
    logger.error("Failed to disconnect all devices", error);
    throw error;
  }
}
