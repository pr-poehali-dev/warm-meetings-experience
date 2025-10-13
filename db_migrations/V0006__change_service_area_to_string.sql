-- Remove foreign key constraint and change service_area_id to varchar
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_area_id_fkey;
ALTER TABLE bookings ALTER COLUMN service_area_id TYPE VARCHAR(50) USING service_area_id::varchar;