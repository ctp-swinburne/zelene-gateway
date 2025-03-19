// src/services/topic.service.ts
import { PrismaClient } from "@prisma/client";
import { TopicDto } from "../types/mqtt";
import { createLogger } from "../utils/logger";

const prisma = new PrismaClient();
const logger = createLogger("TopicService");

export const createTopic = async (topicData: TopicDto) => {
  logger.info(`Creating new topic: ${topicData.topicPath}`);

  try {
    const topic = await prisma.topic.create({
      data: {
        topicPath: topicData.topicPath,
        description: topicData.description,
      },
    });

    logger.info(`Successfully created topic with ID: ${topic.id}`);
    return topic;
  } catch (error: any) {
    // Check if it's a unique constraint violation (duplicate topic)
    if (error.code === "P2002") {
      logger.warn(`Topic already exists with path: ${topicData.topicPath}`);
      throw new Error(`Topic already exists with path: ${topicData.topicPath}`);
    }

    logger.error(`Failed to create topic: ${topicData.topicPath}`, error);
    throw error;
  }
};

export const getTopicByPath = async (topicPath: string) => {
  logger.info(`Fetching topic with path: ${topicPath}`);

  try {
    const topic = await prisma.topic.findUnique({
      where: { topicPath },
    });

    if (!topic) {
      logger.warn(`Topic not found with path: ${topicPath}`);
      return null;
    }

    logger.info(`Successfully fetched topic with path: ${topicPath}`);
    return topic;
  } catch (error: any) {
    logger.error(`Failed to fetch topic with path: ${topicPath}`, error);
    throw error;
  }
};

export const getOrCreateTopic = async (topicData: TopicDto) => {
  logger.info(`Getting or creating topic: ${topicData.topicPath}`);

  try {
    let topic = await getTopicByPath(topicData.topicPath);

    if (!topic) {
      logger.info(`Topic not found, creating new one: ${topicData.topicPath}`);
      topic = await createTopic(topicData);
    }

    return topic;
  } catch (error: any) {
    logger.error(
      `Failed to get or create topic: ${topicData.topicPath}`,
      error
    );
    throw error;
  }
};
