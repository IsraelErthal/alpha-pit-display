-- Bind new comments to the verified Firebase account that created them.
ALTER TABLE `comentarios` ADD COLUMN `autor_uid` VARCHAR(128) NULL;

CREATE INDEX `comentarios_autor_uid_idx` ON `comentarios`(`autor_uid`);
