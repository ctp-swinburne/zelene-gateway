// test/device.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  testResources,
  makeRequest,
} from "./utils/test-setup";

// Test data
const testDevice = {
  name: "Test Gateway Device",
  username: "testgateway",
  password: "testpassword",
  description: "Device for testing MQTT gateway functionality",
};

describe("Device Management", () => {
  // Set up test environment once for all tests
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  // Clean up after all tests are done
  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it("should create a device successfully", async () => {
    const response = await makeRequest("POST", "/api/v1/devices", testDevice);

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.name).toBe(testDevice.name);
    expect(response.data.data.username).toBe(testDevice.username);

    // Store device ID for later tests
    testResources.deviceId = response.data.data.id;
  });

  it("should reject duplicate device creation", async () => {
    const response = await makeRequest("POST", "/api/v1/devices", testDevice);

    expect(response.status).toBe(409); // Conflict
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain("already exists");
  });

  it("should reject device creation with empty name", async () => {
    const invalidDevice = {
      ...testDevice,
      name: "",
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/devices",
      invalidDevice
    );

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.validationErrors).toBeDefined();
  });

  it("should reject device creation with empty username", async () => {
    const invalidDevice = {
      ...testDevice,
      username: "",
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/devices",
      invalidDevice
    );

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.validationErrors).toBeDefined();
  });

  it("should reject device creation with empty password", async () => {
    const invalidDevice = {
      ...testDevice,
      password: "",
    };

    const response = await makeRequest(
      "POST",
      "/api/v1/devices",
      invalidDevice
    );

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.validationErrors).toBeDefined();
  });

  it("should get device by ID", async () => {
    const response = await makeRequest(
      "GET",
      `/api/v1/devices/${testResources.deviceId}`
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.id).toBe(testResources.deviceId);
    expect(response.data.data.name).toBe(testDevice.name);
  });

  it("should get all devices", async () => {
    const response = await makeRequest("GET", "/api/v1/devices");

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    expect(response.data.data.length).toBeGreaterThan(0);
  });

  it("should handle non-existent device ID gracefully", async () => {
    const response = await makeRequest(
      "GET",
      "/api/v1/devices/non-existent-id"
    );

    expect(response.status).toBe(404);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain("not found");
  });

  it("should update device information", async () => {
    const updateData = {
      name: "Updated Device Name",
      description: "Updated device description",
    };

    const response = await makeRequest(
      "PUT",
      `/api/v1/devices/${testResources.deviceId}`,
      updateData
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.name).toBe(updateData.name);
    expect(response.data.data.description).toBe(updateData.description);
  });
});
