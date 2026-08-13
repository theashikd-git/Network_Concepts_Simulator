# Network Concepts Simulator

An interactive, web-based learning platform that helps students understand core computer networking concepts — the **OSI Model**, **ARP**, and **DNS** — through hands-on, step-by-step simulations. Built as a full-stack PHP/MySQL application with student accounts, progress tracking, quizzes, notes, certificates, and an admin panel.

---

## 1. Overview

Traditional networking lectures are theoretical — students read about how a packet moves through the OSI layers or how ARP resolves a MAC address, but rarely *see* it happen. This project turns those concepts into interactive simulations where a student clicks through each step (e.g., a request descending the 7 OSI layers, crossing the network, and climbing back up) and sees exactly what happens at every stage.

On top of the simulations, the platform behaves like a small **Learning Management System (LMS)**:

- Students register, log in, and have their own dashboard.
- Progress through each module is tracked automatically.
- Each module has an auto-graded quiz.
- Students can take personal notes per module.
- Completing every module unlocks a printable certificate.
- Admins get a panel to manage students, quiz questions, scores, and reports.

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend | PHP (procedural, PDO for database access) |
| Database | MySQL / MariaDB (InnoDB) |
| Frontend | HTML, CSS, vanilla JavaScript (no frameworks) |
| Server environment | XAMPP (Apache + MySQL + PHP) |
| Auth | PHP sessions, `password_hash()` (bcrypt), CSRF tokens |

No external frameworks or libraries are used — the entire stack is hand-built, which was a deliberate choice to demonstrate understanding of the fundamentals (routing, sessions, prepared statements, etc.) rather than relying on a framework to handle them.

## 3. Learning Modules

| Module | Slug | Status | Description |
|---|---|---|---|
| OSI Model | `osi` | ✅ Active | Follow a request down 7 layers, across the network, and up the server's 7 layers |
| ARP | `arp` | ✅ Active | Watch a PC broadcast an ARP request to everyone and only the correct device reply |
| DNS | `dns` | ✅ Active | Simulates domain name resolution step by step |
| TCP | `tcp` | 🔜 Planned | Reliable connections and the three-way handshake |
| UDP | `udp` | 🔜 Planned | Fast, connectionless delivery |
| DHCP | `dhcp` | 🔜 Planned | Automatic IP assignment |
| Routing | `routing` | 🔜 Planned | How routers choose a path |

Planned modules already exist as rows in the database (marked "coming soon") so the roadmap is visible on the dashboard without any extra code.

## 4. Core Features

### Student-facing
- **Authentication** — registration, login, logout, hashed passwords, CSRF-protected forms.
- **Dashboard** — welcome banner, profile picture, overall progress bar, "Continue Learning" shortcut, recent simulations, per-module status (✔ completed / ⏳ in progress / ❌ not started).
- **Simulations** — interactive OSI, ARP, and DNS modules with step-by-step visual walkthroughs.
- **Automatic progress tracking** — a lightweight JavaScript "hook" watches each simulator from the outside and reports `in_progress` / `completed` to the server, without modifying the simulator's own code.
- **Quizzes** — auto-graded, multiple-choice, per module, with attempt history and right/wrong feedback.
- **Notes** — one editable note per student per module.
- **Favorites** — star modules for quick access from the dashboard.
- **Profile management** — edit name/email, change password, upload an avatar.
- **Certificate** — unlocks automatically once every active module is completed; generated once per student with a unique ID and a print/PDF button.

### Admin-facing
- **Student management** — view all students and their progress; delete a student (cascades to their progress, notes, favorites, and quiz history).
- **Question management** — add/edit quiz questions per module.
- **Scores overview** — view quiz results across students.
- **Reports** — total students, completed simulations, average quiz score, most popular module.
- Admin routes are protected by `requireAdmin()`, which re-checks the student's role in the database on every page load (not just a cached session flag).

## 5. Security Measures

- **Password hashing** — bcrypt via PHP's `password_hash()`; passwords are never stored in plain text.
- **SQL injection prevention** — every database query uses PDO prepared statements.
- **CSRF protection** — every form (and every JSON API call) includes and validates a CSRF token.
- **Safe error messages** — login failures return a generic "Incorrect email or password" so the system never reveals whether an email is registered.
- **Access control** — protected pages use `requireLogin()`; admin-only pages use `requireAdmin()`.
- **Direct-access blocking** — the `includes/` and `sql/` folders each contain a `.htaccess` file that blocks direct browser access; they can only be loaded via PHP's `require`.
- **Secure file uploads** — avatar uploads are validated by real file content (not filename or MIME header), capped at 2MB, and saved under a filename derived from the user's own ID. The `uploads/` folder has PHP execution disabled, so even a disguised malicious file can never run as a script.

## 6. Project Structure

```
Network_Simulator/
├── api/                        # JSON endpoints called by JavaScript
│   ├── save_progress.php       # Records in_progress / completed status per module
│   └── toggle_favorite.php     # Stars/unstars a module
├── includes/                   # Shared PHP logic (not web-accessible)
│   ├── auth.php                # Session handling, login guard, CSRF helpers
│   ├── config.php              # Database credentials
│   ├── db.php                  # PDO database connection
│   └── dashboard_data.php      # Queries that power the dashboard
├── public/                     # Web root
│   ├── index.php               # Routes to login / dashboard / admin
│   ├── login.php / register.php / logout.php
│   ├── dashboard.php           # Main student dashboard
│   ├── profile.php             # Edit profile, password, avatar
│   ├── quiz.php                # Quiz UI + auto-grading
│   ├── notes.php                # Per-module notes
│   ├── certificate.php         # Certificate generation
│   ├── admin/                  # Admin panel
│   │   ├── students.php
│   │   ├── questions.php
│   │   ├── scores.php
│   │   └── reports.php
│   ├── modules/                # The actual simulations
│   │   ├── osi/
│   │   ├── arp/
│   │   └── dns/
│   ├── assets/                 # Shared CSS/JS (base, dashboard, auth, shared.js, progress-hook.js)
│   └── uploads/avatars/        # User-uploaded avatars (PHP execution disabled)
└── sql/
    └── schema.sql               # Full database schema (safe to re-run)
```

## 7. Database Schema (summary)

| Table | Purpose |
|---|---|
| `users` | Student/admin accounts (name, email, password hash, role, avatar) |
| `simulations` | Catalog of learning modules (active/inactive, order, icon) |
| `user_progress` | One row per (student, module): status, time spent, timestamps |
| `quiz_questions` | Multiple-choice questions per module |
| `quiz_attempts` | Recorded quiz attempts and scores |
| `notes` | One note per student per module |
| `favorites` | Student-starred modules |

Foreign keys use `ON DELETE CASCADE`, so deleting a student automatically removes their progress, notes, favorites, and quiz history.

## 8. Setup Instructions (XAMPP)

1. Start **Apache** and **MySQL** in the XAMPP control panel.
2. Place the project folder inside `htdocs`, e.g. `C:\xampp\htdocs\network-simulator\`.
3. Open [phpMyAdmin](http://localhost/phpmyadmin) → **SQL** tab → paste and run the contents of `sql/schema.sql`.
4. Check `includes/config.php` — defaults match a fresh XAMPP install (`root` user, empty password). Edit only if your setup differs.
5. Visit `http://localhost/network-simulator/public/` — you should land on the login page.
6. Register an account, then log in.
7. **To create an admin account:** register normally, then in phpMyAdmin run:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
   Log out and back in to see the "Admin panel" link.

## 9. Development Approach

The project was built incrementally in phases, each one adding a working, testable slice of functionality rather than building everything at once:

1. **Phase 2 — Authentication**: database, registration, login/logout, session-protected dashboard placeholder.
2. **Phase 3 — Student Dashboard**: real dashboard UI, progress bar, "Continue Learning," recent activity — all driven by real (not faked) data.
3. **Phase 4 — Profile**: edit details, change password, avatar upload.
4. **Phase 5 — Connecting simulations**: JavaScript hook reports progress to the server as students use each simulator.
5. **Phase 6 — Quiz**: auto-graded multiple-choice quizzes per module.
6. **Phase 7 — Notes**: per-student, per-module notes.
7. **Phase 8 — Favorites**: star/unstar modules.
8. **Phase 9 — Progress tracking**: dashboard reflects real ✔/⏳/❌ status per module.
9. **Phase 10 — Certificate**: unlocked on 100% completion, generated once per student.
10. **Phase 11 — Admin Panel**: manage students, questions, scores.
11. **Phase 12 — Reports**: aggregate statistics for admins.
12. **Fix pass**: connected the ARP and DNS modules into the authenticated app (they previously had no page to load), removed a static file that bypassed login entirely, rebuilt the progress-tracking script, and activated ARP/DNS as usable modules with their own quizzes.

Each phase was manually tested end-to-end (registering accounts, completing modules in a real browser, checking the database directly) before moving to the next, rather than assuming code was correct just because it ran without errors.

## 10. What This Project Demonstrates

- Full-stack web development using core PHP and MySQL, without relying on a framework.
- Secure authentication and session management from first principles.
- Relational database design (foreign keys, cascading deletes, junction-style progress tracking).
- Building interactive, stateful front-end simulations with vanilla JavaScript.
- Connecting front-end interactivity to a backend via a JSON API, without touching the original simulation code (event-driven "hook" pattern).
- Role-based access control (student vs. admin).
- Iterative, phase-based development with real testing at every step rather than a single untested build.

## 11. Possible Future Work

- Implement the remaining planned modules: TCP, UDP, DHCP, Routing.
- Add password reset via email.
- Add pagination/search to the admin student list for larger classes.
- Export admin reports as CSV/PDF.
