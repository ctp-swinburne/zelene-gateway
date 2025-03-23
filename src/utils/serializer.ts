// src/utils/serializer.ts
import { createLogger } from "./logger";

const logger = createLogger("Serializer");

/**
 * Custom replacer function for JSON.stringify that converts BigInt to string
 * @param key The property key
 * @param value The property value
 * @returns The transformed value
 */
export const bigintJsonReplacer = (key: string, value: any): any => {
  // Check if the value is a BigInt and convert it to a string
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
};

/**
 * Safely converts an object with BigInt values to a JSON-serializable object
 * @param data Object that may contain BigInt values
 * @returns Object with BigInt values converted to strings
 */
export function convertBigIntToString<T>(data: T): T {
  try {
    // First stringify with the BigInt replacer, then parse back to an object
    return JSON.parse(JSON.stringify(data, bigintJsonReplacer));
  } catch (error) {
    logger.error("Failed to convert BigInt values in object", error);
    throw new Error("Failed to process data with BigInt values");
  }
}
