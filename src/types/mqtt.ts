// src/types/mqtt.ts
import { t, Static } from "elysia";

// Schemas for validation with specific error messages
export const DeviceSchema = t.Object({
  name: t.String({
    minLength: 1,
    error: "The name field cannot be empty",
  }),
  username: t.String({
    minLength: 1,
    error: "The username field cannot be empty",
  }),
  password: t.String({
    minLength: 1,
    error: "The password field cannot be empty",
  }),
  description: t.Optional(t.String()),
});

export const TopicSchema = t.Object({
  topicPath: t.String({
    minLength: 1,
    error: "The topicPath field cannot be empty",
  }),
  description: t.Optional(t.String()),
});

export const SubscriptionSchema = t.Object({
  deviceId: t.String({
    minLength: 1,
    error: "The deviceId field cannot be empty",
  }),
  topicPath: t.String({
    minLength: 1,
    error: "The topicPath field cannot be empty",
  }),
  qos: t.Optional(t.Number()),
});

// For query parameters that need generic validation
export const NonEmptyString = t.String({
  minLength: 1,
  error: "This field cannot be empty",
});

// DTOs based on the schemas - using Static instead of t.InferType
export type DeviceDto = Static<typeof DeviceSchema>;
export type TopicDto = Static<typeof TopicSchema>;
export type SubscriptionDto = Static<typeof SubscriptionSchema>;

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string>;
}
