ALTER TABLE refresh_tokens ADD COLUMN ip_address VARCHAR(45);
ALTER TABLE refresh_tokens ADD COLUMN user_agent TEXT;