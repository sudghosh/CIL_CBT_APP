-- backend/init/init.sql (DEVELOPMENT VERSION - USE WITH EXTREME CAUTION IN PRODUCTION!)

-- IMPORTANT: This script will drop and recreate the database, deleting all data.
-- ONLY use this for development environments where data persistence across container
-- restarts is not required or data loss is acceptable.

-- Disconnect any active connections to the database before dropping.
-- This is crucial to avoid "cannot drop the currently open database" error.
-- The Docker entrypoint for Postgres runs init.sql as 'postgres' user, which has these permissions.
-- The following block is commented out to avoid errors during container initialization.
-- SELECT pg_terminate_backend(pg_stat_activity.pid)
-- FROM pg_stat_activity
-- WHERE pg_stat_activity.datname = 'cil_cbt_db'
--   AND pid <> pg_backend_pid();

-- Do NOT drop the database during initialization, as this causes errors in Docker entrypoint
-- DROP DATABASE IF EXISTS cil_cbt_db;

-- Create the user (role) if it doesn't exist
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cildb') THEN
      CREATE USER cildb WITH PASSWORD 'cildb123';
   END IF;
END
$$;

-- Create the database, owned by the cildb user if it does not exist
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cil_cbt_db') THEN
      CREATE DATABASE cil_cbt_db OWNER cildb;
   END IF;
END
$$;

-- Connect to the newly created database (or existing one)
\c cil_cbt_db;

-- Grant all privileges on the database to the owner user (for development convenience)
GRANT ALL PRIVILEGES ON DATABASE cil_cbt_db TO cildb;

-- You can add your application's table creation SQL here.
-- Example (if your application doesn't handle migrations, or for initial schema):
-- CREATE TABLE IF NOT EXISTS users (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     username VARCHAR(255) UNIQUE NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     hashed_password VARCHAR(255) NOT NULL,
--     is_active BOOLEAN DEFAULT TRUE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE IF NOT EXISTS questions (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     text TEXT NOT NULL,
--     type VARCHAR(50) NOT NULL, -- e.g., 'multiple_choice', 'true_false'
--     difficulty VARCHAR(50),
--     category VARCHAR(255),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE IF NOT EXISTS options (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
--     text TEXT NOT NULL,
--     is_correct BOOLEAN NOT NULL DEFAULT FALSE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );