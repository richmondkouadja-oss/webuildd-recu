-- =============================================
-- SEED DATA — WEBUILDD Reçus de Paiement
-- =============================================

-- Sites / Lotissements
INSERT INTO sites (id, name, city, commune, quartier) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'N''dotré', 'Abidjan', 'Abobo', 'N''dotré'),
  ('a1000000-0000-0000-0000-000000000002', 'Yamoussoukro Résidentiel', 'Yamoussoukro', 'Yamoussoukro', 'Quartier Habitat'),
  ('a1000000-0000-0000-0000-000000000003', 'Grand-Bassam Balnéaire', 'Grand-Bassam', 'Grand-Bassam', 'Zone Balnéaire'),
  ('a1000000-0000-0000-0000-000000000004', 'Bingerville Extension', 'Abidjan', 'Bingerville', 'Extension Nord'),
  ('a1000000-0000-0000-0000-000000000005', 'Cocody Angré', 'Abidjan', 'Cocody', 'Angré');

-- Lots de démonstration
INSERT INTO lots (site_id, lot_number, ilot_number, superficie, unit_price, status, title_type) VALUES
  ('a1000000-0000-0000-0000-000000000001', '001', '01', 400, 6000000, 'disponible', 'ACD'),
  ('a1000000-0000-0000-0000-000000000001', '002', '01', 400, 6000000, 'disponible', 'ACD'),
  ('a1000000-0000-0000-0000-000000000001', '003', '01', 500, 7500000, 'réservé', 'ACD'),
  ('a1000000-0000-0000-0000-000000000001', '045', '12', 400, 6000000, 'vendu', 'ACD'),
  ('a1000000-0000-0000-0000-000000000002', '010', '03', 600, 4500000, 'disponible', 'TFU'),
  ('a1000000-0000-0000-0000-000000000002', '011', '03', 600, 4500000, 'disponible', 'TFU'),
  ('a1000000-0000-0000-0000-000000000003', '101', '05', 300, 8000000, 'en_cours', 'TF Rural'),
  ('a1000000-0000-0000-0000-000000000004', '020', '02', 500, 5500000, 'disponible', 'ACD'),
  ('a1000000-0000-0000-0000-000000000005', '050', '08', 350, 15000000, 'disponible', 'TFU'),
  ('a1000000-0000-0000-0000-000000000005', '051', '08', 350, 15000000, 'réservé', 'TFU');

-- Clients de démonstration
INSERT INTO clients (id, full_name, phone_whatsapp, email, nationality, client_type, address) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'KOUAMÉ Koffi Jean', '+225 07 07 07 07 01', 'jkouame@email.com', 'Ivoirienne', 'Particulier', 'Cocody, Abidjan'),
  ('c1000000-0000-0000-0000-000000000002', 'DIALLO Aminata', '+225 05 05 05 05 02', 'aminata.diallo@email.com', 'Ivoirienne', 'Particulier', 'Marcory, Abidjan'),
  ('c1000000-0000-0000-0000-000000000003', 'SOCIÉTÉ BATIPRO SARL', '+225 27 22 33 44 55', 'contact@batipro.ci', 'Ivoirienne', 'Entreprise', 'Plateau, Abidjan'),
  ('c1000000-0000-0000-0000-000000000004', 'TRAORÉ Moussa', '+33 6 12 34 56 78', 'moussa.traore@gmail.com', 'Ivoirienne', 'Diaspora', 'Paris, France'),
  ('c1000000-0000-0000-0000-000000000005', 'BAMBA Fatoumata', '+225 01 01 01 01 05', 'fbamba@yahoo.fr', 'Ivoirienne', 'Particulier', 'Yopougon, Abidjan');

-- Reçus de démonstration
INSERT INTO receipts (id, receipt_number, receipt_date, client_id, client_name, client_phone, client_email, property_type, superficie, localisation_quartier, localisation_commune, localisation_ville, lotissement_name, quantity, unit_price, total_amount, amount_paid, amount_due, amount_paid_words, status) VALUES
  ('r1000000-0000-0000-0000-000000000001', 'WFI-2026-00001', '2026-01-15', 'c1000000-0000-0000-0000-000000000001', 'KOUAMÉ Koffi Jean', '+225 07 07 07 07 01', 'jkouame@email.com', 'terrain', 400, 'N''dotré', 'Abobo', 'Abidjan', 'N''dotré', 1, 6000000, 6000000, 6000000, 0, 'Six millions de francs CFA', 'soldé'),
  ('r1000000-0000-0000-0000-000000000002', 'WFI-2026-00002', '2026-02-03', 'c1000000-0000-0000-0000-000000000002', 'DIALLO Aminata', '+225 05 05 05 05 02', 'aminata.diallo@email.com', 'terrain', 400, 'N''dotré', 'Abobo', 'Abidjan', 'N''dotré', 1, 6000000, 6000000, 3000000, 3000000, 'Trois millions de francs CFA', 'partiel'),
  ('r1000000-0000-0000-0000-000000000003', 'WFI-2026-00003', '2026-02-20', 'c1000000-0000-0000-0000-000000000003', 'SOCIÉTÉ BATIPRO SARL', '+225 27 22 33 44 55', 'contact@batipro.ci', 'terrain', 1200, 'Quartier Habitat', 'Yamoussoukro', 'Yamoussoukro', 'Yamoussoukro Résidentiel', 2, 4500000, 9000000, 5000000, 4000000, 'Cinq millions de francs CFA', 'partiel'),
  ('r1000000-0000-0000-0000-000000000004', 'WFI-2026-00004', '2026-03-10', 'c1000000-0000-0000-0000-000000000004', 'TRAORÉ Moussa', '+33 6 12 34 56 78', 'moussa.traore@gmail.com', 'terrain', 350, 'Angré', 'Cocody', 'Abidjan', 'Cocody Angré', 1, 15000000, 15000000, 15000000, 0, 'Quinze millions de francs CFA', 'soldé'),
  ('r1000000-0000-0000-0000-000000000005', 'WFI-2026-00005', '2026-03-25', 'c1000000-0000-0000-0000-000000000005', 'BAMBA Fatoumata', '+225 01 01 01 01 05', 'fbamba@yahoo.fr', 'terrain', 300, 'Zone Balnéaire', 'Grand-Bassam', 'Grand-Bassam', 'Grand-Bassam Balnéaire', 1, 8000000, 8000000, 2000000, 6000000, 'Deux millions de francs CFA', 'partiel'),
  ('r1000000-0000-0000-0000-000000000006', 'WFI-2026-00006', '2026-04-01', 'c1000000-0000-0000-0000-000000000001', 'KOUAMÉ Koffi Jean', '+225 07 07 07 07 01', 'jkouame@email.com', 'terrain', 500, 'Extension Nord', 'Bingerville', 'Abidjan', 'Bingerville Extension', 1, 5500000, 5500000, 3000000, 2500000, 'Trois millions de francs CFA', 'partiel'),
  ('r1000000-0000-0000-0000-000000000007', 'WFI-2026-00007', '2026-04-10', 'c1000000-0000-0000-0000-000000000002', 'DIALLO Aminata', '+225 05 05 05 05 02', 'aminata.diallo@email.com', 'maison', NULL, NULL, NULL, NULL, NULL, 1, 25000000, 25000000, 10000000, 15000000, 'Dix millions de francs CFA', 'partiel');

-- Lots associés aux reçus
INSERT INTO receipt_lots (receipt_id, ilot_number, lot_number, superficie, display_order) VALUES
  ('r1000000-0000-0000-0000-000000000001', '12', '045', 400, 1),
  ('r1000000-0000-0000-0000-000000000002', '01', '003', 400, 1),
  ('r1000000-0000-0000-0000-000000000003', '03', '010', 600, 1),
  ('r1000000-0000-0000-0000-000000000003', '03', '011', 600, 2),
  ('r1000000-0000-0000-0000-000000000004', '08', '051', 350, 1),
  ('r1000000-0000-0000-0000-000000000005', '05', '101', 300, 1),
  ('r1000000-0000-0000-0000-000000000006', '02', '020', 500, 1);

-- Avancer la séquence au-delà des données de seed
SELECT setval('receipt_seq', 7);
