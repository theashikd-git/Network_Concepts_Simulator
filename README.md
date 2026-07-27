# Network Concepts Simulator (Prototype)

This branch contains the **original prototype** of the Network Concepts Simulator.

The purpose of this prototype was to validate the idea of teaching networking
concepts through interactive, browser-based simulations using only HTML, CSS,
and JavaScript.

It serves as the foundation for the current project and is preserved as a
historical reference. Active development continues in the **main** branch.

---

## Overview

The prototype demonstrates how networking concepts can be visualized rather
than simply explained through text.

Users can interact with simulations to understand how network communication
works step by step.

---

## Implemented Modules

| Module | Status | Description |
|---------|--------|-------------|
| **OSI Model** | ✅ Complete | Simulates packet encapsulation on the client, transmission across the network, and decapsulation on the server through all seven OSI layers. |
| **ARP** | ✅ Complete | Demonstrates how Address Resolution Protocol resolves an IP address into a MAC address using broadcast requests and unicast replies. |

---

## Planned Modules

The following networking topics were planned for future development but were
not implemented in this prototype.

- DNS (Domain Name System)
- TCP Three-Way Handshake
- UDP Communication
- DHCP
- Routing

These modules are implemented or under development in the **main** branch.

---

## Project Structure

```
Network_Concepts_Simulator/
├── index.html
├── styles.css
├── script.js
└── README.md
```

### File Descriptions

| File | Purpose |
|------|---------|
| **index.html** | Contains the application layout, navigation, dashboard, OSI Model panel, and ARP simulation interface. |
| **styles.css** | Defines the application's layout, colors, animations, responsive design, and visual styling. |
| **script.js** | Implements the simulation logic, animations, reusable step player, OSI Model simulation, ARP simulation, and navigation between sections. |
| **README.md** | Documentation for the prototype project. |

---

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- SVG

No frameworks, build tools, or external libraries are required.

---

## Running the Prototype

1. Clone or download the repository.
2. Switch to the **prototype** branch.
3. Open `index.html` in any modern web browser.

No installation or server is required.

---

## Educational Purpose

This prototype was created to demonstrate networking concepts visually,
allowing students to observe how protocols operate internally instead of
memorizing theoretical definitions.

It focuses on:

- OSI Model
- Packet encapsulation
- Packet decapsulation
- ARP request and reply
- MAC address resolution

---

## Project Evolution

This prototype represents the first working implementation of the Network
Concepts Simulator.

The project has since evolved into a larger, modular application with additional
features and an improved architecture.

The latest development is available in the **main** branch.

---

## License

Educational project.

Free to use, modify, and extend for learning purposes.
