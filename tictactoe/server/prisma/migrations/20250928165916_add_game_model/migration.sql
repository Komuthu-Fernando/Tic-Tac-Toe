-- CreateTable
CREATE TABLE `Game` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roomId` VARCHAR(191) NOT NULL,
    `playerXId` INTEGER NOT NULL,
    `playerOId` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'waiting',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Game_roomId_key`(`roomId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Game` ADD CONSTRAINT `Game_playerXId_fkey` FOREIGN KEY (`playerXId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Game` ADD CONSTRAINT `Game_playerOId_fkey` FOREIGN KEY (`playerOId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
