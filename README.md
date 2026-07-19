# Network Concepts Simulator

An interactive, browser-based tool for learning how networks actually move
data   built with plain HTML, CSS, and JavaScript (no frameworks, no build
step, no dependencies).

Instead of explaining networking concepts in isolated bullet points, this
simulator animates them: type a website, and watch your request travel down
the seven layers of your PC, across the network, and up the seven layers of
the server   one step at a time.

---

## Live modules

| Module        | Status      | What it does |
|---------------|-------------|---------------|
| **OSI Model** | ✅ Ready    | Type any domain and press **Simulate**. Watch the request descend through Application → Presentation → Session → Transport → Network → Data Link → Physical on your PC (encapsulation), cross the network, then climb back up the same seven layers on the server (decapsulation). Click any layer at any time to pin its purpose, the header it adds, and a real-world example. |

## Coming soon

The dashboard also lists modules that are planned but not yet built:

- **ARP**   Address Resolution Protocol
- **DNS**   Domain name resolution
- **TCP**   Reliable connections & the three-way handshake
- **UDP**   Fast, connectionless delivery
- **DHCP**   Automatic IP assignment
- **Routing**   How routers choose a path

These appear as disabled cards on the Overview page so the roadmap is
visible, but they aren't interactive yet.

---

## Project structure

```
Network_Concepts_Simulator/
├── index.html      # Markup: dashboard, nav, and the OSI Model panel
├── styles.css       # All styling (design tokens, layout, animations)
├── script.js         # All behavior (step player, OSI simulation, tab switching)
└── README.md        # This file
```

The three files are meant to stay in the same folder   `index.html` loads
`styles.css` and `script.js` by relative path.

## Running it

No installation, no build tools, no server required.

1. Download or clone the folder.
2. Open `index.html` directly in any modern browser (Chrome, Firefox, Edge, Safari).


## How the code is organized

`script.js` is structured in clearly commented sections:

1. **Tiny helpers**   random MAC/IP generation, domain cleanup
2. **The step player**   a small reusable "slideshow" engine (`createPlayer`) that drives play/pause/next/previous/replay for any list of steps
3. **OSI layer facts**   the data behind each of the 7 layers (purpose, header, example)
4. **OSI simulation**   builds the two layer "towers," generates the 15-step journey for a given domain, and animates the packet between them
5. **Tabs**   switches between the Overview dashboard and the OSI Model panel

## Important note on the data

This is a **teaching simulation, not a live packet capture**. IP addresses,
MAC addresses, and timings are generated locally in the browser for
illustration   a real DNS lookup or ARP broadcast never happens. The
*process* shown (encapsulation, decapsulation, the order of the OSI layers)
is accurate; the specific numbers on screen are not real network traffic.

Real-world HTTPS traffic also includes a TLS handshake, which is simplified
here to a single step.

## Browser support

Works in any modern evergreen browser. Uses standard SVG, CSS Grid, and
vanilla JavaScript   no polyfills included, so very old browsers (IE11,
etc.) are not supported.

## License

Educational project   free to use, modify, and extend for learning purposes.
