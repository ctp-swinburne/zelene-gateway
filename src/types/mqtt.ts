// src/types/mqtt.ts
import { t, Static } from "elysia";

// Custom string validation for non-empty strings
export const NonEmptyString = t.String({
  minLength: 1,
  error: "This field cannot be empty",
});

// Schemas for validation
export const DeviceSchema = t.Object({
  name: NonEmptyString,
  username: NonEmptyString,
  password: NonEmptyString,
  description: t.Optional(t.String()),
});

export const TopicSchema = t.Object({
  topicPath: NonEmptyString,
  description: t.Optional(t.String()),
});

export const SubscriptionSchema = t.Object({
  deviceId: NonEmptyString,
  topicPath: NonEmptyString,
  qos: t.Optional(t.Number()),
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
}
