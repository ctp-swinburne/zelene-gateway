// src/utils/mqtt-client.ts
import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { createLogger } from "./logger";

const logger = createLogger("MqttClient");

interface MqttConnection {
  client: MqttClient;
  deviceId: string;
}

class MqttClientManager {
  private connections: Map<string, MqttConnection> = new Map();

  /**
   * Connect to MQTT broker with device credentials
   * @param deviceId The device ID
   * @param username MQTT username
   * @param password MQTT password
   * @param url MQTT broker URL
   * @returns Connected MQTT client
   */
  async connect(
    deviceId: string,
    username: string,
    password: string,
    url: string
  ): Promise<MqttClient> {
    logger.info(`Connecting to MQTT broker for device: ${deviceId}`);

    try {
      // Check if connection already exists
      if (this.connections.has(deviceId)) {
        logger.info(`Using existing connection for device: ${deviceId}`);
        return this.connections.get(deviceId)!.client;
      }

      // Set up connection options
      const options: IClientOptions = {
        clientId: `zelene-gateway-${deviceId}`,
        username,
        password,
        clean: true,
        reconnectPeriod: 5000, // 5 seconds
        connectTimeout: 30000, // 30 seconds
      };

      // Connect to broker
      const client = mqtt.connect(url, options);

      // Set up event handlers
      client.on("connect", () => {
        logger.info(`Connected to MQTT broker for device: ${deviceId}`);
      });

      client.on("error", (error) => {
        logger.error(`MQTT connection error for device: ${deviceId}`, error);
      });

      client.on("close", () => {
        logger.info(`MQTT connection closed for device: ${deviceId}`);
      });

      client.on("offline", () => {
        logger.warn(`MQTT connection offline for device: ${deviceId}`);
      });

      client.on("reconnect", () => {
        logger.info(`Attempting to reconnect MQTT for device: ${deviceId}`);
      });

      // Store the connection
      this.connections.set(deviceId, { client, deviceId });

      // Wait for the connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Connection timeout for device: ${deviceId}`));
        }, 10000); // 10 second timeout

        client.once("connect", () => {
          clearTimeout(timeoutId);
          resolve();
        });

        client.once("error", (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      });

      return client;
    } catch (error) {
      logger.error(
        `Failed to connect to MQTT broker for device: ${deviceId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get an existing MQTT client by device ID
   * @param deviceId The device ID
   * @returns MQTT client or undefined if not connected
   */
  getClient(deviceId: string): MqttClient | undefined {
    const connection = this.connections.get(deviceId);
    return connection?.client;
  }

  /**
   * Disconnect a device from MQTT broker
   * @param deviceId The device ID
   */
  async disconnect(deviceId: string): Promise<void> {
    logger.info(`Disconnecting from MQTT broker for device: ${deviceId}`);

    try {
      const connection = this.connections.get(deviceId);
      if (connection) {
        await new Promise<void>((resolve, reject) => {
          connection.client.end(false, {}, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
        this.connections.delete(deviceId);
        logger.info(`Disconnected from MQTT broker for device: ${deviceId}`);
      } else {
        logger.warn(`No active connection for device: ${deviceId}`);
      }
    } catch (error) {
      logger.error(
        `Failed to disconnect from MQTT broker for device: ${deviceId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Disconnect all devices from MQTT broker
   */
  async disconnectAll(): Promise<void> {
    logger.info(`Disconnecting all devices from MQTT broker`);

    try {
      const deviceIds = Array.from(this.connections.keys());
      for (const deviceId of deviceIds) {
        await this.disconnect(deviceId);
      }
      logger.info(`All devices disconnected from MQTT broker`);
    } catch (error) {
      logger.error(`Failed to disconnect all devices from MQTT broker`, error);
      throw error;
    }
  }
}

// Create a singleton instance
export const mqttClientManager = new MqttClientManager();
