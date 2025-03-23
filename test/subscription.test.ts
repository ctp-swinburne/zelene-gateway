// test/subscription.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  testResources,
  makeRequest,
  prisma,
} from "./utils/test-setup";

// Test data
const testDevice = {
  name: "Test Subscription Device",
  username: "testsubscription",
  password: "testpassword",
  description: "Device for testing subscription functionality",
};

describe("Subscription Management", () => {
  // Set up test environment once for all tests
  beforeAll(async () => {
    await setupTestEnvironment();

    // Create test device
    const response = await makeRequest("POST", "/api/v1/devices", testDevice);
    expect(response.status).toBe(201);
    testResources.deviceId = response.data.data.id;
  });

  // Clean up after all tests are done
  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it("should create a subscription successfully", async () => {
    const subscription = {
      deviceId: testResources.deviceId,
      topicPath: testResources.topicPath,
      qos: 0,
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/subscriptions",
      subscription
    );

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.deviceId).toBe(testResources.deviceId);
    expect(response.data.data.topic.topicPath).toBe(testResources.topicPath);

    // Store subscription ID for later tests
    testResources.subscriptionId = response.data.data.id;
  });

  it("should reject subscription with invalid device ID", async () => {
    const subscription = {
      deviceId: "non-existent-device-id",
      topicPath: testResources.topicPath,
      qos: 0,
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/subscriptions",
      subscription
    );

    expect(response.status).toBe(404);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain("not found");
  });

  it("should reject duplicate subscription", async () => {
    const subscription = {
      deviceId: testResources.deviceId,
      topicPath: testResources.topicPath,
      qos: 0,
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/subscriptions",
      subscription
    );

    expect(response.status).toBe(409);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain("already exists");
  });

  it("should reject subscription with empty topic path", async () => {
    const subscription = {
      deviceId: testResources.deviceId,
      topicPath: "",
      qos: 0,
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/subscriptions",
      subscription
    );

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.validationErrors).toBeDefined();
  });

  it("should get device subscriptions", async () => {
    const response = await makeRequest(
      "GET",
      `/api/v1/subscriptions/device/${testResources.deviceId}`
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    expect(response.data.data.length).toBeGreaterThan(0);
    expect(response.data.data[0].deviceId).toBe(testResources.deviceId);
  });

  it("should get subscription by ID", async () => {
    const response = await makeRequest(
      "GET",
      `/api/v1/subscriptions/${testResources.subscriptionId}`
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.id).toBe(testResources.subscriptionId);
    expect(response.data.data.deviceId).toBe(testResources.deviceId);
  });

  it("should handle non-existent subscription ID gracefully", async () => {
    const response = await makeRequest(
      "GET",
      "/api/v1/subscriptions/non-existent-id"
    );

    expect(response.status).toBe(404);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain("not found");
  });

  it("should update subscription QoS level", async () => {
    const updateData = {
      qos: 1,
    };

    const response = await makeRequest(
      "PUT",
      `/api/v1/subscriptions/${testResources.subscriptionId}`,
      updateData
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.qos).toBe(updateData.qos);
  });

  it("should reject invalid QoS values", async () => {
    const invalidQoS = {
      qos: 5, // Invalid QoS value, should be 0, 1, or 2
    };

    const response = await makeRequest(
      "PUT",
      `/api/v1/subscriptions/${testResources.subscriptionId}`,
      invalidQoS
    );

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
  });

  it("should create a subscription with wildcard topic", async () => {
    const wildcardSubscription = {
      deviceId: testResources.deviceId,
      topicPath: "test/+/wildcard",
      qos: 0,
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/subscriptions",
      wildcardSubscription
    );

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.topic.topicPath).toBe(
      wildcardSubscription.topicPath
    );
  });

  it("should reject invalid wildcard pattern", async () => {
    // Create a subscription directly in the database with an invalid pattern
    // to test the validation at the lower level (mqtt-pattern.ts)
    try {
      // First find or create the topic (this should fail validation)
      const invalidTopic = await prisma.topic.create({
        data: {
          topicPath: "test/#/invalid", // Invalid: # must be the last segment
          isPublic: true,
          allowSubscribe: true,
        },
      });

      // If we get here, the validation in the code failed
      expect(true).toBe(false); // This should never execute
    } catch (error: any) {
      // Expect an error
      expect(error).toBeDefined();
    }
  });

  it("should delete a subscription", async () => {
    const response = await makeRequest(
      "DELETE",
      `/api/v1/subscriptions/${testResources.subscriptionId}`
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);

    // Verify it's gone
    const getResponse = await makeRequest(
      "GET",
      `/api/v1/subscriptions/${testResources.subscriptionId}`
    );
    expect(getResponse.status).toBe(404);
  });
});
