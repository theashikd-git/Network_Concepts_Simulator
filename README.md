<div align="center">

# 🖧 Network Concepts Simulator

### Learn networking by *watching it happen* not just reading about it.

An interactive, full-stack learning platform that turns abstract networking theory (OSI Model, ARP, DNS) into hands-on, step-by-step simulations complete with student accounts, progress tracking, quizzes, notes, and certificates.

![PHP](https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

</div>

---

## 📚 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Learning Modules](#-learning-modules)
- [Core Features](#-core-features)
- [Security](#-security-measures)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Setup Guide](#-setup-instructions-xampp)
- [Development Journey](#-development-journey)
- [What This Project Demonstrates](#-what-this-project-demonstrates)
- [Future Work](#-future-work)

---

## 🎯 Overview

Traditional networking lectures are theoretical students read about how a packet moves through the OSI layers, or how ARP resolves a MAC address, but rarely *see* it happen.

This project turns those concepts into **interactive simulations**: a student clicks through each step a request descending 7 OSI layers, crossing the network, and climbing back up and sees exactly what happens at every stage.

On top of the simulations, the platform behaves like a small **Learning Management System (LMS)**:

> 🔐 Accounts &nbsp;•&nbsp; 📊 Progress tracking &nbsp;•&nbsp; 📝 Quizzes &nbsp;•&nbsp; 🗒️ Notes &nbsp;•&nbsp; 🎓 Certificates &nbsp;•&nbsp; 🛠️ Admin panel

---

## 🧱 Tech Stack

| Layer | Technology |
|:---|:---|
| **Backend** | PHP (procedural, PDO for database access) |
| **Database** | MySQL / MariaDB (InnoDB) |
| **Frontend** | HTML, CSS, **vanilla JavaScript** (no frameworks) |
| **Server** | XAMPP (Apache + MySQL + PHP) |
| **Auth** | PHP sessions, bcrypt (`password_hash()`), CSRF tokens |

> 💡 No external frameworks or libraries were used the entire stack is hand-built, on purpose, to demonstrate a real understanding of the fundamentals (routing, sessions, prepared statements, DOM manipulation) rather than leaning on a framework to handle them.

---

## 🧩 Learning Modules

| Module | Slug | Status | What it simulates |
|:---|:---:|:---:|:---|
| 🖥️ **OSI Model** | `osi` | ✅ Active | A request descending 7 layers, crossing the network, and climbing back up |
| 📡 **ARP** | `arp` | ✅ Active | A PC broadcasting an ARP request only the right device replies |
| 🌐 **DNS** | `dns` | ✅ Active | Step-by-step domain name resolution |
| 🔗 TCP | `tcp` | 🔜 Planned | Reliable connections & the three-way handshake |
| 📦 UDP | `udp` | 🔜 Planned | Fast, connectionless delivery |
| 🏷️ DHCP | `dhcp` | 🔜 Planned | Automatic IP assignment |
| 🧭 Routing | `routing` | 🔜 Planned | How routers choose a path |

Planned modules already exist as database rows (marked "coming soon"), so the roadmap shows up on the dashboard automatically no extra code required.

---

## ✨ Core Features

<table>
<tr>
<td valign="top" width="50%">

### 🎓 Student-Facing
- Secure registration, login, logout
- Personal dashboard with progress bar
- Interactive OSI / ARP / DNS simulations
- **Automatic progress tracking** a JS "hook" watches each simulator from the outside
- Auto-graded quizzes with attempt history
- Per-module notes
- Favorite (★) modules
- Profile editing + avatar upload
- Certificate unlocked at 100% completion

</td>
<td valign="top" width="50%">

### 🛠️ Admin-Facing
- View every student & their progress
- Delete a student (progress, notes, favorites, and quiz history cascade automatically)
- Add / edit quiz questions per module
- View quiz scores across all students
- Reports: total students, completions, average score, most popular module
- Role re-verified from the database on **every** admin page load

</td>
</tr>
</table>

---

## 🔒 Security Measures

| Measure | Implementation |
|:---|:---|
| **Password storage** | bcrypt via `password_hash()` never plain text |
| **SQL injection prevention** | Every query uses PDO prepared statements |
| **CSRF protection** | Every form & JSON API call validates a CSRF token |
| **Safe error messages** | Generic "Incorrect email or password" never reveals which part failed |
| **Access control** | `requireLogin()` and `requireAdmin()` guard every protected page |
| **Direct-access blocking** | `.htaccess` blocks browser access to `includes/` and `sql/` |
| **Secure uploads** | Avatars validated by real file content, capped at 2MB, saved under an ID-derived filename; `uploads/` has PHP execution disabled entirely |

---

## 🗂️ Project Structure

```
Network_Simulator/
├── 📁 api/                     JSON endpoints called by JavaScript
│   ├── save_progress.php       Records in_progress / completed status
│   └── toggle_favorite.php     Stars / unstars a module
├── 📁 includes/                Shared PHP logic (not web-accessible)
│   ├── auth.php                Sessions, login guard, CSRF helpers
│   ├── config.php              Database credentials
│   ├── db.php                  PDO database connection
│   └── dashboard_data.php      Queries powering the dashboard
├── 📁 public/                  Web root
│   ├── index.php               Routes → login / dashboard / admin
│   ├── login.php · register.php · logout.php
│   ├── dashboard.php           Main student dashboard
│   ├── profile.php             Edit profile, password, avatar
│   ├── quiz.php                Quiz UI + auto-grading
│   ├── notes.php               Per-module notes
│   ├── certificate.php         Certificate generation
│   ├── 📁 admin/               students · questions · scores · reports
│   ├── 📁 modules/             🖥️ osi · 📡 arp · 🌐 dns simulations
│   ├── 📁 assets/              Shared CSS/JS + progress-hook.js
│   └── 📁 uploads/avatars/     PHP execution disabled
└── 📁 sql/
    └── schema.sql               Full database schema (safe to re-run)
```

---

## 🗄️ Database Schema

| Table | Purpose |
|:---|:---|
| `users` | Accounts name, email, password hash, role, avatar |
| `simulations` | Module catalog active state, order, icon |
| `user_progress` | One row per (student, module): status, time spent, timestamps |
| `quiz_questions` | Multiple-choice questions per module |
| `quiz_attempts` | Recorded attempts and scores |
| `notes` | One note per student per module |
| `favorites` | Student-starred modules |

> 🔗 Foreign keys use `ON DELETE CASCADE` deleting a student automatically cleans up their progress, notes, favorites, and quiz history.

---

## ⚙️ Setup Instructions (XAMPP)

1. **Start** Apache and MySQL in the XAMPP control panel.
2. **Place** this folder inside `htdocs`, e.g. `C:\xampp\htdocs\network-simulator\`.
3. **Create the database** open [phpMyAdmin](http://localhost/phpmyadmin) → **SQL** tab → paste & run `sql/schema.sql`.
4. **Check credentials** in `includes/config.php` (defaults match a fresh XAMPP install).
5. **Visit** `http://localhost/network-simulator/public/` and register an account.
6. **To create an admin**, register normally then run in phpMyAdmin:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
   Log out and back in to see the **Admin panel** link.

---

## 🛤️ Development Journey

Built incrementally, phase by phase each one a working, tested slice rather than one giant build:

| Phase | Milestone |
|:---:|:---|
| 2 | 🔐 Authentication database, register/login, session-protected dashboard |
| 3 | 📊 Real dashboard progress bar, "Continue Learning," recent activity |
| 4 | 👤 Profile edit details, password change, avatar upload |
| 5 | 🔌 Connected simulations JS hook reports progress live |
| 6 | 📝 Quiz auto-graded, per module |
| 7 | 🗒️ Notes per student, per module |
| 8 | ⭐ Favorites |
| 9 | ✔️ Real progress tracking on the dashboard |
| 10 | 🎓 Certificate unlocked at 100% completion |
| 11 | 🛠️ Admin panel |
| 12 | 📈 Reports |
| | 🩹 **Fix pass** wired ARP/DNS into the authenticated app, removed a static file that bypassed login, rebuilt the progress hook, activated ARP/DNS with their own quizzes |

Each phase was manually tested end-to-end real browser, real account, real database checks before moving to the next.

---

## 🎓 What This Project Demonstrates

- ✅ Full-stack development in core PHP + MySQL, no framework
- ✅ Secure authentication & session management from first principles
- ✅ Relational database design (foreign keys, cascading deletes)
- ✅ Interactive, stateful **vanilla JavaScript** simulations
- ✅ Decoupled front-end → back-end integration via a JSON API "hook" pattern
- ✅ Role-based access control (student vs. admin)
- ✅ Iterative, phase-based development with real testing at every step

---

## 🚀 Future Work

- [ ] Implement remaining modules: TCP, UDP, DHCP, Routing
- [ ] Password reset via email
- [ ] Pagination / search for the admin student list
- [ ] Export admin reports as CSV / PDF
