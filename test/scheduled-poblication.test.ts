// test/scheduled-publication.test.ts
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
  name: "Test Schedule Device",
  username: "testschedule",
  password: "testpassword",
  description: "Device for testing scheduled publications",
};

describe("Scheduled Publications", () => {
  let scheduledPublicationId = "";

  // Set up test environment once for all tests
  beforeAll(async () => {
    await setupTestEnvironment();

    // Create test device
    const response = await makeRequest("POST", "/api/v1/devices", testDevice);
    expect(response.status).toBe(201);
    testResources.deviceId = response.data.data.id;

    // Create subscription (for receiving the scheduled message)
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

  it("should schedule a publication for future delivery", async () => {
    // Set time for 5 seconds in the future
    const futureTime = new Date(Date.now() + 5000).toISOString();

    const scheduledPublication = {
      deviceId: testResources.deviceId,
      topicPath: testResources.topicPath,
      payload: JSON.stringify({
        source: "scheduled-test",
        value: Math.random() * 100,
        timestamp: new Date().toISOString(),
      }),
      qos: 0,
      retain: false,
      scheduledTime: futureTime,
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/publications/schedule",
      scheduledPublication
    );

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.deviceId).toBe(testResources.deviceId);
    expect(response.data.data.topic.topicPath).toBe(testResources.topicPath);
    expect(response.data.data.status).toBe("PENDING");

    // Store ID for later tests
    scheduledPublicationId = response.data.data.id;
  });

  it("should get scheduled publication details", async () => {
    const response = await makeRequest(
      "GET",
      `/api/v1/publications/schedule/${scheduledPublicationId}`
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.id).toBe(scheduledPublicationId);
    expect(response.data.data.status).toBe("PENDING");
  });

  it("should get all scheduled publications for a device", async () => {
    const response = await makeRequest(
      "GET",
      `/api/v1/publications/schedule/device/${testResources.deviceId}`
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    expect(response.data.data.length).toBeGreaterThan(0);
    expect(response.data.data[0].deviceId).toBe(testResources.deviceId);
  });

  it("should update a scheduled publication", async () => {
    const updateData = {
      payload: JSON.stringify({
        source: "updated-scheduled-test",
        value: Math.random() * 100,
        updated: true,
        timestamp: new Date().toISOString(),
      }),
      qos: 1,
    };

    const response = await makeRequest(
      "PUT",
      `/api/v1/publications/schedule/${scheduledPublicationId}`,
      updateData
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.qos).toBe(updateData.qos);
    expect(response.data.data.payload).toBe(updateData.payload);
  });

  it("should cancel a scheduled publication", async () => {
    const response = await makeRequest(
      "DELETE",
      `/api/v1/publications/schedule/${scheduledPublicationId}`
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.status).toBe("CANCELLED");
  });

  it("should reject scheduling with invalid device ID", async () => {
    const invalidSchedule = {
      deviceId: "non-existent-device-id",
      topicPath: testResources.topicPath,
      payload: "Test message",
      scheduledTime: new Date(Date.now() + 3600000).toISOString(),
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/publications/schedule",
      invalidSchedule
    );

    expect(response.status).toBe(404);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain("not found");
  });

  it("should reject scheduling with invalid scheduled time", async () => {
    const invalidSchedule = {
      deviceId: testResources.deviceId,
      topicPath: testResources.topicPath,
      payload: "Test message",
      scheduledTime: "not-a-date",
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/publications/schedule",
      invalidSchedule
    );

    expect(response.status).toBe(500); // This would be caught at a lower level
    expect(response.data.success).toBe(false);
  });

  it("should process scheduled publications", async () => {
    // Set up a promise that will be resolved when we receive the message
    const messageReceived = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Scheduled message receive timeout"));
      }, 15000); // Longer timeout for scheduled publication

      // Subscribe to the test topic
      testResources.mqttClient!.subscribe(testResources.topicPath);

      // Set up message handler
      const messageHandler = (topic: string, payload: Buffer) => {
        if (topic === testResources.topicPath) {
          try {
            const message = JSON.parse(payload.toString());
            if (message.source === "process-scheduled-test") {
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

    // Schedule a publication for immediate processing
    const immediateSchedule = {
      deviceId: testResources.deviceId,
      topicPath: testResources.topicPath,
      payload: JSON.stringify({
        source: "process-scheduled-test",
        value: Math.random() * 100,
        timestamp: new Date().toISOString(),
      }),
      scheduledTime: new Date().toISOString(), // Now
    };

    const scheduleResponse = await makeRequest(
      "POST",
      "/api/v1/publications/schedule",
      immediateSchedule
    );
    expect(scheduleResponse.status).toBe(201);

    // Manually trigger processing
    const processResponse = await makeRequest(
      "POST",
      "/api/v1/publications/schedule/process"
    );
    expect(processResponse.status).toBe(200);

    // Wait for the message to be received
    await messageReceived;

    // Check that the publication was marked as published
    const scheduledPubs = await prisma.scheduledPublication.findMany({
      where: {
        deviceId: testResources.deviceId,
        status: "PUBLISHED",
      },
    });

    expect(scheduledPubs.length).toBeGreaterThan(0);
  });
});
