USE vintage_watch_auth;

-- Development-only accounts. All passwords are: Vintage123!
INSERT INTO Organizations (organization_id, organization_name, owner_user_id, plan)
VALUES
  (1, 'Chronicle Vault Platform', NULL, 'Enterprise'),
  (2, 'Heritage Collectors Club', NULL, 'Professional'),
  (3, 'Guild of Independent Dealers', NULL, 'Starter');

INSERT INTO Users (user_id, organization_id, username, password, role)
VALUES
  (1, 1, 'superadmin', '$2b$12$wY0DlzZs8NRhTmksRepS.eWSN2nxs78UKlr9CBKCu4ZjKeDGVYKgu', 'SuperAdmin'),
  (2, 2, 'admin', '$2b$12$wY0DlzZs8NRhTmksRepS.eWSN2nxs78UKlr9CBKCu4ZjKeDGVYKgu', 'OrgAdmin'),
  (3, 2, 'viewer', '$2b$12$wY0DlzZs8NRhTmksRepS.eWSN2nxs78UKlr9CBKCu4ZjKeDGVYKgu', 'User'),
  (4, 3, 'dealer', '$2b$12$wY0DlzZs8NRhTmksRepS.eWSN2nxs78UKlr9CBKCu4ZjKeDGVYKgu', 'OrgAdmin'),
  (5, 3, 'collector', '$2b$12$wY0DlzZs8NRhTmksRepS.eWSN2nxs78UKlr9CBKCu4ZjKeDGVYKgu', 'User');

UPDATE Organizations
SET owner_user_id = CASE organization_id
  WHEN 1 THEN 1
  WHEN 2 THEN 2
  WHEN 3 THEN 4
END
WHERE organization_id IN (1, 2, 3);

INSERT INTO Brands (organization_id, brand_name, country)
VALUES
  (2, 'Omega', 'Switzerland'),
  (2, 'Rolex', 'Switzerland'),
  (3, 'Longines', 'Switzerland');

INSERT INTO Movements (organization_id, movement_name, movement_type, jewel_count)
VALUES
  (2, 'Omega Calibre 321', 'Manual', 17),
  (2, 'Rolex Calibre 1570', 'Automatic', 26),
  (3, 'Longines 30L', 'Manual', 17);

INSERT INTO Watches (
  organization_id, brand_id, movement_id, user_id, model_name, serial_number,
  production_year, case_material, watch_condition
)
VALUES
  (2, 1, 1, 3, 'Speedmaster Professional', 'CV-OMEGA-1969-001', 1969, 'Stainless Steel', 'Excellent'),
  (2, 2, 2, 2, 'Datejust 1601', 'CV-ROLEX-1972-014', 1972, 'Steel and Gold', 'Good'),
  (3, 3, 3, 5, 'Flagship', 'CV-LONGINES-1961-022', 1961, 'Gold Cap', 'Good');

INSERT INTO WatchParts (watch_id, part_name, part_status)
VALUES
  (1, 'Dial', 'Original'),
  (1, 'Crystal', 'Replacement'),
  (2, 'Bracelet', 'Original'),
  (3, 'Hands', 'Original');

INSERT INTO AuctionRecords (watch_id, auction_house, auction_date, sale_price, currency)
VALUES
  (1, 'Phillips', '2024-11-08', 18400.00, 'USD'),
  (2, 'Christie''s', '2025-05-14', 9200.00, 'USD'),
  (3, 'Sotheby''s', '2025-02-21', 6400.00, 'USD');

INSERT INTO AuthenticationChecks (
  organization_id, watch_id, user_id, check_date, serial_status, parts_status,
  auction_status, final_result, notes
)
VALUES
  (2, 1, 3, '2026-05-20', 'Verified', 'Mixed', 'Clear', 'Authentic',
   'Serial verified. Replacement crystal documented; movement and dial are period-correct.'),
  (2, 2, 2, '2026-04-12', 'Verified', 'Original', 'Clear', 'Authentic',
   'Consistent case, movement, and auction provenance.'),
  (3, 3, 5, '2026-03-03', 'Unknown', 'Original', 'No Record', 'Pending',
   'Awaiting movement photos and archive extract.');
