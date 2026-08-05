-- ============================================================
-- Network Concepts Simulator — Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS network_simulator
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE network_simulator;

-- ------------------------------------------------------------
-- users: one row per registered student
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100)      NOT NULL,
  email           VARCHAR(190)      NOT NULL,
  password_hash   VARCHAR(255)      NOT NULL,
  avatar_path     VARCHAR(255)      NULL,
  created_at      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ============================================================
-- Modules + progress tracking
-- ============================================================

-- ------------------------------------------------------------
-- simulations: the catalog of learning modules (OSI, ARP, DNS, ...).
-- is_active = 1 means the module is actually built and open to
-- students; the rest exist as rows so the dashboard/roadmap can
-- list them as "coming soon" without special-casing anything.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulations (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug         VARCHAR(50)   NOT NULL,
  title        VARCHAR(100)  NOT NULL,
  description  VARCHAR(255)  NULL,
  icon         VARCHAR(10)   NULL,
  is_active    TINYINT(1)    NOT NULL DEFAULT 0,
  sort_order   INT           NOT NULL DEFAULT 0,

  UNIQUE KEY uq_simulations_slug (slug)
) ENGINE=InnoDB;

INSERT INTO simulations (slug, title, description, icon, is_active, sort_order) VALUES
  ('osi',     'OSI Model',      'Follow a request down your 7 layers, across the network, and up the server''s 7 layers.', '🖥️', 1, 1),
  ('arp',     'ARP Simulation', 'Watch your PC broadcast to everyone and only the right device reply.',                    '📡', 1, 2),
  ('dns',     'DNS',            'Domain name resolution.',                                                                  '🌐', 1, 3),
  ('tcp',     'TCP',            'Reliable connections and the three-way handshake.',                                       '🔗', 0, 4),
  ('udp',     'UDP',            'Fast, connectionless delivery.',                                                          '📦', 0, 5),
  ('dhcp',    'DHCP',           'Automatic IP assignment.',                                                                '🏷️', 0, 6),
  ('routing', 'Routing',        'How routers choose a path.',                                                              '🧭', 0, 7)
ON DUPLICATE KEY UPDATE
  title = VALUES(title), description = VALUES(description),
  icon = VALUES(icon), is_active = VALUES(is_active), sort_order = VALUES(sort_order);

-- ------------------------------------------------------------
-- user_progress: one row per (student, module) once they've opened it.
-- One row per (student, module) once they've opened it. The module
-- pages call api/save_progress.php to write to this.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_progress (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id              INT UNSIGNED NOT NULL,
  simulation_id        INT UNSIGNED NOT NULL,
  status               ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
  time_spent_seconds   INT UNSIGNED NOT NULL DEFAULT 0,
  last_opened_at       TIMESTAMP NULL,
  completed_at         TIMESTAMP NULL,

  UNIQUE KEY uq_user_simulation (user_id, simulation_id),
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_simulation FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Admin role, lives on users since that's simplest
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('student','admin') NOT NULL DEFAULT 'student' AFTER password_hash;

-- ============================================================
-- Quizzes
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  simulation_id   INT UNSIGNED NOT NULL,
  question        VARCHAR(500) NOT NULL,
  option_a        VARCHAR(255) NOT NULL,
  option_b        VARCHAR(255) NOT NULL,
  option_c        VARCHAR(255) NOT NULL,
  option_d        VARCHAR(255) NOT NULL,
  correct_option  ENUM('a','b','c','d') NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0,

  CONSTRAINT fk_qq_simulation FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL,
  simulation_id    INT UNSIGNED NOT NULL,
  score            INT UNSIGNED NOT NULL,
  total_questions  INT UNSIGNED NOT NULL,
  attempt_number   INT UNSIGNED NOT NULL DEFAULT 1,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_qa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_qa_simulation FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed a starter quiz for the OSI module (5-10 MCQs as requested).
INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'Which OSI layer is responsible for logical addressing (IP addresses) and routing?',
  'Data Link', 'Network', 'Transport', 'Session', 'b', 1
FROM simulations WHERE slug = 'osi'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 1);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'Which layer adds MAC (hardware) addresses to a frame?',
  'Physical', 'Data Link', 'Network', 'Application', 'b', 2
FROM simulations WHERE slug = 'osi'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 2);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'TCP port numbers and reliable, ordered delivery belong to which layer?',
  'Transport', 'Session', 'Network', 'Presentation', 'a', 3
FROM simulations WHERE slug = 'osi'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 3);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'Which layer is responsible for encryption and formatting, such as TLS?',
  'Presentation', 'Application', 'Data Link', 'Network', 'a', 4
FROM simulations WHERE slug = 'osi'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 4);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'At which layer is data just a raw stream of bits on the wire?',
  'Physical', 'Data Link', 'Network', 'Transport', 'a', 5
FROM simulations WHERE slug = 'osi'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 5);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'An HTTP GET request is built at which layer?',
  'Session', 'Transport', 'Application', 'Physical', 'c', 6
FROM simulations WHERE slug = 'osi'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 6);

-- ============================================================
-- Notes
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  simulation_id  INT UNSIGNED NOT NULL,
  content        TEXT NOT NULL,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_notes_user_simulation (user_id, simulation_id),
  CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notes_simulation FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Favorites
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  user_id        INT UNSIGNED NOT NULL,
  simulation_id  INT UNSIGNED NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, simulation_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_simulation FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Certificates
-- ============================================================
CREATE TABLE IF NOT EXISTS certificates (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id            INT UNSIGNED NOT NULL,
  certificate_code   VARCHAR(40) NOT NULL,
  issued_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_certificates_code (certificate_code),
  UNIQUE KEY uq_certificates_user (user_id),
  CONSTRAINT fk_cert_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed a starter quiz for the ARP module.
INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'What does ARP resolve an IP address into?',
  'A domain name', 'A MAC address', 'A port number', 'A subnet mask', 'b', 1
FROM simulations WHERE slug = 'arp'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 1);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'How does a device send an ARP Request?',
  'Directly to one device (unicast)', 'To everyone on the local network (broadcast)', 'Only to the router', 'Only to a DNS server', 'b', 2
FROM simulations WHERE slug = 'arp'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 2);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'How does the matching device send its ARP Reply?',
  'Broadcast, like the request', 'Directly back to the requester (unicast)', 'It doesn''t reply at all', 'Through a DNS server', 'b', 3
FROM simulations WHERE slug = 'arp'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 3);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'Where does a resolved IP-to-MAC mapping get stored so the device doesn''t have to ask again right away?',
  'The DNS cache', 'The ARP cache', 'The browser cache', 'The routing table', 'b', 4
FROM simulations WHERE slug = 'arp'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 4);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'Why does a device need a MAC address at all if it already knows the destination IP?',
  'MAC addresses are required to route across the internet', 'Delivery on the local network segment is done using MAC addresses, not IPs', 'IP addresses don''t work on Wi-Fi', 'It doesn''t — ARP is optional', 'b', 5
FROM simulations WHERE slug = 'arp'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 5);

-- Seed a starter quiz for the DNS module.
INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'What does DNS convert a domain name into?',
  'A MAC address', 'An IP address', 'A port number', 'A certificate', 'b', 1
FROM simulations WHERE slug = 'dns'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 1);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'In the resolution hierarchy, which server is asked FIRST?',
  'The authoritative server', 'The TLD server', 'The root server', 'The recursive resolver''s own cache only', 'c', 2
FROM simulations WHERE slug = 'dns'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 2);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'What does a root server actually tell the resolver?',
  'The final IP address', 'Which TLD server to ask next', 'Nothing, it only answers .com', 'The MAC address of the domain''s server', 'b', 3
FROM simulations WHERE slug = 'dns'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 3);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'Which server gives the final, authoritative answer for a domain?',
  'The root server', 'The recursive resolver', 'The TLD server', 'The domain''s own authoritative nameserver', 'd', 4
FROM simulations WHERE slug = 'dns'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 4);

INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
SELECT id, 'What does the TTL on a DNS answer control?',
  'How many hops the packet can take', 'How long the answer may be cached before asking again', 'The size of the response', 'The encryption strength', 'b', 5
FROM simulations WHERE slug = 'dns'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE simulation_id = simulations.id AND sort_order = 5);
