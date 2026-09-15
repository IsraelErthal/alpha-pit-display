-- Comments are public and no longer retain an authenticated user's identity.
ALTER TABLE `comentarios` DROP FOREIGN KEY `comentarios_usuario_id_fkey`;

ALTER TABLE `comentarios`
    ADD COLUMN `autor` VARCHAR(191) NOT NULL DEFAULT 'Torcedor Alpha';

UPDATE `comentarios` AS c
LEFT JOIN `usuarios` AS u ON u.`id` = c.`usuario_id`
SET c.`autor` = COALESCE(NULLIF(u.`nome`, ''), 'Torcedor Alpha');

ALTER TABLE `comentarios` DROP COLUMN `usuario_id`;
DROP TABLE `usuarios`;
