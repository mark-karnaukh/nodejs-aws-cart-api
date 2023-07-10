-- Import required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Create required enums/types
DO $$ BEGIN CREATE TYPE status_enum AS ENUM('OPEN', 'ORDERED');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- Create required tables:
-- carts table
CREATE TABLE IF NOT EXISTS carts (
    -- Primary key
    id uuid DEFAULT uuid_generate_v4(),
    -- It's not Foreign key, because there is no user entity in DB
    user_id uuid NOT NULL,
    -- created_at DATE NOT NULL,
    -- updated_at DATE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    status status_enum,
    PRIMARY KEY (id)
);
-- cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
    cart_id uuid,
    product_id uuid,
    -- Number of items in a cart
    count INT,
    -- Foreign key from carts.id
    FOREIGN KEY (cart_id) REFERENCES carts (id)
);
-- orders table
CREATE TABLE IF NOT EXISTS orders (
    -- Primary key
    id uuid DEFAULT uuid_generate_v4(),
    -- It's not Foreign key, because there is no user entity in DB
    user_id uuid NOT NULL,
    -- Foreign key from carts.id
    cart_id uuid,
    payment JSON,
    delivery JSON,
    comments VARCHAR(300),
    status VARCHAR(50),
    -- Total amount of order
    total INT,
    PRIMARY KEY (id),
    FOREIGN KEY (cart_id) REFERENCES carts (id)
);