CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS products CASCADE;


-- Create tables
CREATE TABLE IF NOT EXISTS products (
                                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    price DECIMAL(10, 2),
    status VARCHAR(50)
    );

CREATE TABLE IF NOT EXISTS ride_and_go_role (
                                                id UUID PRIMARY KEY,
                                                type VARCHAR(50) NOT NULL,
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    version BIGINT
    );

CREATE TABLE IF NOT EXISTS ride_and_go_user (
                                                id UUID PRIMARY KEY,
                                                name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role_id UUID,
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    version BIGINT,
    FOREIGN KEY (role_id) REFERENCES ride_and_go_role(id)
    );

CREATE TABLE IF NOT EXISTS ride_and_go_offer (
                                                 id UUID PRIMARY KEY,
                                                 passenger_id UUID NOT NULL,
                                                 start_point VARCHAR(255),
    end_point VARCHAR(255),
    price DOUBLE PRECISION,
    state VARCHAR(50),
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    version BIGINT,
    FOREIGN KEY (passenger_id) REFERENCES ride_and_go_user(id)
    );

CREATE TABLE IF NOT EXISTS ride_and_go_offer_agreement (
                                                           id UUID PRIMARY KEY,
                                                           offer_id UUID NOT NULL,
                                                           driver_id UUID NOT NULL,
                                                           created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    version BIGINT,
    FOREIGN KEY (offer_id) REFERENCES ride_and_go_offer(id),
    FOREIGN KEY (driver_id) REFERENCES ride_and_go_user(id)
    );

CREATE TABLE IF NOT EXISTS ride_and_go_ride (
    id UUID PRIMARY KEY,
    offer_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    passenger_id UUID NOT NULL,
    distance DOUBLE PRECISION,
    duration INT,
    state VARCHAR(50),
    time_real INT,
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    version BIGINT,
    FOREIGN KEY (offer_id) REFERENCES ride_and_go_offer(id),
    FOREIGN KEY (driver_id) REFERENCES ride_and_go_user(id),
    FOREIGN KEY (passenger_id) REFERENCES ride_and_go_user(id)
);