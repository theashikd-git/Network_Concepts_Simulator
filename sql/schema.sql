CREATE DATABASE network_simulator;

USE network_simulator;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users
ADD COLUMN role ENUM('student','admin') DEFAULT 'student',
ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL;

