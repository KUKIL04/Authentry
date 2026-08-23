ALTER TABLE invitations ADD COLUMN custom_profile_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE invitations ADD COLUMN first_name VARCHAR(100);
ALTER TABLE invitations ADD COLUMN last_name VARCHAR(100);