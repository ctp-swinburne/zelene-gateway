-- CreateTable
CREATE TABLE "DeviceKey" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "keyName" TEXT NOT NULL,
    "keyType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceData" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "keyId" TEXT,
    "value" TEXT NOT NULL,
    "partition" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceKey_deviceId_keyName_key" ON "DeviceKey"("deviceId", "keyName");

-- CreateIndex
CREATE INDEX "DeviceData_deviceId_partition_idx" ON "DeviceData"("deviceId", "partition");

-- CreateIndex
CREATE INDEX "DeviceData_keyId_partition_idx" ON "DeviceData"("keyId", "partition");

-- AddForeignKey
ALTER TABLE "DeviceKey" ADD CONSTRAINT "DeviceKey_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceData" ADD CONSTRAINT "DeviceData_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceData" ADD CONSTRAINT "DeviceData_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "DeviceKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
