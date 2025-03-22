// src/utils/mqtt-pattern.ts
/**
 * MQTT Topic Pattern Matching Utilities
 *
 * Functions for validating, matching, and handling MQTT topic patterns
 * with support for + (single-level) and # (multi-level) wildcards.
 */
import { createLogger } from "./logger";

const logger = createLogger("MqttPattern");

/**
 * Validates if a topic path is a valid MQTT topic pattern
 * @param topicPath Topic path to validate
 * @returns True if valid, false otherwise
 */
export const validateTopicPattern = (topicPath: string): boolean => {
  // Topic cannot be empty
  if (!topicPath || topicPath.trim() === "") {
    return false;
  }

  // Check for invalid characters
  if (/[^a-zA-Z0-9/#+]/.test(topicPath)) {
    return false;
  }

  // Split into segments
  const segments = topicPath.split("/");

  // Check for invalid usage of wildcards
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Single-level wildcard (+) must occupy entire segment
    if (segment.includes("+") && segment !== "+") {
      return false;
    }

    // Multi-level wildcard (#) must be the last segment
    if (segment === "#" && i !== segments.length - 1) {
      return false;
    }
  }

  return true;
};

/**
 * Determines if a topic matches a pattern (supports MQTT wildcards)
 * @param pattern The subscription pattern (may contain wildcards)
 * @param topic The actual topic being published to
 * @returns True if the topic matches the pattern
 */
export const matchTopic = (pattern: string, topic: string): boolean => {
  logger.debug(`Matching topic: ${topic} against pattern: ${pattern}`);

  // Exact match
  if (pattern === topic) {
    return true;
  }

  const patternSegments = pattern.split("/");
  const topicSegments = topic.split("/");

  // Handle # wildcard (matches any number of levels)
  if (patternSegments[patternSegments.length - 1] === "#") {
    // Check if all segments before # match
    const patternWithoutHash = patternSegments.slice(0, -1);

    // The topic must have at least as many segments as the pattern (minus the # segment)
    if (topicSegments.length < patternWithoutHash.length) {
      return false;
    }

    // Check each segment up to the # wildcard
    for (let i = 0; i < patternWithoutHash.length; i++) {
      if (
        patternWithoutHash[i] !== "+" &&
        patternWithoutHash[i] !== topicSegments[i]
      ) {
        return false;
      }
    }

    return true;
  }

  // Without # wildcard, the segments count must match
  if (patternSegments.length !== topicSegments.length) {
    return false;
  }

  // Check each segment
  for (let i = 0; i < patternSegments.length; i++) {
    // + matches exactly one segment
    if (patternSegments[i] === "+") {
      continue;
    }

    if (patternSegments[i] !== topicSegments[i]) {
      return false;
    }
  }

  return true;
};

/**
 * Returns true if the topic contains wildcards
 */
export const hasWildcards = (topic: string): boolean => {
  return topic.includes("+") || topic.includes("#");
};
