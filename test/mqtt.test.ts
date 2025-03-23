// test/mqtt.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  testResources,
  makeRequest,
  sleep,
  prisma,
} from "./utils/test-setup";

// Test data
const testDevice = {
  name: "Test MQTT Device",
  username: "testmqtt",
  password: "testpassword",
  description: "Device for testing MQTT messaging",
};

describe("MQTT Messaging", () => {
  // Set up test environment once for all tests
  beforeAll(async () => {
    await setupTestEnvironment();

    // Create test device
    const response = await makeRequest("POST", "/api/v1/devices", testDevice);
    expect(response.status).toBe(201);
    testResources.deviceId = response.data.data.id;

    // Create subscription
    const subscription = {
      deviceId: testResources.deviceId,
      topicPath: testResources.topicPath,
      qos: 0,
    };

    const subResponse = await makeRequest(
      "POST",
      "/api/v1/subscriptions",
      subscription
    );
    expect(subResponse.status).toBe(201);
    testResources.subscriptionId = subResponse.data.data.id;

    // Give the system time to set up the subscription
    await sleep(1000);
  });

  // Clean up after all tests are done
  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it("should receive and process messages from MQTT broker", async () => {
    // Create a unique test message
    const testMessage = {
      test_id: `test-${Date.now()}`,
      value: Math.random() * 100,
      timestamp: new Date().toISOString(),
    };

    // Publish directly to MQTT broker
    testResources.mqttClient!.publish(
      testResources.topicPath,
      JSON.stringify(testMessage)
    );

    // Allow time for message processing
    await sleep(2000);

    // Check if device data was recorded in the database
    const deviceData = await prisma.deviceData.findFirst({
      where: {
        deviceId: testResources.deviceId,
        topic: testResources.topicPath,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    expect(deviceData).not.toBeNull();

    // Try to parse the value and check its content
    const parsedValue = JSON.parse(deviceData!.value);
    expect(parsedValue.test_id).toBe(testMessage.test_id);
  });

  it("should process non-JSON messages from MQTT broker", async () => {
    // Plain text message
    const plainTextMessage = `Plain text message ${Date.now()}`;

    // Publish directly to MQTT broker
    testResources.mqttClient!.publish(
      testResources.topicPath,
      plainTextMessage
    );

    // Allow time for message processing
    await sleep(2000);

    // Check if device data was recorded for this message
    const deviceKey = await prisma.deviceKey.findFirst({
      where: {
        deviceId: testResources.deviceId,
        keyName: testResources.topicPath.replace(/\//g, "."),
      },
    });

    expect(deviceKey).not.toBeNull();

    // Check for the actual data
    const deviceData = await prisma.deviceData.findFirst({
      where: {
        deviceId: testResources.deviceId,
        keyId: deviceKey!.id,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    expect(deviceData).not.toBeNull();
    expect(deviceData!.value).toBe(plainTextMessage);
  });

  it("should publish messages from platform to MQTT broker", async () => {
    // Set up a promise that will be resolved when we receive the message
    const messageReceived = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Message receive timeout"));
      }, 5000);

      // Subscribe to the test topic
      testResources.mqttClient!.subscribe(testResources.topicPath);

      // Set up message handler
      const messageHandler = (topic: string, payload: Buffer) => {
        if (topic === testResources.topicPath) {
          try {
            const message = JSON.parse(payload.toString());
            if (message.source === "platform-test") {
              clearTimeout(timeout);
              testResources.mqttClient!.removeListener(
                "message",
                messageHandler
              );
              resolve();
            }
          } catch (e) {
            // Not our JSON message, ignore
          }
        }
      };

      testResources.mqttClient!.on("message", messageHandler);
    });

    // Create publication through the platform API
    const publication = {
      deviceId: testResources.deviceId,
      topicPath: testResources.topicPath,
      payload: JSON.stringify({
        source: "platform-test",
        value: Math.random() * 100,
        timestamp: new Date().toISOString(),
      }),
      qos: 0,
      retain: false,
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/publications",
      publication
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);

    // Wait for the message to be received
    await messageReceived;
  });

  it("should reject publication with invalid device ID", async () => {
    const publication = {
      deviceId: "non-existent-device-id",
      topicPath: testResources.topicPath,
      payload: "Test message",
      qos: 0,
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/publications",
      publication
    );

    expect(response.status).toBe(404);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain("not found");
  });

  it("should reject publication with empty payload", async () => {
    const publication = {
      deviceId: testResources.deviceId,
      topicPath: testResources.topicPath,
      payload: "",
      qos: 0,
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/publications",
      publication
    );

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
  });

  it("should handle wildcard topic matching correctly", async () => {
    // First create a subscription with a wildcard
    const wildcardSubscription = {
      deviceId: testResources.deviceId,
      topicPath: "test/wildcard/#",
      qos: 0,
    };

    const subResponse = await makeRequest(
      "POST",
      "/api/v1/subscriptions",
      wildcardSubscription
    );
    expect(subResponse.status).toBe(201);

    // Allow time for subscription to be established
    await sleep(1000);

    // Publish to a topic that should match the wildcard
    const specificTopic = "test/wildcard/specific";
    const testMessage = {
      test_id: `wildcard-test-${Date.now()}`,
      value: Math.random() * 100,
    };

    // Publish directly to MQTT broker
    testResources.mqttClient!.publish(
      specificTopic,
      JSON.stringify(testMessage)
    );

    // Allow time for message processing
    await sleep(2000);

    // Check if device data was recorded in the database from this message
    const deviceData = await prisma.deviceData.findFirst({
      where: {
        deviceId: testResources.deviceId,
        topic: specificTopic,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    expect(deviceData).not.toBeNull();

    // Try to parse the value and check its content
    const parsedValue = JSON.parse(deviceData!.value);
    expect(parsedValue.test_id).toBe(testMessage.test_id);
  });
});
