// src/controllers/topic.controller.ts
import { createTopic, getTopicByPath } from "../services/topic.service";
import { createLogger } from "../utils/logger";
import { TopicDto } from "../types/mqtt";

const logger = createLogger("TopicController");

export const topicController = {
  async createTopic(body: TopicDto) {
    logger.info(`Handling request to create a new topic: ${body.topicPath}`);

    try {
      const topic = await createTopic(body);
      logger.info(`Topic created successfully with ID: ${topic.id}`);
      return { success: true, data: topic };
    } catch (error: any) {
      logger.error(`Failed to create topic: ${body.topicPath}`, error);
      throw error;
    }
  },

  async getTopicByPath(path: string) {
    logger.info(`Handling request to get topic with path: ${path}`);

    try {
      const topic = await getTopicByPath(path);

      if (!topic) {
        logger.warn(`Topic not found with path: ${path}`);
        return null;
      }

      logger.info(`Successfully fetched topic with path: ${path}`);
      return topic;
    } catch (error: any) {
      logger.error(`Failed to fetch topic with path: ${path}`, error);
      throw error;
    }
  },
};
