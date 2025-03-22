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
  isPublic: t.Optional(t.Boolean()),
  allowSubscribe: t.Optional(t.Boolean()),
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

// Schema for topic publications
export const PublicationSchema = t.Object({
  deviceId: t.String({
    minLength: 1,
    error: "The deviceId field cannot be empty",
  }),
  topicPath: t.String({
    minLength: 1,
    error: "The topicPath field cannot be empty",
  }),
  payload: t.String({
    error: "The payload field must be a string",
  }),
  qos: t.Optional(t.Number()),
  retain: t.Optional(t.Boolean()),
  // Optional scheduling parameters
  scheduleTime: t.Optional(t.String()), // ISO string format for the scheduled time
  scheduleId: t.Optional(t.String()), // For updating an existing scheduled publication
});

// Schema for scheduled publications
export const ScheduledPublicationSchema = t.Object({
  id: t.Optional(t.String()), // Only needed for updates
  deviceId: t.String({
    minLength: 1,
    error: "The deviceId field cannot be empty",
  }),
  topicPath: t.String({
    minLength: 1,
    error: "The topicPath field cannot be empty",
  }),
  payload: t.String({
    error: "The payload field must be a string",
  }),
  qos: t.Optional(t.Number()),
  retain: t.Optional(t.Boolean()),
  scheduledTime: t.String(), // ISO string format for the scheduled time
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
export type PublicationDto = Static<typeof PublicationSchema>;
export type ScheduledPublicationDto = Static<typeof ScheduledPublicationSchema>;

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string>;
}

// Message type for published messages
export interface MqttMessage {
  topic: string;
  payload: string;
  qos: number;
  retain: boolean;
  deviceId: string;
  timestamp: Date;
}
