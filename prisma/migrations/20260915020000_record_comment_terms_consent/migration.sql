-- Preserve the consent timestamp for comments created after the consent flow was introduced.
ALTER TABLE `comentarios` ADD COLUMN `termos_aceitos_em` DATETIME(3) NULL;
