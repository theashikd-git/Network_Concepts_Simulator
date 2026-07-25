(function(){
  "use strict";

  /* ============================================================
     UTIL
  ============================================================ */
  const $ = (sel, root) => (root||document).querySelector(sel);
  const $all = (sel, root) => Array.from((root||document).querySelectorAll(sel));

  function randHex(n){
    let s='';
    for(let i=0;i<n;i++) s += Math.floor(Math.random()*16).toString(16);
    return s;
  }
  function randMac(){
    const parts=[];
    for(let i=0;i<6;i++) parts.push(randHex(2));
    return parts.join(':').toUpperCase();
  }
  function hashStr(str){
    let h = 0;
    for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) >>> 0; }
    return h;
  }
  function fakePublicIP(domain){
    const h = hashStr(domain);
    const a = 40 + (h % 180);
    const b = (h >> 8) % 256;
    const c = (h >> 16) % 256;
    const d = 1 + ((h >> 24) % 253);
    return [a,b,c,d].join('.');
  }
  function cleanDomain(raw){
    let d = (raw||'').trim().toLowerCase();
    d = d.replace(/^https?:\/\//,'').replace(/\/.*$/,'');
    if(!d) d = 'example.com';
    if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) d = d.replace(/[^a-z0-9.-]/g,'') || 'example.com';
    return d;
  }

  /* ============================================================
     GENERIC STEP PLAYER
     opts: { steps, els:{title,desc,badge,count,dots,prev,next,play,replay,detail}, autoplayMs, onRender(step,i) }
  ============================================================ */
  function createPlayer(opts){
    const { steps, els, autoplayMs=2400, onRender } = opts;
    let idx = 0, timer = null, playing = false;

    function renderDots(){
      els.dots.innerHTML = '';
      steps.forEach((s,i)=>{
        const b = document.createElement('button');
        b.className = 'pd' + (i<idx?' done':'') + (i===idx?' current':'');
        b.addEventListener('click', ()=>{ stop(); goTo(i); });
        els.dots.appendChild(b);
      });
    }
    function render(){
      const s = steps[idx];
      els.title.textContent = s.title;
      els.desc.textContent = s.desc;
      if(els.badge) els.badge.textContent = s.badge || '→';
      els.count.textContent = `step ${idx+1}/${steps.length}`;
      if(els.detail){
        els.detail.innerHTML = '';
        if(s.details){
          Object.entries(s.details).forEach(([k,v])=>{
            const span = document.createElement('span');
            span.innerHTML = `<b>${k}:</b> ${v}`;
            els.detail.appendChild(span);
          });
        }
      }
      renderDots();
      els.prev.disabled = idx===0;
      if(onRender) onRender(s, idx);
    }
    function goTo(i){
      idx = Math.max(0, Math.min(steps.length-1, i));
      render();
      if(idx === steps.length-1) stop();
    }
    function next(){ if(idx < steps.length-1){ goTo(idx+1); } else { stop(); } }
    function prev(){ goTo(idx-1); }
    function stop(){
      playing = false;
      clearInterval(timer);
      els.play.textContent = '▶';
    }
    function play(){
      if(idx >= steps.length-1) goTo(0);
      playing = true;
      els.play.textContent = '❚❚';
      timer = setInterval(()=>{
        if(idx < steps.length-1){ goTo(idx+1); }
        else { stop(); }
      }, autoplayMs);
    }
    function toggle(){ playing ? stop() : play(); }
    function replay(){ stop(); goTo(0); }

    els.prev.addEventListener('click', ()=>{ stop(); prev(); });
    els.next.addEventListener('click', ()=>{ stop(); next(); });
    els.play.addEventListener('click', toggle);
    els.replay.addEventListener('click', replay);

    render();
    return { goTo, play, stop, replay, refresh: ()=>{ if(onRender) onRender(steps[idx], idx); } };
  }

  /* ============================================================
     TOPOLOGY COMPONENT (linear node row + moving packet)
  ============================================================ */
  function buildTopology(container, nodeDefs){
    container.innerHTML = '';
    const packet = document.createElement('div');
    packet.className = 'topo-packet';
    container.style.position = 'relative';

    const nodeEls = nodeDefs.map((n, i)=>{
      const el = document.createElement('div');
      el.className = 'topo-node';
      el.dataset.node = n.id;
      el.innerHTML = `<div class="box">${n.icon}</div><div class="label">${n.label}</div><div class="sub"></div>`;
      container.appendChild(el);
      if(i < nodeDefs.length-1){
        const line = document.createElement('div');
        line.className = 'topo-line';
        line.dataset.after = n.id;
        container.appendChild(line);
      }
      return el;
    });
    container.appendChild(packet);

    function setActive(nodeId, subText){
      nodeEls.forEach(el=>{
        el.classList.toggle('active', el.dataset.node === nodeId);
        if(el.dataset.node === nodeId) el.querySelector('.sub').textContent = subText || '';
        else el.querySelector('.sub').textContent = '';
      });
      $all('.topo-line', container).forEach(l => l.classList.remove('active'));
      const activeIndex = nodeDefs.findIndex(n=>n.id===nodeId);
      const lines = $all('.topo-line', container);
      if(activeIndex > 0) lines[activeIndex-1] && lines[activeIndex-1].classList.add('active');
      if(activeIndex >= 0 && activeIndex < lines.length) lines[activeIndex].classList.add('active');

      requestAnimationFrame(()=>{
        const targetEl = nodeEls[activeIndex >= 0 ? activeIndex : 0];
        if(!targetEl) return;
        const left = targetEl.offsetLeft + targetEl.offsetWidth/2 - 5.5;
        packet.style.left = left + 'px';
        packet.classList.add('show');
      });
    }
    return { setActive };
  }

  /* ============================================================
     OSI DATA
  ============================================================ */
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

  function initOSI(){
    const stack = $('#osi-stack');
    stack.innerHTML = '';
    LAYERS.forEach(layer=>{
      const row = document.createElement('div');
      row.className = 'osi-layer';
      row.dataset.n = layer.n;
      row.innerHTML = `<div class="num">${layer.n}</div><div class="name">${layer.name}</div><div class="abbr">${layer.abbr}</div>`;
      row.addEventListener('click', ()=> selectLayer(layer.n));
      stack.appendChild(row);
    });
    selectLayer(7);

    function selectLayer(n){
      $all('.osi-layer', stack).forEach(r=> r.classList.toggle('selected', Number(r.dataset.n)===n));
      const layer = LAYERS.find(l=>l.n===n);
      $('#osi-detail').innerHTML = `
        <div class="field"><label>Layer</label><div>${layer.n}  ${layer.name}</div></div>
        <div class="field"><label>Purpose</label><div>${layer.purpose}</div></div>
        <div class="field"><label>Header added</label><div class="mono" style="font-size:13px;">${layer.header}</div></div>
        <div class="field"><label>Real-world example</label><div>${layer.example}</div></div>
      `;
    }

    // Encapsulation walkthrough
    const encapSteps = [
      {title:'Application data', desc:'The application layer prepares the raw request for example, an HTTP GET for a webpage.', badge:'Layer 7 · Application', blocks:['DATA']},
      {title:'+ TCP header', desc:'The transport layer wraps the data in a TCP header carrying source/destination ports and a sequence number.', badge:'Layer 4 · Transport', blocks:['TCP','DATA']},
      {title:'+ IP header', desc:'The network layer adds an IP header with the source and destination IP addresses, forming a packet.', badge:'Layer 3 · Network', blocks:['IP','TCP','DATA']},
      {title:'+ Ethernet header/trailer', desc:'The data link layer wraps the packet in an Ethernet frame with source/destination MAC addresses and an error-checking trailer.', badge:'Layer 2 · Data Link', blocks:['ETH','IP','TCP','DATA','FCS']},
      {title:'Bits on the wire', desc:'The physical layer converts the frame into electrical, optical, or radio signals and transmits it.', badge:'Layer 1 · Physical', blocks:['ETH','IP','TCP','DATA','FCS']},
      {title:'Frame received, Ethernet stripped', desc:'The receiving device\'s data link layer reads the MAC addresses, checks the trailer, then removes the Ethernet header.', badge:'Layer 2 · Data Link', blocks:['IP','TCP','DATA']},
      {title:'IP header stripped', desc:'The network layer confirms the packet reached the right IP address, then removes the IP header.', badge:'Layer 3 · Network', blocks:['TCP','DATA']},
      {title:'TCP header stripped, data delivered', desc:'The transport layer matches the segment to the right port and application, then hands the original data upward.', badge:'Layer 4 → 7', blocks:['DATA']},
    ];
    const colorFor = {DATA:'#f083b0', TCP:'#4fc3f7', IP:'#4fdfc0', ETH:'#49dd8e', FCS:'#f5b94d'};

    function renderEncap(step){
      const stackEl = $('#encap-stack');
      stackEl.innerHTML = '';
      step.blocks.forEach(b=>{
        const el = document.createElement('div');
        el.className = 'encap-block';
        el.style.background = colorFor[b];
        el.style.flex = b==='DATA' ? '2' : '1';
        el.textContent = b;
        stackEl.appendChild(el);
        requestAnimationFrame(()=> el.classList.add('show'));
      });
    }

    createPlayer({
      steps: encapSteps,
      autoplayMs: 2200,
      els:{
        title: $('#encap-title'), desc: $('#encap-desc'), badge: $('#encap-layer-badge'),
        count: $('#encap-count'), dots: $('#encap-dots'), prev: $('#encap-prev'),
        next: $('#encap-next'), play: $('#encap-play'), replay: $('#encap-replay')
      },
      onRender: renderEncap
    });
  }

  /* ============================================================
     ARP
  ============================================================ */
  function initARP(){
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = $('#arp-svg');
    const cacheBody = $('#arp-cache-body');
    const clientMac = randMac();

    // Your PC + three other devices on the same local network.
    // Coordinates are in the 540x480 SVG viewBox. PC at top, switch center, devices in a row below.
    const PC = {id:'pc', x:270, y:130, emoji:'\uD83D\uDCBB', label:'Your PC', ip:'192.168.1.15', mac:clientMac};
    const SWITCH = {x:270, y:265};
    const devices = [
      {id:'printer', x:120, y:395, emoji:'\uD83D\uDDA8\uFE0F', label:'Printer',  ip:'192.168.1.30', mac:randMac()},
      {id:'gateway', x:270, y:395, emoji:'\uD83C\uDF10', label:'Gateway',  ip:'192.168.1.1',  mac:randMac()},
      {id:'pc2',     x:420, y:395, emoji:'\uD83D\uDDA5\uFE0F', label:'PC-2',     ip:'192.168.1.22', mac:randMac()},
    ];
    let target = devices[1]; // default: the gateway

    function el(name, attrs){
      const e = document.createElementNS(SVG_NS, name);
      for(const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }
    function nodeGroup(d){
      const g = el('g', {class:'arp-node', 'data-id':d.id});
      // identity chip ABOVE the box: IP (bright) + MAC (dim), with a dark background for contrast
      g.appendChild(el('rect', {class:'node-chip', x:d.x-48, y:d.y-72, width:96, height:34, rx:7}));
      const ip  = el('text', {class:'node-ip', x:d.x, y:d.y-56, 'text-anchor':'middle'}); ip.textContent = d.ip;
      const mac = el('text', {class:'node-mac', x:d.x, y:d.y-43, 'text-anchor':'middle'}); mac.textContent = 'MAC ?';
      mac.dataset.mac = d.mac;
      // the device box + emoji
      g.appendChild(el('rect', {class:'node-box', x:d.x-34, y:d.y-30, width:68, height:60, rx:10}));
      const emo = el('text', {class:'node-emoji', x:d.x, y:d.y+8, 'text-anchor':'middle'}); emo.textContent = d.emoji;
      // name BELOW the box, on a small backing chip
      g.appendChild(el('rect', {class:'node-namebg', x:d.x-38, y:d.y+38, width:76, height:20, rx:6}));
      const lab = el('text', {class:'node-label', x:d.x, y:d.y+52, 'text-anchor':'middle'}); lab.textContent = d.label;
      g.append(ip, mac, emo, lab);
      // reject X (over the box, hidden by default)
      const rx = el('path', {class:'arp-reject-x', d:`M ${d.x-12} ${d.y-12} L ${d.x+12} ${d.y+12} M ${d.x+12} ${d.y-12} L ${d.x-12} ${d.y+12}`});
      g.appendChild(rx);
      return g;
    }

    function build(){
      svg.innerHTML = '';
      // switch node (small, center)
      const sw = el('g', {class:'arp-node', 'data-id':'switch'});
      sw.appendChild(el('rect', {class:'node-box', x:SWITCH.x-30, y:SWITCH.y-22, width:60, height:44, rx:9}));
      const se = el('text', {class:'node-emoji', x:SWITCH.x, y:SWITCH.y+6, 'text-anchor':'middle'}); se.textContent = '\uD83D\uDD00';
      const sl = el('text', {class:'node-label', x:SWITCH.x, y:SWITCH.y+34, 'text-anchor':'middle'}); sl.textContent = 'Switch';
      sw.append(se, sl);

      // links: PC<->switch, switch<->each device
      const links = [];
      links.push(el('line', {class:'arp-link', 'data-link':'pc', x1:PC.x, y1:PC.y+62, x2:SWITCH.x, y2:SWITCH.y-22}));
      devices.forEach(d=>{
        links.push(el('line', {class:'arp-link', 'data-link':d.id, x1:SWITCH.x, y1:SWITCH.y+22, x2:d.x, y2:d.y-30}));
      });
      links.forEach(l=> svg.appendChild(l));
      svg.appendChild(sw);
      svg.appendChild(nodeGroup(PC));
      devices.forEach(d=> svg.appendChild(nodeGroup(d)));

      // moving packet (hidden until needed)
      const pkt = el('g', {class:'arp-packet', id:'arp-packet'});
      pkt.appendChild(el('rect', {x:-30, y:-11, width:60, height:22, rx:5, fill:'var(--amber)'}));
      const pt = el('text', {x:0, y:4, 'text-anchor':'middle', fill:'#04121a'}); pt.textContent='ARP';
      pkt.appendChild(pt);
      svg.appendChild(pkt);
    }

    function reset(){
      $all('.arp-node', svg).forEach(n=> n.classList.remove('asking','broadcast','reject','match'));
      $all('.arp-link', svg).forEach(l=> l.classList.remove('live-amber','live-green'));
      $all('.arp-reject-x', svg).forEach(x=> x.classList.remove('show'));
      $all('.node-mac', svg).forEach(m=> m.textContent = 'MAC ?');
      const pkt = $('#arp-packet', svg); if(pkt) pkt.classList.remove('show');
      cacheBody.innerHTML = `<tr><td colspan="3" style="color:var(--text-faint);">Empty resolve an address to fill it in</td></tr>`;
    }
    function node(id){ return svg.querySelector(`.arp-node[data-id="${id}"]`); }
    function link(id){ return svg.querySelector(`.arp-link[data-link="${id}"]`); }
    function movePacket(x, y, color, text){
      const pkt = $('#arp-packet', svg);
      if(!pkt) return;
      pkt.querySelector('rect').setAttribute('fill', color);
      pkt.querySelector('text').textContent = text;
      pkt.setAttribute('transform', `translate(${x},${y})`);
      pkt.classList.add('show');
    }

    function steps(){
      return [
        {stage:'idle', badge:'ARP \u00b7 cache check',
          title:'Your PC needs a MAC address',
          desc:`Your PC wants to send data to ${target.label} at ${target.ip}, but a frame can only be delivered using a MAC (hardware) address. Your PC checks its 
           first - and it's empty. So it must ask the network.`,
          details:{'Have':target.ip, 'Need':`MAC of ${target.ip}`}},
        {stage:'broadcast', badge:'ARP Request \u00b7 broadcast',
          title:'ARP Request - shout to everyone',
          desc:`Your PC sends an ARP Request as a broadcast: "Who has ${target.ip}? Tell 192.168.1.15." The switch floods it to every device on the network - that's what broadcast means.`,
          details:{'Dst MAC':'FF:FF:FF:FF:FF:FF','Type':'broadcast'}},
        {stage:'inspect', badge:'ARP Request \u00b7 received',
          title:'Every device checks: "is that me?"',
          desc:`All three devices receive the same request and compare the asked-for IP (${target.ip}) against their own. Only one of them will match.`,
          details:{'Question':`is ${target.ip} mine?`}},
        {stage:'match', badge:'ARP Request \u00b7 result',
          title:'The wrong devices drop it - one matches',
          desc:`The devices whose IP doesn't match simply discard the request. ${target.label} sees its own IP (${target.ip}) and gets ready to reply.`,
          details:{'Match':`${target.label} (${target.ip})`}},
        {stage:'reply', badge:'ARP Reply \u00b7 unicast',
          title:'ARP Reply - one answer, straight back',
          desc:`${target.label} replies directly to your PC only (a unicast, not a broadcast): "${target.ip} is at ${target.mac}." Notice it travels back along a single path, not to everyone.`,
          details:{'From':target.label,'MAC':target.mac}},
        {stage:'done', badge:'ARP \u00b7 cache updated',
          title:'Your PC saves it in the ARP cache',
          desc:`Your PC stores the ${target.ip} \u2192 ${target.mac} mapping so it won't need to broadcast again for a while. Now it can finally build and send its frame.`,
          details:{'Cached':`${target.ip} \u2192 ${target.mac}`}},
      ];
    }

    function render(s){
      reset();
      const pc = node('pc');
      if(s.stage==='idle'){
        pc.classList.add('asking');
      } else if(s.stage==='broadcast'){
        pc.classList.add('asking');
        link('pc').classList.add('live-amber');
        devices.forEach(d=>{ link(d.id).classList.add('live-amber'); node(d.id).classList.add('broadcast'); });
        movePacket(SWITCH.x, SWITCH.y, 'var(--amber)', 'ARP?');
      } else if(s.stage==='inspect'){
        devices.forEach(d=> node(d.id).classList.add('broadcast'));
        movePacket(SWITCH.x, SWITCH.y, 'var(--amber)', 'ARP?');
      } else if(s.stage==='match'){
        devices.forEach(d=>{
          if(d.id===target.id){ node(d.id).classList.add('match'); }
          else { node(d.id).classList.add('reject'); node(d.id).querySelector('.arp-reject-x').classList.add('show'); }
        });
      } else if(s.stage==='reply'){
        node(target.id).classList.add('match');
        pc.classList.add('asking');
        link(target.id).classList.add('live-green');
        link('pc').classList.add('live-green');
        // reveal the resolved MAC on the target node
        node(target.id).querySelector('.node-mac').textContent = target.mac.slice(0,8)+'\u2026';
        movePacket((SWITCH.x+target.x)/2, (SWITCH.y+target.y)/2, 'var(--green)', 'MAC');
      } else if(s.stage==='done'){
        node(target.id).classList.add('match');
        pc.classList.add('asking');
        node(target.id).querySelector('.node-mac').textContent = target.mac.slice(0,8)+'\u2026';
        cacheBody.innerHTML = `<tr class="new"><td>${target.ip}</td><td>${target.mac}</td><td>dynamic</td></tr>`;
      }
    }

    const els = {
      title: $('#arp-title'), desc: $('#arp-desc'), badge: $('#arp-badge'),
      count: $('#arp-count'), dots: $('#arp-dots'), prev: $('#arp-prev'),
      next: $('#arp-next'), play: $('#arp-play'), replay: $('#arp-replay'),
      detail: $('#arp-detail')
    };
    let player = null;

    function buildTargetButtons(){
      const host = $('#arp-targets');
      host.innerHTML = '';
      devices.forEach(d=>{
        const b = document.createElement('button');
        b.className = 'arp-target' + (d.id===target.id?' selected':'');
        b.innerHTML = `<b>${d.label}</b><span>${d.ip}</span>`;
        b.addEventListener('click', ()=>{
          target = d;
          $all('.arp-target', host).forEach(x=> x.classList.remove('selected'));
          b.classList.add('selected');
        });
        host.appendChild(b);
      });
    }

    function scrollToArp(){
      const stage = $('#panel-arp .website-stage');
      if(!stage) return;
      const header = $('header.top');
      const offset = (header ? header.offsetHeight : 0) + 14;
      const y = stage.getBoundingClientRect().top + window.pageYOffset - offset;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
    }

    function run(autoplay){
      player = createPlayer({
        steps: steps(), els, autoplayMs: 3000,
        onRender: (s)=> render(s)
      });
      if(autoplay){
        scrollToArp();
        setTimeout(()=>{ if(player) player.play(); }, 450);
      }
    }

    build();
    buildTargetButtons();
    run(false);

    $('#arp-go').addEventListener('click', ()=>{ build(); run(true); });
  }

  /* ============================================================
     PACKET TRANSMISSION
  ============================================================ */
  function initPacket(){
    const nodeDefs = [
      {id:'client', icon:'💻', label:'Client'},
      {id:'switch', icon:'🔀', label:'Switch'},
      {id:'router', icon:'📡', label:'Router'},
      {id:'internet', icon:'☁️', label:'Internet'},
      {id:'server', icon:'🖥️', label:'Server'},
    ];
    const topo = buildTopology($('#packet-topo'), nodeDefs);

    const steps = [
      {title:'Packet assembled at the client', desc:'The client\'s network stack builds a packet: application data wrapped in TCP and IP headers, ready to be framed for the local link.', badge:'Client', node:'client', sub:'building packet',
        details:{'Src IP':'192.168.1.15','Dst IP':'203.0.113.42'}},
      {title:'Framed and sent to the switch', desc:'The client wraps the packet in an Ethernet frame addressed to the default gateway\'s MAC address, and sends it out.', badge:'Data Link', node:'switch', sub:'frame forwarded',
        details:{'Dst MAC':'gateway (resolved via ARP)'}},
      {title:'Router receives and inspects', desc:'The router strips the Ethernet frame, reads the destination IP, and checks its routing table to decide the next hop.', badge:'Network', node:'router', sub:'routing decision',
        details:{'Next hop':'ISP uplink'}},
      {title:'Forwarded onto the internet', desc:'The router re-frames the packet for the outbound link and forwards it across the wider internet, possibly through several more routers.', badge:'Network', node:'internet', sub:'in transit',
        details:{'Hops':'multiple routers (not shown)'}},
      {title:'Delivered to the destination server', desc:'The packet arrives at the destination network, gets switched to the correct physical server, and is handed up to its application.', badge:'Application', node:'server', sub:'delivered',
        details:{'Listening port':'443 (HTTPS)'}},
      {title:'Server sends its response', desc:'The server builds a response packet and sends it back retracing a path through the internet, the router, and the switch to the client.', badge:'Application → Client', node:'internet', sub:'response en route',
        details:{}},
      {title:'Response arrives back at the client', desc:'The client\'s network stack receives the frame, strips each header in turn, and hands the original response data to the browser.', badge:'Client', node:'client', sub:'response received',
        details:{}},
    ];

    createPlayer({
      steps,
      els:{
        title: $('#packet-title'), desc: $('#packet-desc'), badge: $('#packet-badge'),
        count: $('#packet-count'), dots: $('#packet-dots'), prev: $('#packet-prev'),
        next: $('#packet-next'), play: $('#packet-play'), replay: $('#packet-replay'),
        detail: $('#packet-detail')
      },
      autoplayMs: 2400,
      onRender: (s)=> topo.setActive(s.node, s.sub)
    });
  }

  /* ============================================================
     WEBSITE COMMUNICATION SIMULATOR
  ============================================================ */
  /* ---- Website simulator state ---- */
  let websitePlayer = null;
  let websiteReady = false;
  let websiteLayerPinned = false;
  const clientMac = randMac();
  const gatewayMac = randMac();
  const clientIP = '192.168.1.' + (2 + Math.floor(Math.random()*250));

  const LAYER_META = {
    7:{name:'Application', abbr:'HTTP/DNS'},
    6:{name:'Presentation', abbr:'TLS/encoding'},
    5:{name:'Session', abbr:'sessions'},
    4:{name:'Transport', abbr:'TCP/UDP'},
    3:{name:'Network', abbr:'IP/routing'},
    2:{name:'Data Link', abbr:'MAC/frames'},
    1:{name:'Physical', abbr:'bits'},
  };

  // Build the 12-part journey: DOWN the client's 7 layers, ACROSS, UP the server's 7 layers.
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

  const WEBSITE_OVERVIEW = `
    <div class="field"><label>What you're looking at</label>
      <div>Two seven-layer stacks: your PC on the left and the website's server on the right. Your request travels DOWN your layers (each one wraps it in a header), across the network, then UP the server's layers (each one unwraps it).</div></div>
    <div class="field"><label>Tip</label><div>Press Simulate to play automatically (3s per step), step with ‹ ›, or click any layer to read what it does.</div></div>
  `;

  function renderWebsiteLayerDetail(n){
    const box = $('#website-layer-detail');
    if(n == null){ box.innerHTML = WEBSITE_OVERVIEW; return; }
    const layer = LAYERS.find(l=>l.n===n);
    if(!layer){ box.innerHTML = WEBSITE_OVERVIEW; return; }
    box.innerHTML = `
      <div class="field"><label>Layer ${layer.n}</label><div>${layer.name} · <span class="mono" style="color:var(--text-dim);">${layer.abbr}</span></div></div>
      <div class="field"><label>Purpose</label><div>${layer.purpose}</div></div>
      <div class="field"><label>Header added</label><div class="mono" style="font-size:12.5px;">${layer.header}</div></div>
      <div class="field"><label>Real-world example</label><div>${layer.example}</div></div>
    `;
  }

  // Build both towers of layer rows (7 down to 1)
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

  // Highlight the active layer row and move the packet chip to it
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
        const stacked = window.matchMedia('(max-width:640px)').matches;
        const edgeX = stacked
          ? (tr.left - jr.left + tr.width/2)
          : (step.side==='client' ? (tr.right - jr.left) : (tr.left - jr.left));
        packet.style.left = edgeX + 'px';
        packet.style.top  = (tr.top - jr.top + tr.height/2) + 'px';
      }
      packet.classList.add('show');
    });
  }

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
        if(!websiteLayerPinned && s.layer != null && s.side!=='cross'){
          renderWebsiteLayerDetail(s.layer);
        }
      }
    });
  }

  function scrollToJourney(){
    const stage = $('#panel-website .website-stage');
    if(!stage) return;
    const header = $('header.top');
    const offset = (header ? header.offsetHeight : 0) + 14;
    const y = stage.getBoundingClientRect().top + window.pageYOffset - offset;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
  }

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
      // start playing after the scroll settles so the packet lands in view
      setTimeout(()=>{ if(websitePlayer) websitePlayer.play(); }, 450);
    }
  }

  function initWebsite(){
    buildTowers((n)=>{
      websiteLayerPinned = true;
      if(websitePlayer) websitePlayer.stop();
      $all('.tlayer').forEach(r=> r.classList.toggle('pinned', Number(r.dataset.n)===n));
      renderWebsiteLayerDetail(n);
    });

    $('#website-go').addEventListener('click', ()=> runWebsiteSim($('#website-input').value, true));
    $('#website-input').addEventListener('keydown', e=>{
      if(e.key === 'Enter') runWebsiteSim($('#website-input').value, true);
    });
    $all('.quick-domains button').forEach(btn=>{
      btn.addEventListener('click', ()=> runWebsiteSim(btn.dataset.domain, true));
    });

    // Reposition packet on window resize so it stays aligned to its layer
    window.addEventListener('resize', ()=>{
      if(websitePlayer) websitePlayer.refresh && websitePlayer.refresh();
    });

    // Initial load: build but don't autoplay
    runWebsiteSim('example.com', false);
  }

  /* ============================================================
     TABS
  ============================================================ */
  function activateTab(name){
    $all('.tab-btn').forEach(b=> b.classList.toggle('active', b.dataset.panel===name));
    $all('.panel').forEach(p=> p.classList.remove('active'));
    const panel = $('#panel-'+name);
    if(panel) panel.classList.add('active');
    window.scrollTo({ top:0, behavior:'auto' });
  }

  function initTabs(){
    $all('.tab-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> activateTab(btn.dataset.panel));
    });

    // Dashboard module cards navigate to their module tab
    $all('.mod-card[data-goto]').forEach(card=>{
      card.addEventListener('click', ()=> activateTab(card.dataset.goto));
    });

    // "Learn Networking" card scrolls down to the fundamentals section
    const learn = $('#learn-card');
    if(learn){
      learn.style.cursor = 'pointer';
      learn.addEventListener('click', ()=>{
        const target = $('#fundamentals');
        if(target){
          const header = $('header.top');
          const offset = (header ? header.offsetHeight : 0) + 14;
          const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top:Math.max(0,y), behavior:'smooth' });
        }
      });
    }
  }

  /* ============================================================
     INIT
  ============================================================ */
  document.addEventListener('DOMContentLoaded', ()=>{
    initTabs();
    initARP();
    initWebsite();
  });
})();
