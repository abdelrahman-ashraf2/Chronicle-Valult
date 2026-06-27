ALTER TABLE Organizations
  ADD COLUMN slug VARCHAR(120) NULL,
  ADD COLUMN logo_url VARCHAR(500) NULL,
  ADD COLUMN accent_color VARCHAR(20) NULL DEFAULT '#C9A227',
  ADD COLUMN custom_domain VARCHAR(255) NULL;

ALTER TABLE Watches
  ADD COLUMN reference_number VARCHAR(100) NULL,
  ADD COLUMN public_token CHAR(36) NULL,
  ADD COLUMN public_visibility ENUM('Private', 'Verified') NOT NULL DEFAULT 'Private',
  ADD COLUMN cover_image_url VARCHAR(500) NULL;

CREATE UNIQUE INDEX uq_organizations_slug ON Organizations(slug);
CREATE UNIQUE INDEX uq_watches_public_token ON Watches(public_token);

CREATE TABLE Plans (
  plan_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_code VARCHAR(40) NOT NULL UNIQUE,
  plan_name VARCHAR(80) NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  watch_limit INT UNSIGNED NULL,
  user_limit INT UNSIGNED NULL,
  evidence_limit_mb INT UNSIGNED NULL,
  api_access BOOLEAN NOT NULL DEFAULT FALSE,
  white_label BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE Subscriptions (
  subscription_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL UNIQUE,
  plan_id INT UNSIGNED NOT NULL,
  status ENUM('Trial', 'Active', 'PastDue', 'Canceled') NOT NULL DEFAULT 'Trial',
  trial_ends_at TIMESTAMP NULL,
  current_period_ends_at TIMESTAMP NULL,
  external_customer_id VARCHAR(255) NULL,
  external_subscription_id VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_subscription_org FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_subscription_plan FOREIGN KEY (plan_id) REFERENCES Plans(plan_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE AuthenticationCases (
  case_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  watch_id INT UNSIGNED NOT NULL,
  requested_by_user_id INT UNSIGNED NOT NULL,
  assigned_to_user_id INT UNSIGNED NULL,
  status ENUM('Draft', 'Submitted', 'InReview', 'NeedsEvidence', 'Completed', 'Canceled') NOT NULL DEFAULT 'Draft',
  priority ENUM('Low', 'Normal', 'High', 'Urgent') NOT NULL DEFAULT 'Normal',
  result ENUM('Pending', 'Authentic', 'Questionable', 'Counterfeit') NOT NULL DEFAULT 'Pending',
  summary TEXT NULL,
  submitted_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL,
  CONSTRAINT fk_cases_org FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_cases_watch FOREIGN KEY (watch_id) REFERENCES Watches(watch_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_cases_requester FOREIGN KEY (requested_by_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_cases_assignee FOREIGN KEY (assigned_to_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_cases_org_status (organization_id, status),
  INDEX idx_cases_watch (watch_id)
) ENGINE=InnoDB;

CREATE TABLE CaseComments (
  comment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_case FOREIGN KEY (case_id) REFERENCES AuthenticationCases(case_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_comments_case_created (case_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE EvidenceFiles (
  evidence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  watch_id INT UNSIGNED NOT NULL,
  case_id INT UNSIGNED NULL,
  uploaded_by_user_id INT UNSIGNED NOT NULL,
  category ENUM('Watch', 'Dial', 'Movement', 'Case', 'Serial', 'Certificate', 'Receipt', 'Auction', 'Other') NOT NULL DEFAULT 'Other',
  original_name VARCHAR(255) NOT NULL,
  storage_name VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  description VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL,
  CONSTRAINT fk_evidence_org FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_evidence_watch FOREIGN KEY (watch_id) REFERENCES Watches(watch_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_evidence_case FOREIGN KEY (case_id) REFERENCES AuthenticationCases(case_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_evidence_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_evidence_watch (watch_id, created_at),
  INDEX idx_evidence_case (case_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE ProvenanceEvents (
  event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  watch_id INT UNSIGNED NOT NULL,
  created_by_user_id INT UNSIGNED NOT NULL,
  event_type ENUM('Registered', 'Ownership', 'Service', 'Auction', 'Authentication', 'Document', 'Note') NOT NULL,
  event_date DATE NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NULL,
  source_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_provenance_org FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_provenance_watch FOREIGN KEY (watch_id) REFERENCES Watches(watch_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_provenance_creator FOREIGN KEY (created_by_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_provenance_watch_date (watch_id, event_date)
) ENGINE=InnoDB;

CREATE TABLE Invitations (
  invitation_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  invited_by_user_id INT UNSIGNED NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('OrgAdmin', 'User') NOT NULL DEFAULT 'User',
  token_hash CHAR(64) NOT NULL UNIQUE,
  status ENUM('Pending', 'Accepted', 'Revoked', 'Expired') NOT NULL DEFAULT 'Pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invitations_org FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_invitations_inviter FOREIGN KEY (invited_by_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_invitations_org_status (organization_id, status)
) ENGINE=InnoDB;

CREATE TABLE OwnershipTransfers (
  transfer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  watch_id INT UNSIGNED NOT NULL,
  from_user_id INT UNSIGNED NOT NULL,
  to_user_id INT UNSIGNED NOT NULL,
  initiated_by_user_id INT UNSIGNED NOT NULL,
  status ENUM('Pending', 'Accepted', 'Declined', 'Canceled') NOT NULL DEFAULT 'Pending',
  note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  CONSTRAINT fk_transfers_org FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_transfers_watch FOREIGN KEY (watch_id) REFERENCES Watches(watch_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_transfers_from FOREIGN KEY (from_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_transfers_to FOREIGN KEY (to_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_transfers_initiator FOREIGN KEY (initiated_by_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_transfers_user_status (to_user_id, status)
) ENGINE=InnoDB;

CREATE TABLE Notifications (
  notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message VARCHAR(500) NOT NULL,
  link_path VARCHAR(255) NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, read_at, created_at)
) ENGINE=InnoDB;

CREATE TABLE ApiKeys (
  api_key_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  created_by_user_id INT UNSIGNED NOT NULL,
  key_name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(16) NOT NULL,
  key_hash CHAR(64) NOT NULL UNIQUE,
  last_used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_api_keys_org FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_api_keys_creator FOREIGN KEY (created_by_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_api_keys_org (organization_id)
) ENGINE=InnoDB;

CREATE TABLE Webhooks (
  webhook_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  created_by_user_id INT UNSIGNED NOT NULL,
  endpoint_url VARCHAR(500) NOT NULL,
  secret_hash CHAR(64) NOT NULL,
  event_types JSON NOT NULL,
  status ENUM('Active', 'Disabled') NOT NULL DEFAULT 'Active',
  last_delivery_at TIMESTAMP NULL,
  last_status_code SMALLINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_webhooks_org FOREIGN KEY (organization_id) REFERENCES Organizations(organization_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_webhooks_creator FOREIGN KEY (created_by_user_id) REFERENCES Users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_webhooks_org_status (organization_id, status)
) ENGINE=InnoDB;

INSERT INTO Plans (plan_code, plan_name, monthly_price, watch_limit, user_limit, evidence_limit_mb, api_access, white_label)
VALUES
  ('starter', 'Starter', 19.00, 25, 3, 1000, FALSE, FALSE),
  ('professional', 'Professional', 79.00, 500, 20, 20000, TRUE, FALSE),
  ('enterprise', 'Enterprise', 249.00, NULL, NULL, NULL, TRUE, TRUE);

UPDATE Organizations
SET slug = LOWER(REPLACE(organization_name, ' ', '-'))
WHERE slug IS NULL;

UPDATE Watches
SET public_token = UUID()
WHERE public_token IS NULL;

INSERT INTO Subscriptions (organization_id, plan_id, status)
SELECT o.organization_id,
       COALESCE(
         (SELECT p.plan_id FROM Plans p WHERE LOWER(p.plan_name) = LOWER(o.plan) LIMIT 1),
         (SELECT p.plan_id FROM Plans p WHERE p.plan_code = 'professional' LIMIT 1)
       ),
       'Active'
FROM Organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM Subscriptions s WHERE s.organization_id = o.organization_id
);
