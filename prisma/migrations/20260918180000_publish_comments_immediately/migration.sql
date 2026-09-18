-- New comments are public as soon as they are submitted. Existing pending
-- comments are intentionally left unchanged for the administrator to review.
ALTER TABLE `comentarios` ALTER COLUMN `status` SET DEFAULT 'aprovado';
