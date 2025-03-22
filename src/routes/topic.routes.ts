// src/routes/topic.routes.ts
import { Elysia, t } from "elysia";
import { topicController } from "../controllers/topic.controller";
import { createLogger } from "../utils/logger";
import { TopicSchema, ApiResponse } from "../types/mqtt";

const logger = createLogger("TopicRoutes");

export const topicRoutes = new Elysia({ prefix: "/topics" })
  .post(
    "/",
    async ({ body, set }): Promise<ApiResponse<any>> => {
      logger.info(`Received request to create a new topic: ${body.topicPath}`);

      try {
        const result = await topicController.createTopic(body);
        return { success: true, data: result };
      } catch (error: any) {
        logger.error(
          `Error processing create topic request for: ${body.topicPath}`,
          error
        );

        // Set appropriate status code based on error type
        if (error.message.includes("already exists")) {
          set.status = 409; // Conflict
        } else {
          set.status = 500; // Internal Server Error
        }

        return {
          success: false,
          error: error.message || "Failed to create topic",
        };
      }
    },
    {
      body: TopicSchema,
      detail: {
        tags: ["Topics"],
        summary: "Create a new topic",
        description: "Creates a new MQTT topic for subscription",
      },
    }
  )
  .get(
    "/",
    async ({ query, set }): Promise<ApiResponse<any>> => {
      const { path } = query;
      logger.info(`Received request to get topic with path: ${path}`);

      try {
        const topic = await topicController.getTopicByPath(path);

        if (!topic) {
          logger.warn(`Topic not found with path: ${path}`);
          set.status = 404;
          return { success: false, error: "Topic not found" };
        }

        return { success: true, data: topic };
      } catch (error: any) {
        logger.error(
          `Error processing get topic request for path: ${path}`,
          error
        );
        set.status = 500;
        return {
          success: false,
          error: error.message || "Failed to fetch topic",
        };
      }
    },
    {
      query: t.Object({
        path: t.String({
          minLength: 1,
          error: "The topic path field cannot be empty",
        }),
      }),
      detail: {
        tags: ["Topics"],
        summary: "Get topic by path",
        description: "Retrieves topic details by its path",
      },
    }
  );
