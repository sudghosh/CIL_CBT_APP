-- Create database if not exists
CREATE DATABASE cildb;

-- Connect to the database
\c cildb;

-- Create schema and tables
CREATE SCHEMA IF NOT EXISTS public;

-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set proper permissions
ALTER DATABASE cildb OWNER TO cildb;
GRANT ALL PRIVILEGES ON DATABASE cildb TO cildb;
GRANT ALL PRIVILEGES ON SCHEMA public TO cildb;