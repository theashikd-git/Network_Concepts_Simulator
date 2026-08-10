// OSI module: two seven-layer towers (your PC and the server), packet
// travels down your layers, across the network, up the server's layers.
// Depends on assets/shared.js.
(function(){
  "use strict";
  const { $, $all, randMac, fakePublicIP, cleanDomain, createPlayer } = window.NCS;

  // 7 layer facts, shown when a student clicks one.
  const LAYERS = [
    {n:7, name:'Application', abbr:'HTTP / DNS / SMTP', color:'#f083b0',
      purpose:'The layer users and applications actually interact with where requests like "load this webpage" or "send this email" originate.',
      header:'HTTP request line + headers (e.g. GET / HTTP/1.1)',
      example:'A browser building an HTTP GET request for a page.'},
    {n:6, name:'Presentation', abbr:'TLS / encoding', color:'#e0a1f5',
      purpose:'Formats and translates data between the application and the network character encoding, compression, and encryption.',
      header:'Typically no separate header on the wire; folded into TLS/application data in practice.',
      example:'Encrypting an HTTP request into HTTPS via TLS.'},
    {n:5, name:'Session', abbr:'sessions / dialogs', color:'#c2a8f0',
      purpose:'Opens, manages, and closes the communication session between two devices, keeping dialogs in sync.',
      header:'No distinct header in most modern web traffic handled implicitly by TCP connections and application logic.',
      example:'Keeping a login session alive across multiple requests.'},
    {n:4, name:'Transport', abbr:'TCP / UDP', color:'#4fc3f7',
      purpose:'Breaks data into segments, assigns port numbers, and (with TCP) guarantees ordered, reliable delivery.',
      header:'TCP header source/destination port, sequence number, flags.',
      example:'TCP port 443 identifying that this traffic is HTTPS.'},
    {n:3, name:'Network', abbr:'IP / routing', color:'#4fdfc0',
      purpose:'Adds logical addressing and figures out the path which routers to cross to reach the destination network.',
      header:'IP header source and destination IP address, TTL.',
      example:'A router deciding the next hop based on the destination IP.'},
    {n:2, name:'Data Link', abbr:'MAC / framing', color:'#49dd8e',
      purpose:'Handles delivery across a single local link using physical (MAC) addresses, and detects transmission errors.',
      header:'Ethernet header (source/destination MAC) + trailer (frame check sequence).',
      example:'A switch forwarding a frame based on the destination MAC address.'},
    {n:1, name:'Physical', abbr:'bits / signals', color:'#f5b94d',
      purpose:'Converts frames into raw bits and transmits them as electrical, optical, or radio signals over real media.',
      header:'No header just a stream of bits on the wire, fiber, or radio spectrum.',
      example:'Voltage changes on an Ethernet cable representing 1s and 0s.'},
  ];

  let websitePlayer = null;
  let websiteLayerPinned = false;   // true when the user clicked a layer to "pin" it open
  const clientMac = randMac();
  const gatewayMac = randMac();
  const clientIP = '192.168.1.' + (2 + Math.floor(Math.random()*250));

  // Short names/abbreviations for each layer, used to label the tower rows.
  const LAYER_META = {
    7:{name:'Application', abbr:'HTTP/DNS'},
    6:{name:'Presentation', abbr:'TLS/encoding'},
    5:{name:'Session', abbr:'sessions'},
    4:{name:'Transport', abbr:'TCP/UDP'},
    3:{name:'Network', abbr:'IP/routing'},
    2:{name:'Data Link', abbr:'MAC/frames'},
    1:{name:'Physical', abbr:'bits'},
  };

  // Build the 15-part journey: DOWN the client's 7 layers, ACROSS, UP the server's 7 layers.
  function buildWebsiteSteps(domain){
    const serverIP = fakePublicIP(domain);
    const serverMac = randMac();
    const steps = [];

    // --- SENDER (your PC): data descends, headers get added (encapsulation) ---
    steps.push({side:'client', layer:7, title:'Application build the request',
      desc:`You searched ${domain}. The application layer builds the HTTP request: GET / HTTP/1.1, Host: ${domain}. This is the raw data every layer below will wrap. (DNS, also here, has already resolved ${domain} to ${serverIP}.)`,
      pdu:'DATA', details:{'Protocol':'HTTP','Host':domain,'Resolved IP':serverIP}});
    steps.push({side:'client', layer:6, title:'Presentation → encrypt & format',
      desc:`The presentation layer encrypts the request with TLS (because it's HTTPS) and handles formatting/encoding, so the data is unreadable in transit.`,
      pdu:'TLS·DATA', details:{'Encryption':'TLS (simplified)'}});
    steps.push({side:'client', layer:5, title:'Session → open the conversation',
      desc:`The session layer starts and manages the dialog between your PC and ${domain}'s server, keeping this exchange organized as one session.`,
      pdu:'TLS·DATA', details:{'Session':'client ⇄ server'}});
    steps.push({side:'client', layer:4, title:'Transport → add TCP header',
      desc:`The transport layer breaks data into segments and adds a TCP header with port 443 (HTTPS) and a sequence number, so delivery is reliable and ordered.`,
      pdu:'TCP·DATA', details:{'Dst port':'443 (HTTPS)','Unit':'segment'}});
    steps.push({side:'client', layer:3, title:'Network → add IP header',
      desc:`The network layer adds an IP header with your IP (${clientIP}) as source and ${serverIP} as destination, forming a packet routers can forward.`,
      pdu:'IP·TCP·DATA', details:{'Src IP':clientIP,'Dst IP':serverIP,'Unit':'packet'}});
    steps.push({side:'client', layer:2, title:'Data Link → add Ethernet frame',
      desc:`The data link layer wraps the packet in a frame with MAC addresses (yours plus the gateway's, found via ARP) and an error-check trailer.`,
      pdu:'ETH·IP·TCP·DATA', details:{'Src MAC':clientMac,'Dst MAC':gatewayMac,'Unit':'frame'}});
    steps.push({side:'client', layer:1, title:'Physical → send as bits',
      desc:`The physical layer turns the frame into electrical, light, or radio signals and pushes the raw bits onto the wire or Wi-Fi.`,
      pdu:'BITS', details:{'Unit':'bits','Medium':'copper / fiber / radio'}});

    // --- ACROSS the network ---
    steps.push({side:'cross', layer:1, title:'Across the network',
      desc:`The bits travel across the local network to the switch, up through your router, hop-by-hop across the internet, and finally reach ${domain}'s server. Routers along the way only unwrap down to the IP header to decide the next hop.`,
      pdu:'BITS', details:{'Destination':serverIP}});

    // --- RECEIVER (server): data ascends, headers get stripped (decapsulation) ---
    steps.push({side:'server', layer:1, title:'Physical → receive the bits',
      desc:`The server's physical layer receives the raw signals and reconstructs them back into a frame of 1s and 0s.`,
      pdu:'BITS', details:{'Server':domain}});
    steps.push({side:'server', layer:2, title:'Data Link → read & strip the frame',
      desc:`The data link layer checks the frame reached the right MAC address, verifies the error-check trailer, then removes the Ethernet header.`,
      pdu:'IP·TCP·DATA', details:{'Server MAC':serverMac}});
    steps.push({side:'server', layer:3, title:'Network → read & strip the IP header',
      desc:`The network layer confirms the packet's destination IP (${serverIP}) is this server, then removes the IP header.`,
      pdu:'TCP·DATA', details:{'Dst IP':serverIP}});
    steps.push({side:'server', layer:4, title:'Transport → reassemble segments',
      desc:`The transport layer uses the TCP header to reassemble segments in order and hand them to the right application via port 443, then removes the TCP header.`,
      pdu:'TLS·DATA', details:{'Port':'443'}});
    steps.push({side:'server', layer:5, title:'Session → match the session',
      desc:`The session layer ties the data to the correct ongoing conversation with your PC.`,
      pdu:'TLS·DATA', details:{}});
    steps.push({side:'server', layer:6, title:'Presentation → decrypt',
      desc:`The presentation layer decrypts the TLS-protected data back into a readable HTTP request.`,
      pdu:'DATA', details:{'Decryption':'TLS'}});
    steps.push({side:'server', layer:7, title:'Application → server handles the request',
      desc:`The application layer finally reads the original request, ${domain}'s web server finds the page, and prepares a response to send back down its own seven layers to you.`,
      pdu:'DATA', details:{'Result':'200 OK','Next':'response returns the same way'}});

    return steps;
  }

  // Default text shown in the layer-detail box before any layer is chosen.
  const WEBSITE_OVERVIEW = `
    <div class="field"><label>What you're looking at</label>
      <div>Two seven-layer stacks: your PC on the left and the website's server on the right. Your request travels DOWN your layers (each one wraps it in a header), across the network, then UP the server's layers (each one unwraps it).</div></div>
    <div class="field"><label>Tip</label><div>Press Simulate to play automatically (3s per step), step with ‹ ›, or click any layer to read what it does.</div></div>
  `;

  // Fill the detail box: the overview when n is null, otherwise that layer's info.
  function renderWebsiteLayerDetail(n){
    const box = $('#website-layer-detail');
    if(n === null){ box.innerHTML = WEBSITE_OVERVIEW; return; }
    const layer = LAYERS.find(l=>l.n===n);
    if(!layer){ box.innerHTML = WEBSITE_OVERVIEW; return; }
    box.innerHTML = `
      <div class="field"><label>Layer ${layer.n}</label><div>${layer.name} · <span class="mono" style="color:var(--text-dim);">${layer.abbr}</span></div></div>
      <div class="field"><label>Purpose</label><div>${layer.purpose}</div></div>
      <div class="field"><label>Header added</label><div class="mono" style="font-size:12.5px;">${layer.header}</div></div>
      <div class="field"><label>Real-world example</label><div>${layer.example}</div></div>
    `;
  }

  // Build both towers of layer rows (7 down to 1). Each row is clickable and
  // keyboard-focusable; Enter or Space triggers the same action as a click.
  function buildTowers(onLayerClick){
    ['client','server'].forEach(side=>{
      const host = $('#tower-'+side+'-layers');
      host.innerHTML = '';
      for(let n=7; n>=1; n--){
        const meta = LAYER_META[n];
        const row = document.createElement('div');
        row.className = 'tlayer';
        row.dataset.n = n; row.dataset.side = side;
        row.setAttribute('role','button'); row.setAttribute('tabindex','0');
        row.innerHTML = `<div class="tl-num">${n}</div><div class="tl-name">${meta.name}</div><div class="tl-abbr">${meta.abbr}</div>`;
        row.addEventListener('click', ()=> onLayerClick(n));
        row.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onLayerClick(n); } });
        host.appendChild(row);
      }
    });
  }

  // Highlight the active layer row and move the packet chip to it.
  // requestAnimationFrame waits until the browser is about to repaint, so the
  // element positions we read with getBoundingClientRect are up to date.
  function renderJourney(step){
    const rows = $all('.tlayer');
    rows.forEach(r=> r.classList.remove('active'));

    const arrow = $('#jm-arrow');
    arrow.classList.toggle('active', step.side==='cross');

    // update tower captions
    $('#tower-client-sub').textContent = step.side==='client' ? 'sending ▼' : (step.side==='cross' ? 'sent' : 'waiting');
    $('#tower-server-sub').textContent = step.side==='server' ? 'receiving ▲' : 'waiting';

    const packet = $('#journey-packet');
    $('#journey-packet-label').textContent = step.pdu;

    let targetRow = null;
    if(step.side==='client'){
      targetRow = document.querySelector(`.tlayer[data-side="client"][data-n="${step.layer}"]`);
    } else if(step.side==='server'){
      targetRow = document.querySelector(`.tlayer[data-side="server"][data-n="${step.layer}"]`);
    }
    if(targetRow) targetRow.classList.add('active');

    const journey = $('#osi-journey');
    requestAnimationFrame(()=>{
      const jr = journey.getBoundingClientRect();
      if(step.side==='cross'){
        // park packet in the middle lane
        const mid = $('.journey-mid').getBoundingClientRect();
        packet.style.left = (mid.left - jr.left + mid.width/2) + 'px';
        packet.style.top  = (mid.top - jr.top + mid.height/2) + 'px';
      } else if(targetRow){
        const tr = targetRow.getBoundingClientRect();
        const stacked = window.matchMedia('(max-width:640px)').matches;   // narrow screens stack the towers
        const edgeX = stacked
          ? (tr.left - jr.left + tr.width/2)
          : (step.side==='client' ? (tr.right - jr.left) : (tr.left - jr.left));
        packet.style.left = edgeX + 'px';
        packet.style.top  = (tr.top - jr.top + tr.height/2) + 'px';
      }
      packet.classList.add('show');
    });
  }

  // Fill the little "session info" strip with the made-up IPs and MACs.
  function buildSession(domain){
    const serverIP = fakePublicIP(domain);
    $('#tower-server-name').textContent = domain;
    $('#website-session').innerHTML = `
      <span><b>Your IP</b> ${clientIP}</span>
      <span><b>Your MAC</b> ${clientMac}</span>
      <span><b>Gateway MAC</b> ${gatewayMac}</span>
      <span><b>${domain}</b> ${serverIP}</span>
    `;
  }

  // Create the player for the OSI panel and, for each step, redraw the towers
  // and (unless the user pinned a layer) show that layer's detail.
  function createWebsitePlayer(steps){
    const els = {
      title: $('#website-title'), desc: $('#website-desc'), badge: $('#website-badge'),
      count: $('#website-count'), dots: $('#website-dots'), prev: $('#website-prev'),
      next: $('#website-next'), play: $('#website-play'), replay: $('#website-replay'),
      detail: $('#website-detail')
    };
    return createPlayer({
      steps, els, autoplayMs: 3000,
      onRender: (s)=>{
        // badge shows which layer/side
        els.badge.textContent = s.side==='cross' ? 'Across the network'
          : (s.side==='client' ? `Your PC · Layer ${s.layer}` : `Server · Layer ${s.layer}`);
        renderJourney(s);
        if(!websiteLayerPinned && s.side!=='cross'){
          renderWebsiteLayerDetail(s.layer);
        }
      }
    });
  }

  // Smoothly bring the towers into view (respecting reduce-motion).
  function scrollToJourney(){
    const stage = $('#panel-website .website-stage');
    if(!stage) return;
    const header = $('header.top');
    const offset = (header ? header.offsetHeight : 0) + 14;
    const y = stage.getBoundingClientRect().top + window.pageYOffset - offset;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
  }

  // Run one simulation for the given domain. If autoplay is true, scroll into
  // view and start playing once the scroll settles.
  function runWebsiteSim(rawDomain, autoplay){
    const domain = cleanDomain(rawDomain);
    $('#website-input').value = domain;
    buildSession(domain);
    websiteLayerPinned = false;
    $all('.tlayer').forEach(r=> r.classList.remove('pinned'));
    renderWebsiteLayerDetail(null);
    const steps = buildWebsiteSteps(domain);
    websitePlayer = createWebsitePlayer(steps);
    if(autoplay){
      scrollToJourney();
      setTimeout(()=>{ if(websitePlayer) websitePlayer.play(); }, 450);
    }
  }

  // Set up the OSI panel: build the towers, wire the Simulate button, the Enter
  // key, the quick-domain buttons, and re-align the packet when the window resizes.
  function initWebsite(){
    buildTowers((n)=>{
      websiteLayerPinned = true;                       // clicking a layer pins it open
      if(websitePlayer) websitePlayer.stop();
      $all('.tlayer').forEach(r=> r.classList.toggle('pinned', Number(r.dataset.n)===n));
      renderWebsiteLayerDetail(n);
    });

    $('#website-go').addEventListener('click', ()=> runWebsiteSim($('#website-input').value, true));
    $('#website-input').addEventListener('keydown', e=>{
      if(e.key === 'Enter') runWebsiteSim($('#website-input').value, true);
    });
    $all('.quick-domains button', $('#panel-website')).forEach(btn=>{
      btn.addEventListener('click', ()=> runWebsiteSim(btn.dataset.domain, true));
    });

    // Reposition packet on window resize so it stays aligned to its layer.
    window.addEventListener('resize', ()=>{
      if(websitePlayer) websitePlayer.refresh && websitePlayer.refresh();
    });

    // Initial load: build but don't autoplay.
    runWebsiteSim('example.com', false);
  }

  // Exposed so assets/shared.js's startup code can call it once the
  // page has finished loading.
  window.initOSI = initWebsite;
})();
