CREATE DATABASE IF NOT EXISTS vintage_watch_auth
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vintage_watch_auth;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS SchemaMigrations;
DROP TABLE IF EXISTS AuditLogs;
DROP TABLE IF EXISTS AuthenticationChecks;
DROP TABLE IF EXISTS AuctionRecords;
DROP TABLE IF EXISTS WatchParts;
DROP TABLE IF EXISTS Watches;
DROP TABLE IF EXISTS Movements;
DROP TABLE IF EXISTS Brands;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Organizations;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE Organizations (
  organization_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_name VARCHAR(120) NOT NULL UNIQUE,
  owner_user_id INT UNSIGNED NULL,
  plan VARCHAR(40) NOT NULL DEFAULT 'Professional',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL
) ENGINE=InnoDB;

CREATE TABLE Users (
  user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('SuperAdmin', 'OrgAdmin', 'User') NOT NULL DEFAULT 'User',
  status ENUM('Active', 'Disabled') NOT NULL DEFAULT 'Active',
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  last_login_at TIMESTAMP NULL,
  password_changed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL,
  CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_users_org (organization_id)
) ENGINE=InnoDB;

ALTER TABLE Organizations
  ADD CONSTRAINT fk_organizations_owner FOREIGN KEY (owner_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE Brands (
  brand_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  brand_name VARCHAR(100) NOT NULL,
  country VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL,
  CONSTRAINT fk_brands_organization FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY uq_brands_org_name (organization_id, brand_name),
  INDEX idx_brands_org (organization_id)
) ENGINE=InnoDB;

CREATE TABLE Movements (
  movement_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  movement_name VARCHAR(100) NOT NULL,
  movement_type ENUM('Manual', 'Automatic', 'Quartz', 'Other') NOT NULL,
  jewel_count SMALLINT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL,
  CONSTRAINT fk_movements_organization FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY uq_movements_org_name (organization_id, movement_name),
  INDEX idx_movements_org (organization_id)
) ENGINE=InnoDB;

CREATE TABLE Watches (
  watch_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  brand_id INT UNSIGNED NOT NULL,
  movement_id INT UNSIGNED NULL,
  user_id INT UNSIGNED NOT NULL,
  model_name VARCHAR(120) NOT NULL,
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  production_year SMALLINT UNSIGNED,
  case_material VARCHAR(80),
  watch_condition ENUM('Mint', 'Excellent', 'Good', 'Fair', 'Poor') NOT NULL DEFAULT 'Good',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL,
  CONSTRAINT fk_watches_organization FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_watches_brand FOREIGN KEY (brand_id) REFERENCES Brands(brand_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_watches_movement FOREIGN KEY (movement_id) REFERENCES Movements(movement_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_watches_user FOREIGN KEY (user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_watches_org_user (organization_id, user_id),
  INDEX idx_watches_production_year (production_year)
) ENGINE=InnoDB;

CREATE TABLE WatchParts (
  part_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  watch_id INT UNSIGNED NOT NULL,
  part_name VARCHAR(100) NOT NULL,
  part_status ENUM('Original', 'Replacement', 'Restored', 'Unknown') NOT NULL DEFAULT 'Unknown',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL,
  CONSTRAINT fk_parts_watch FOREIGN KEY (watch_id) REFERENCES Watches(watch_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE AuctionRecords (
  auction_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  watch_id INT UNSIGNED NOT NULL,
  auction_house VARCHAR(120) NOT NULL,
  auction_date DATE NOT NULL,
  sale_price DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL,
  CONSTRAINT fk_auctions_watch FOREIGN KEY (watch_id) REFERENCES Watches(watch_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_auctions_date (auction_date)
) ENGINE=InnoDB;

CREATE TABLE AuthenticationChecks (
  check_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  watch_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  check_date DATE NOT NULL,
  serial_status ENUM('Verified', 'Mismatch', 'Unknown') NOT NULL DEFAULT 'Unknown',
  parts_status ENUM('Original', 'Mixed', 'Replacement', 'Unknown') NOT NULL DEFAULT 'Unknown',
  auction_status ENUM('Clear', 'Flagged', 'No Record') NOT NULL DEFAULT 'No Record',
  final_result ENUM('Authentic', 'Questionable', 'Counterfeit', 'Pending') NOT NULL DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL,
  CONSTRAINT fk_checks_organization FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_checks_watch FOREIGN KEY (watch_id) REFERENCES Watches(watch_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_checks_user FOREIGN KEY (user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_checks_date (check_date),
  INDEX idx_checks_org_user (organization_id, user_id)
) ENGINE=InnoDB;

CREATE TABLE AuditLogs (
  audit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NULL,
  actor_user_id INT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_organization FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_audit_org_created (organization_id, created_at),
  INDEX idx_audit_actor_created (actor_user_id, created_at),
  INDEX idx_audit_resource (resource_type, resource_id)
) ENGINE=InnoDB;
