/*
  Warnings:

  - Added the required column `partition` to the `Publication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DeviceData" ADD COLUMN     "topic" TEXT;

-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "partition" BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX "DeviceData_topic_partition_idx" ON "DeviceData"("topic", "partition");

-- CreateIndex
CREATE INDEX "Publication_deviceId_partition_idx" ON "Publication"("deviceId", "partition");

-- CreateIndex
CREATE INDEX "Publication_topicId_partition_idx" ON "Publication"("topicId", "partition");
