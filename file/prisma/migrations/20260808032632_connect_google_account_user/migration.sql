-- Add userId as nullable temporarily
ALTER TABLE "GoogleAccount" ADD COLUMN "userId" TEXT;

-- Create a User for the existing Google account
INSERT INTO "User" ("id", "email", "name", "createdAt")
SELECT
  'existing-google-user',
  "email",
  "name",
  NOW()
FROM "GoogleAccount"
WHERE "email" = 'aaryanboy12@gmail.com'
ON CONFLICT ("email") DO NOTHING;

-- Connect the existing Google account to that User
UPDATE "GoogleAccount"
SET "userId" = (
  SELECT "id"
  FROM "User"
  WHERE "email" = "GoogleAccount"."email"
)
WHERE "userId" IS NULL;

-- Make userId required
ALTER TABLE "GoogleAccount"
ALTER COLUMN "userId" SET NOT NULL;

-- Add the foreign key
ALTER TABLE "GoogleAccount"
ADD CONSTRAINT "GoogleAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;