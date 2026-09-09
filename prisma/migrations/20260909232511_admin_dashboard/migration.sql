/*
  Warnings:

  - Added the required column `sessao_id` to the `acessos_log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `acessos_log` ADD COLUMN `sessao_id` VARCHAR(64) NOT NULL;

-- CreateIndex
CREATE INDEX `acessos_log_data_hora_acesso_idx` ON `acessos_log`(`data_hora_acesso`);

-- CreateIndex
CREATE INDEX `acessos_log_sessao_id_data_hora_acesso_idx` ON `acessos_log`(`sessao_id`, `data_hora_acesso`);
