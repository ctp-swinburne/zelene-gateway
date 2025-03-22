-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "allowPublish" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowSubscribe" BOOLEAN NOT NULL DEFAULT true;
