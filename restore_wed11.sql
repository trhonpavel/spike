-- =============================================================
-- Obnova dat po smazaném volume
-- Turnaje: wed11 (3 finalizovaná kola) + Pick-up 11.3 (1 kolo bez skóre)
-- Spuštění: podman exec -i spike_db_1 psql -U spike spike < restore_wed11.sql
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- TURNAJE
-- -------------------------------------------------------------
INSERT INTO tournaments (id, name, slug, admin_token, status, created_at) VALUES
(15, 'wed11',        'wed11',        'wed11adminrestore2026000000000', 'active', NOW()),
(16, 'Pick-up 11.3', 'pick-up-113',  'pickup113restore2026000000000', 'active', NOW());

-- -------------------------------------------------------------
-- HRÁČI — wed11 (tournament_id=15)
-- ID  | Jméno | wins | losses | games | balls_won | balls_total | pt_diff | rating   | elo
-- 101   Ondra    6      3       9      88          156           20        13.13     1556.24
-- 102   Micha    6      3       9      91          165           17        13.10     1556.96
-- 103   Denis    6      3       9      88          165           11        13.07     1563.84
-- 104   Dan      5      4       9      77          149            5        11.03     1512.75
-- 105   Hanna    5      4       9      70          140            0        11.00     1511.29
-- 106   Pejvl    4      5       9      78          150            6         9.04     1489.82
-- 107   Akela    3      6       9      74          155           -7         6.95     1454.45
-- 108   Honza    1      8       9      44          140          -52         2.63     1354.65
-- -------------------------------------------------------------
INSERT INTO players (id, tournament_id, name, wins, losses, games_played, balls_won, balls_total, point_differential, rating, elo_rating, waitings) VALUES
(101, 15, 'Ondra', 6, 3, 9,  88, 156,  20, 13.13, 1556.24, 0),
(102, 15, 'Micha', 6, 3, 9,  91, 165,  17, 13.10, 1556.96, 0),
(103, 15, 'Denis', 6, 3, 9,  88, 165,  11, 13.07, 1563.84, 0),
(104, 15, 'Dan',   5, 4, 9,  77, 149,   5, 11.03, 1512.75, 0),
(105, 15, 'Hanna', 5, 4, 9,  70, 140,   0, 11.00, 1511.29, 0),
(106, 15, 'Pejvl', 4, 5, 9,  78, 150,   6,  9.04, 1489.82, 0),
(107, 15, 'Akela', 3, 6, 9,  74, 155,  -7,  6.95, 1454.45, 0),
(108, 15, 'Honza', 1, 8, 9,  44, 140, -52,  2.63, 1354.65, 0);

-- Hráči Pick-up 11.3 (tournament_id=16)
INSERT INTO players (id, tournament_id, name, wins, losses, games_played, balls_won, balls_total, point_differential, rating, elo_rating, waitings) VALUES
(111, 16, 'Denis',  0, 0, 0, 0, 0, 0, 0.0, 1500.0, 0),
(112, 16, 'Micha',  0, 0, 0, 0, 0, 0, 0.0, 1500.0, 0),
(113, 16, 'Hannah', 0, 0, 0, 0, 0, 0, 0.0, 1500.0, 0),
(114, 16, 'Ondrej', 0, 0, 0, 0, 0, 0, 0.0, 1500.0, 0);

-- -------------------------------------------------------------
-- KOLA
-- -------------------------------------------------------------
INSERT INTO rounds (id, tournament_id, round_number, status) VALUES
(11, 16, 1, 'drawn'),
(12, 15, 1, 'finalized'),
(13, 15, 2, 'finalized'),
(14, 15, 3, 'finalized');

-- -------------------------------------------------------------
-- SKUPINY
-- Skupiny wed11: p1,p2 vs p3,p4 (match_index 0), p1,p3 vs p2,p4 (1), p1,p4 vs p2,p3 (2)
--
-- Kolo 12 skupina 0: Pejvl(106)+Micha(102) vs Dan(104)+Denis(103)
-- Kolo 12 skupina 1: Hanna(105)+Akela(107) vs Honza(108)+Ondra(101)
-- Kolo 13 skupina 0: Ondra(101)+Micha(102) vs Akela(107)+Denis(103)
-- Kolo 13 skupina 1: Pejvl(106)+Hanna(105) vs Dan(104)+Honza(108)
-- Kolo 14 skupina 0: Micha(102)+Ondra(101) vs Pejvl(106)+Denis(103)
-- Kolo 14 skupina 1: Hanna(105)+Dan(104) vs Akela(107)+Honza(108)
-- -------------------------------------------------------------
INSERT INTO groups (id, round_id, group_index, player1_id, player2_id, player3_id, player4_id) VALUES
-- Pick-up 11.3
(11, 11, 0, 111, 112, 113, 114),
-- wed11 kolo 1
(21, 12, 0, 106, 102, 104, 103),
(22, 12, 1, 105, 107, 108, 101),
-- wed11 kolo 2
(23, 13, 0, 101, 102, 107, 103),
(24, 13, 1, 106, 105, 104, 108),
-- wed11 kolo 3
(25, 14, 0, 102, 101, 106, 103),
(26, 14, 1, 105, 104, 107, 108);

-- -------------------------------------------------------------
-- ZÁPASY
-- -------------------------------------------------------------
-- Pick-up 11.3 (bez skóre, kolo drawn)
INSERT INTO matches (id, group_id, match_index, team1_p1_id, team1_p2_id, team2_p1_id, team2_p2_id, score_team1, score_team2) VALUES
(31, 11, 0, 111, 112, 113, 114, NULL, NULL),
(32, 11, 1, 111, 113, 112, 114, NULL, NULL),
(33, 11, 2, 111, 114, 112, 113, NULL, NULL);

-- wed11 kolo 1, skupina 0 (Pejvl+Micha vs Dan+Denis)
INSERT INTO matches (id, group_id, match_index, team1_p1_id, team1_p2_id, team2_p1_id, team2_p2_id, score_team1, score_team2) VALUES
(34, 21, 0, 106, 102, 104, 103, 11,  6),  -- Pejvl+Micha W, Dan+Denis L
(35, 21, 1, 106, 104, 102, 103,  7, 11),  -- Pejvl+Dan L, Micha+Denis W
(36, 21, 2, 106, 103, 102, 104,  9, 11);  -- Pejvl+Denis L, Micha+Dan W

-- wed11 kolo 1, skupina 1 (Hanna+Akela vs Honza+Ondra)
INSERT INTO matches (id, group_id, match_index, team1_p1_id, team1_p2_id, team2_p1_id, team2_p2_id, score_team1, score_team2) VALUES
(37, 22, 0, 105, 107, 108, 101,  9, 11),  -- Hanna+Akela L, Honza+Ondra W
(38, 22, 1, 105, 108, 107, 101,  1, 11),  -- Hanna+Honza L, Akela+Ondra W
(39, 22, 2, 105, 101, 107, 108, 11,  3);  -- Hanna+Ondra W, Akela+Honza L

-- wed11 kolo 2, skupina 0 (Ondra+Micha vs Akela+Denis)
INSERT INTO matches (id, group_id, match_index, team1_p1_id, team1_p2_id, team2_p1_id, team2_p2_id, score_team1, score_team2) VALUES
(40, 23, 0, 101, 102, 107, 103, 11,  6),  -- Ondra+Micha W, Akela+Denis L
(41, 23, 1, 101, 107, 102, 103,  6, 11),  -- Ondra+Akela L, Micha+Denis W
(42, 23, 2, 101, 103, 102, 107, 12, 10);  -- Ondra+Denis W, Micha+Akela L

-- wed11 kolo 2, skupina 1 (Pejvl+Hanna vs Dan+Honza)
INSERT INTO matches (id, group_id, match_index, team1_p1_id, team1_p2_id, team2_p1_id, team2_p2_id, score_team1, score_team2) VALUES
(43, 24, 0, 106, 105, 104, 108, 11,  1),  -- Pejvl+Hanna W, Dan+Honza L
(44, 24, 1, 106, 104, 105, 108, 11,  1),  -- Pejvl+Dan W, Hanna+Honza L
(45, 24, 2, 106, 108, 105, 104,  6, 11);  -- Pejvl+Honza L, Hanna+Dan W

-- wed11 kolo 3, skupina 0 (Micha+Ondra vs Pejvl+Denis)
INSERT INTO matches (id, group_id, match_index, team1_p1_id, team1_p2_id, team2_p1_id, team2_p2_id, score_team1, score_team2) VALUES
(46, 25, 0, 102, 101, 106, 103,  9, 11),  -- Micha+Ondra L, Pejvl+Denis W
(47, 25, 1, 102, 106, 101, 103,  6, 11),  -- Micha+Pejvl L, Ondra+Denis W
(48, 25, 2, 102, 103, 101, 106, 11,  6);  -- Micha+Denis W, Ondra+Pejvl L

-- wed11 kolo 3, skupina 1 (Hanna+Dan vs Akela+Honza)
INSERT INTO matches (id, group_id, match_index, team1_p1_id, team1_p2_id, team2_p1_id, team2_p2_id, score_team1, score_team2) VALUES
(49, 26, 0, 105, 104, 107, 108,  9,  6),  -- Hanna+Dan W, Akela+Honza L
(50, 26, 1, 105, 107, 104, 108, 12, 10),  -- Hanna+Akela W, Dan+Honza L
(51, 26, 2, 105, 108, 104, 107,  5, 11);  -- Hanna+Honza L, Dan+Akela W

-- -------------------------------------------------------------
-- MATCH_PLAYER_STATS (Elo history — 72 řádků, 8 hráčů × 9 zápasů)
-- Ověřeno ze zálohy psql výpisů.
-- -------------------------------------------------------------
INSERT INTO match_player_stats (match_id, player_id, side, partner_id, score_for, score_against, won, elo_before, elo_after) VALUES
-- Akela (107) — matches 37,38,39,40,41,42,49,50,51
(37, 107, 'team1', 105,  9, 11, false, 1500.00,  1484.00),
(38, 107, 'team2', 101, 11,  1, true,  1484.00,  1508.00),
(39, 107, 'team2', 108,  3, 11, false, 1508.00,  1484.00),
(40, 107, 'team2', 103,  6, 11, false, 1484.00,  1468.31),
(41, 107, 'team1', 101,  6, 11, false, 1468.31,  1448.08),
(42, 107, 'team2', 102, 10, 12, false, 1448.08,  1432.26),
(49, 107, 'team2', 108,  6,  9, false, 1432.26,  1420.01),
(50, 107, 'team1', 105, 12, 10, true,  1420.01,  1435.14),
(51, 107, 'team2', 104, 11,  5, true,  1435.14,  1454.45),
-- Dan (104) — matches 34,35,36,43,44,45,49,50,51
(34, 104, 'team2', 103,  6, 11, false, 1500.00,  1480.00),
(35, 104, 'team1', 106,  7, 11, false, 1480.00,  1460.00),
(36, 104, 'team2', 102, 11,  9, true,  1460.00,  1476.00),
(43, 104, 'team2', 108,  1, 11, false, 1476.00,  1452.83),
(44, 104, 'team1', 106, 11,  1, true,  1452.83,  1476.55),
(45, 104, 'team2', 105, 11,  6, true,  1476.55,  1496.32),
(49, 104, 'team1', 105,  9,  6, true,  1496.32,  1508.57),
(50, 104, 'team2', 108, 10, 12, false, 1508.57,  1493.44),
(51, 104, 'team2', 107, 11,  5, true,  1493.44,  1512.75),
-- Denis (103) — matches 34,35,36,40,41,42,46,47,48
(34, 103, 'team2', 104,  6, 11, false, 1500.00,  1480.00),
(35, 103, 'team2', 102, 11,  7, true,  1480.00,  1500.00),
(36, 103, 'team1', 106,  9, 11, false, 1500.00,  1484.00),
(40, 103, 'team2', 107,  6, 11, false, 1484.00,  1468.31),
(41, 103, 'team2', 102, 11,  6, true,  1468.31,  1488.54),
(42, 103, 'team1', 101, 12, 10, true,  1488.54,  1504.36),
(46, 103, 'team2', 106, 11,  9, true,  1504.36,  1523.45),
(47, 103, 'team2', 101, 11,  6, true,  1523.45,  1543.67),
(48, 103, 'team1', 102, 11,  6, true,  1543.67,  1563.84),
-- Hanna (105) — matches 37,38,39,43,44,45,49,50,51
(37, 105, 'team1', 107,  9, 11, false, 1500.00,  1484.00),
(38, 105, 'team1', 108,  1, 11, false, 1484.00,  1460.00),
(39, 105, 'team1', 101, 11,  3, true,  1460.00,  1484.00),
(43, 105, 'team1', 106, 11,  1, true,  1484.00,  1507.17),
(44, 105, 'team2', 108,  1, 11, false, 1507.17,  1483.45),
(45, 105, 'team2', 104, 11,  6, true,  1483.45,  1503.22),
(49, 105, 'team1', 104,  9,  6, true,  1503.22,  1515.47),
(50, 105, 'team1', 107, 12, 10, true,  1515.47,  1530.60),
(51, 105, 'team1', 108,  5, 11, false, 1530.60,  1511.29),
-- Honza (108) — matches 37,38,39,43,44,45,49,50,51
(37, 108, 'team2', 101, 11,  9, true,  1500.00,  1516.00),
(38, 108, 'team1', 105,  1, 11, false, 1516.00,  1492.00),
(39, 108, 'team2', 107,  3, 11, false, 1492.00,  1468.00),
(43, 108, 'team2', 104,  1, 11, false, 1468.00,  1444.83),
(44, 108, 'team2', 105,  1, 11, false, 1444.83,  1421.11),
(45, 108, 'team1', 106,  6, 11, false, 1421.11,  1401.34),
(49, 108, 'team2', 107,  6,  9, false, 1401.34,  1389.09),
(50, 108, 'team2', 104, 10, 12, false, 1389.09,  1373.96),
(51, 108, 'team1', 105,  5, 11, false, 1373.96,  1354.65),
-- Micha (102) — matches 34,35,36,40,41,42,46,47,48
(34, 102, 'team1', 106, 11,  6, true,  1500.00,  1520.00),
(35, 102, 'team2', 103, 11,  7, true,  1520.00,  1540.00),
(36, 102, 'team2', 104, 11,  9, true,  1540.00,  1556.00),
(40, 102, 'team1', 101, 11,  6, true,  1556.00,  1571.69),
(41, 102, 'team2', 103, 11,  6, true,  1571.69,  1591.92),
(42, 102, 'team2', 107, 10, 12, false, 1591.92,  1576.10),
(46, 102, 'team1', 101,  9, 11, false, 1576.10,  1557.01),
(47, 102, 'team1', 106,  6, 11, false, 1557.01,  1536.79),
(48, 102, 'team1', 103, 11,  6, true,  1536.79,  1556.96),
-- Ondra (101) — matches 37,38,39,40,41,42,46,47,48
(37, 101, 'team2', 108, 11,  9, true,  1500.00,  1516.00),
(38, 101, 'team2', 107, 11,  1, true,  1516.00,  1540.00),
(39, 101, 'team1', 105, 11,  3, true,  1540.00,  1564.00),
(40, 101, 'team1', 102, 11,  6, true,  1564.00,  1579.69),
(41, 101, 'team1', 107,  6, 11, false, 1579.69,  1559.46),
(42, 101, 'team1', 103, 12, 10, true,  1559.46,  1575.28),
(46, 101, 'team1', 102,  9, 11, false, 1575.28,  1556.19),
(47, 101, 'team2', 103, 11,  6, true,  1556.19,  1576.41),
(48, 101, 'team2', 106,  6, 11, false, 1576.41,  1556.24),
-- Pejvl (106) — matches 34,35,36,43,44,45,46,47,48
(34, 106, 'team1', 102, 11,  6, true,  1500.00,  1520.00),
(35, 106, 'team1', 104,  7, 11, false, 1520.00,  1500.00),
(36, 106, 'team1', 103,  9, 11, false, 1500.00,  1484.00),
(43, 106, 'team1', 105, 11,  1, true,  1484.00,  1507.17),
(44, 106, 'team1', 104, 11,  1, true,  1507.17,  1530.89),
(45, 106, 'team1', 108,  6, 11, false, 1530.89,  1511.12),
(46, 106, 'team2', 103, 11,  9, true,  1511.12,  1530.21),
(47, 106, 'team1', 102,  6, 11, false, 1530.21,  1509.99),
(48, 106, 'team2', 101,  6, 11, false, 1509.99,  1489.82);

-- -------------------------------------------------------------
-- PARTNER_RECORDS (synergy pro wed11, tournament_id=15)
-- Vždy player1_id = min(id), player2_id = max(id)
-- -------------------------------------------------------------
INSERT INTO partner_records (tournament_id, player1_id, player2_id, games_together, wins_together, point_diff_together) VALUES
(15, 101, 102,  2, 1,   3),  -- Ondra+Micha: W(40) L(46), +5-2=+3
(15, 101, 103,  2, 2,   7),  -- Ondra+Denis: W(42)+2 W(47)+5=+7
(15, 101, 105,  1, 1,   8),  -- Ondra+Hanna: W(39) +8
(15, 101, 106,  1, 0,  -5),  -- Ondra+Pejvl: L(48) -5
(15, 101, 107,  2, 1,   5),  -- Ondra+Akela: W(38)+10 L(41)-5=+5
(15, 101, 108,  1, 1,   2),  -- Ondra+Honza: W(37) +2
(15, 102, 103,  3, 3,  14),  -- Micha+Denis: W(35)+4 W(41)+5 W(48)+5=+14
(15, 102, 104,  1, 1,   2),  -- Micha+Dan:   W(36) +2
(15, 102, 106,  2, 1,   0),  -- Micha+Pejvl: W(34)+5 L(47)-5=0
(15, 102, 107,  1, 0,  -2),  -- Micha+Akela: L(42) -2
(15, 103, 104,  1, 0,  -5),  -- Denis+Dan:   L(34) -5
(15, 103, 106,  2, 1,   0),  -- Denis+Pejvl: L(36)-2 W(46)+2=0
(15, 103, 107,  1, 0,  -5),  -- Denis+Akela: L(40) -5
(15, 104, 105,  2, 2,   8),  -- Dan+Hanna:   W(45)+5 W(49)+3=+8
(15, 104, 106,  2, 1,   6),  -- Dan+Pejvl:   L(35)-4 W(44)+10=+6
(15, 104, 107,  1, 1,   6),  -- Dan+Akela:   W(51) +6
(15, 104, 108,  2, 0, -12),  -- Dan+Honza:   L(43)-10 L(50)-2=-12
(15, 105, 106,  1, 1,  10),  -- Hanna+Pejvl: W(43) +10
(15, 105, 107,  2, 1,   0),  -- Hanna+Akela: L(37)-2 W(50)+2=0
(15, 105, 108,  3, 0, -26),  -- Hanna+Honza: L(38)-10 L(44)-10 L(51)-6=-26
(15, 106, 108,  1, 0,  -5),  -- Pejvl+Honza: L(45) -5
(15, 107, 108,  2, 0, -11);  -- Akela+Honza: L(39)-8 L(49)-3=-11

-- -------------------------------------------------------------
-- OPRAVA SEKVENCÍ (aby nová INSERT přes API dostala správná ID)
-- -------------------------------------------------------------
SELECT setval('tournaments_id_seq',        (SELECT MAX(id) FROM tournaments));
SELECT setval('players_id_seq',            (SELECT MAX(id) FROM players));
SELECT setval('rounds_id_seq',             (SELECT MAX(id) FROM rounds));
SELECT setval('groups_id_seq',             (SELECT MAX(id) FROM groups));
SELECT setval('matches_id_seq',            (SELECT MAX(id) FROM matches));
SELECT setval('match_player_stats_id_seq', (SELECT MAX(id) FROM match_player_stats));
SELECT setval('partner_records_id_seq',    (SELECT MAX(id) FROM partner_records));

COMMIT;

-- -------------------------------------------------------------
-- OVĚŘENÍ
-- -------------------------------------------------------------
SELECT p.name, p.wins, p.losses, p.rating, p.elo_rating::int AS elo
FROM players p WHERE tournament_id = 15 ORDER BY rating DESC;
