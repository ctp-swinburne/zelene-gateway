/*
  Warnings:

  - You are about to drop the column `allowPublish` on the `Topic` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Topic" DROP COLUMN "allowPublish",
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "qos" INTEGER NOT NULL DEFAULT 0,
    "retain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPublication" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "qos" INTEGER NOT NULL DEFAULT 0,
    "retain" BOOLEAN NOT NULL DEFAULT false,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPublication_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublication" ADD CONSTRAINT "ScheduledPublication_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublication" ADD CONSTRAINT "ScheduledPublication_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
