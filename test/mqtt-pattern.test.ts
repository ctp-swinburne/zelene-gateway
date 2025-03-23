// test/mqtt-pattern.test.ts
import { describe, it, expect } from "vitest";
import {
  validateTopicPattern,
  matchTopic,
  hasWildcards,
} from "../src/utils/mqtt-pattern";

describe("MQTT Pattern Utilities", () => {
  describe("validateTopicPattern", () => {
    it("should validate simple topics", () => {
      expect(validateTopicPattern("home/kitchen/temperature")).toBe(true);
      expect(validateTopicPattern("device/123/status")).toBe(true);
      expect(
        validateTopicPattern("a/very/long/topic/path/with/many/levels")
      ).toBe(true);
    });

    it("should validate topics with single-level wildcards", () => {
      expect(validateTopicPattern("home/+/temperature")).toBe(true);
      expect(validateTopicPattern("device/+/+/status")).toBe(true);
      expect(validateTopicPattern("+/+/+")).toBe(true);
    });

    it("should validate topics with multi-level wildcards", () => {
      expect(validateTopicPattern("home/#")).toBe(true);
      expect(validateTopicPattern("device/123/#")).toBe(true);
      expect(validateTopicPattern("#")).toBe(true);
    });

    it("should reject empty topics", () => {
      expect(validateTopicPattern("")).toBe(false);
      expect(validateTopicPattern("  ")).toBe(false);
    });

    it("should reject topics with invalid characters", () => {
      expect(validateTopicPattern("home/kitchen temperature")).toBe(false); // Space
      expect(validateTopicPattern("device/123?/status")).toBe(false); // Question mark
      expect(validateTopicPattern("topic$")).toBe(false); // Dollar sign
    });

    it("should reject topics with improper wildcard usage", () => {
      expect(validateTopicPattern("home/kitchen+")).toBe(false); // + not as full segment
      expect(validateTopicPattern("device/123+/status")).toBe(false); // + with other chars
      expect(validateTopicPattern("home/#/kitchen")).toBe(false); // # not at the end
      expect(validateTopicPattern("sensor/#/reading")).toBe(false); // # not at the end
    });
  });

  describe("matchTopic", () => {
    it("should match exact topics", () => {
      expect(
        matchTopic("home/kitchen/temperature", "home/kitchen/temperature")
      ).toBe(true);
      expect(matchTopic("device/123/status", "device/123/status")).toBe(true);
      expect(
        matchTopic("home/kitchen/temperature", "home/bedroom/temperature")
      ).toBe(false);
      expect(matchTopic("device/123/status", "device/456/status")).toBe(false);
    });

    it("should match with single-level wildcards", () => {
      expect(matchTopic("home/+/temperature", "home/kitchen/temperature")).toBe(
        true
      );
      expect(matchTopic("home/+/temperature", "home/bedroom/temperature")).toBe(
        true
      );
      expect(matchTopic("home/+/temperature", "home/kitchen/humidity")).toBe(
        false
      );
      expect(
        matchTopic("home/+/temperature", "office/kitchen/temperature")
      ).toBe(false);

      expect(
        matchTopic("+/kitchen/temperature", "home/kitchen/temperature")
      ).toBe(true);
      expect(
        matchTopic("+/kitchen/temperature", "office/kitchen/temperature")
      ).toBe(true);
      expect(
        matchTopic("+/kitchen/temperature", "home/bedroom/temperature")
      ).toBe(false);
    });

    it("should match with multi-level wildcards", () => {
      expect(matchTopic("home/#", "home")).toBe(true);
      expect(matchTopic("home/#", "home/kitchen")).toBe(true);
      expect(matchTopic("home/#", "home/kitchen/temperature")).toBe(true);
      expect(matchTopic("home/#", "home/kitchen/temperature/celsius")).toBe(
        true
      );
      expect(matchTopic("home/#", "office/kitchen")).toBe(false);

      expect(matchTopic("device/123/#", "device/123")).toBe(true);
      expect(matchTopic("device/123/#", "device/123/status")).toBe(true);
      expect(matchTopic("device/123/#", "device/123/status/online")).toBe(true);
      expect(matchTopic("device/123/#", "device/456/status")).toBe(false);
    });

    it("should match with combined wildcards", () => {
      expect(
        matchTopic("home/+/+/temperature", "home/floor1/kitchen/temperature")
      ).toBe(true);
      expect(
        matchTopic("home/+/+/temperature", "home/floor2/bedroom/temperature")
      ).toBe(true);
      expect(
        matchTopic("home/+/+/temperature", "home/floor1/kitchen/humidity")
      ).toBe(false);

      expect(matchTopic("+/+/#", "home/kitchen")).toBe(true);
      expect(matchTopic("+/+/#", "home/kitchen/temperature")).toBe(true);
      expect(matchTopic("+/+/#", "office/meeting/room/projector")).toBe(true);
      expect(matchTopic("+/+/#", "home")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(matchTopic("#", "home/kitchen/temperature")).toBe(true); // # matches everything
      expect(matchTopic("#", "")).toBe(true); // # matches empty topic too
      expect(matchTopic("+", "kitchen")).toBe(true); // Single segment
      expect(matchTopic("+", "kitchen/temperature")).toBe(false); // + is single level
    });
  });

  describe("hasWildcards", () => {
    it("should detect single-level wildcards", () => {
      expect(hasWildcards("home/+/temperature")).toBe(true);
      expect(hasWildcards("+/kitchen/temperature")).toBe(true);
      expect(hasWildcards("home/kitchen/+")).toBe(true);
    });

    it("should detect multi-level wildcards", () => {
      expect(hasWildcards("home/#")).toBe(true);
      expect(hasWildcards("device/123/#")).toBe(true);
      expect(hasWildcards("#")).toBe(true);
    });

    it("should detect combined wildcards", () => {
      expect(hasWildcards("home/+/+/#")).toBe(true);
      expect(hasWildcards("+/kitchen/#")).toBe(true);
    });

    it("should return false for topics without wildcards", () => {
      expect(hasWildcards("home/kitchen/temperature")).toBe(false);
      expect(hasWildcards("device/123/status")).toBe(false);
      expect(hasWildcards("")).toBe(false);
    });
  });
});
