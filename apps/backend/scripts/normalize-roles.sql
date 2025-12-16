-- Normalize role values to lowercase for existing users
UPDATE "User"
SET role = LOWER(role)
WHERE role IS NOT NULL AND role <> LOWER(role);
