-- Add new columns
ALTER TABLE applications ADD COLUMN IF NOT EXISTS timestamp VARCHAR(100);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS class_standing VARCHAR(50);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS friday_availability VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS question4_response TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS question5_response TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS anything_else TEXT;

-- Drop old columns
ALTER TABLE applications DROP COLUMN IF EXISTS phone_number;
ALTER TABLE applications DROP COLUMN IF EXISTS university;
ALTER TABLE applications DROP COLUMN IF EXISTS graduation_year;
