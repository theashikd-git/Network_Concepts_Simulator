// DNS module: draws the resolver hierarchy (root, TLD, authoritative)
// as SVG and animates a recursive lookup step by step.
// Depends on assets/shared.js.
(function(){
  "use strict";
  const { $, $all, fakePublicIP, cleanDomain, createPlayer } = window.NCS;

  function initDNS(){
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = $('#dns-svg');
    const cacheBody = $('#dns-cache-body');

    // The five actors, positioned inside the 540x480 SVG viewBox.
    // Your PC on the left, the recursive resolver in the middle, and the three
    // hierarchy servers (root, TLD, authoritative) stacked on the right.
    const PC   = {id:'pc',   x:70,  y:240, emoji:'\uD83D\uDCBB', label:'Your PC',       sub:'stub resolver'};
    const RES  = {id:'res',  x:250, y:240, emoji:'\uD83D\uDD01', label:'Resolver',      sub:'8.8.8.8'};
    const ROOT = {id:'root', x:455, y:95,  emoji:'\uD83C\uDF10', label:'Root',          sub:'"."'};
    const TLD  = {id:'tld',  x:455, y:240, emoji:'\uD83D\uDCD2', label:'TLD',           sub:'.com'};
    const AUTH = {id:'auth', x:455, y:385, emoji:'\uD83C\uDFE2', label:'Authoritative', sub:'the domain'};
    const NODES = [PC, RES, ROOT, TLD, AUTH];
    const LINKS = [
      {id:'pc-res',   a:PC,  b:RES},
      {id:'res-root', a:RES, b:ROOT},
      {id:'res-tld',  a:RES, b:TLD},
      {id:'res-auth', a:RES, b:AUTH},
    ];

    let domain = 'example.com';   // updated whenever the user resolves something

    // Make one SVG element and set its attributes (same helper as the ARP module).
    function el(name, attrs){
      const e = document.createElementNS(SVG_NS, name);
      for(const [key, value] of Object.entries(attrs)) e.setAttribute(key, value);
      return e;
    }

    // Draw one actor as a group: a box + emoji, a name label, and a small subtitle.
    function nodeGroup(d){
      const g = el('g', {class:'dns-node', 'data-id':d.id});
      g.appendChild(el('rect', {class:'node-box', x:d.x-42, y:d.y-34, width:84, height:64, rx:11}));
      const emo = el('text', {class:'node-emoji', x:d.x, y:d.y+6,  'text-anchor':'middle'}); emo.textContent = d.emoji;
      const lab = el('text', {class:'node-label', x:d.x, y:d.y+50, 'text-anchor':'middle'}); lab.textContent = d.label;
      const sub = el('text', {class:'node-sub',   x:d.x, y:d.y+63, 'text-anchor':'middle'}); sub.textContent = d.sub;
      g.appendChild(emo); g.appendChild(lab); g.appendChild(sub);
      return g;
    }

    // Draw the whole diagram: links first (so they sit behind), then nodes, then the packet.
    function build(){
      svg.innerHTML = '';
      LINKS.forEach(l=>{
        svg.appendChild(el('line', {class:'dns-link', 'data-link':l.id, x1:l.a.x, y1:l.a.y, x2:l.b.x, y2:l.b.y}));
      });
      NODES.forEach(n=> svg.appendChild(nodeGroup(n)));
      const pkt = el('g', {class:'dns-packet', id:'dns-packet'});
      pkt.appendChild(el('rect', {x:-40, y:-11, width:80, height:22, rx:5, fill:'var(--cyan)'}));
      const pt = el('text', {x:0, y:4, 'text-anchor':'middle', fill:'#04121a'}); pt.textContent='?';
      pkt.appendChild(pt);
      svg.appendChild(pkt);
    }

    // Clear every highlight so each step starts from a clean diagram.
    function reset(){
      $all('.dns-node', svg).forEach(n=> n.classList.remove('asking','query','answer'));
      $all('.dns-link', svg).forEach(l=> l.classList.remove('live-cyan','live-green'));
      const pkt = $('#dns-packet', svg); if(pkt) pkt.classList.remove('show');
      cacheBody.innerHTML = `<tr><td colspan="3" style="color:var(--text-faint);">Empty resolve a domain to fill it in</td></tr>`;
    }

    function node(id){ return svg.querySelector(`.dns-node[data-id="${id}"]`); }
    function link(id){ return svg.querySelector(`.dns-link[data-link="${id}"]`); }

    // Place the packet chip partway along a link (ratio 0..1), recolour and relabel it.
    // The chip auto-sizes to its text (monospace ≈ 6px per character) so long labels
    // like a full IP address always fit inside the rounded box instead of spilling out.
    function movePacket(from, to, ratio, color, text){
      const pkt = $('#dns-packet', svg);
      if(!pkt) return;
      const x = from.x + (to.x - from.x) * ratio;
      const y = from.y + (to.y - from.y) * ratio;
      const w = Math.max(44, text.length * 6.2 + 16);   // fit the label + a little padding
      const rect = pkt.querySelector('rect');
      rect.setAttribute('x', -w/2);                       // keep the box centred on the text
      rect.setAttribute('width', w);
      rect.setAttribute('fill', color);
      pkt.querySelector('text').textContent = text;
      pkt.setAttribute('transform', `translate(${x},${y})`);
      pkt.classList.add('show');
    }

    // The 9 steps of the DNS resolution story. `domain` fills in the details.
    function steps(){
      const tld = domain.split('.').pop();    // e.g. "com" from "example.com"
      const ip  = fakePublicIP(domain);       // same illustrative IP the OSI module uses
      return [
        {stage:'cache', badge:'DNS \u00b7 cache miss',
          title:'Your PC needs an IP address',
          desc:`You want to reach ${domain}, but data can only be routed to an IP address, not a name. Your PC checks its own DNS cache first \u2014 nothing stored yet, so it must ask for help.`,
          details:{'Have':domain,'Need':'its IP (A record)'}},
        {stage:'ask-res', badge:'Query \u00b7 recursive',
          title:'Ask the recursive resolver',
          desc:`Your PC sends the question to its configured resolver (here 8.8.8.8): "What is the IP of ${domain}?" and lets the resolver do all the legwork.`,
          details:{'To':'resolver 8.8.8.8','Question':`A? ${domain}`}},
        {stage:'ask-root', badge:'Query \u00b7 root',
          title:'Resolver asks a root server',
          desc:`The resolver starts at the top of the hierarchy. It asks a root server not for the whole answer, but simply: "Who is responsible for .${tld} names?"`,
          details:{'Step':'1 of 3 \u00b7 root'}},
        {stage:'root-ref', badge:'Referral \u00b7 TLD',
          title:'Root refers it to the TLD',
          desc:`The root server doesn't know ${domain}, but it knows who runs the .${tld} zone. It replies with a referral pointing to the .${tld} TLD nameservers.`,
          details:{'Answer':`ask the .${tld} servers`}},
        {stage:'ask-tld', badge:'Query \u00b7 TLD',
          title:`Resolver asks the .${tld} server`,
          desc:`Following that referral, the resolver asks the .${tld} TLD server: "Where are the nameservers for ${domain}?"`,
          details:{'Step':'2 of 3 \u00b7 TLD'}},
        {stage:'tld-ref', badge:'Referral \u00b7 authoritative',
          title:'TLD refers it to the authoritative server',
          desc:`The .${tld} server still isn't the final source, but it knows which nameserver actually holds ${domain}'s records, and refers the resolver there.`,
          details:{'Answer':`ask ${domain}'s nameserver`}},
        {stage:'ask-auth', badge:'Query \u00b7 authoritative',
          title:'Resolver asks the authoritative server',
          desc:`At last the resolver reaches ${domain}'s own authoritative nameserver \u2014 the source of truth for this domain \u2014 and asks it directly for the A record.`,
          details:{'Step':'3 of 3 \u00b7 authoritative'}},
        {stage:'answer', badge:'Answer \u00b7 A record',
          title:'The authoritative server answers',
          desc:`This server is authoritative for ${domain}, so it gives the real answer: ${domain} = ${ip}, plus a TTL saying how long the answer may be cached.`,
          details:{'A record':`${domain} \u2192 ${ip}`,'TTL':'300s'}},
        {stage:'done', badge:'DNS \u00b7 resolved',
          title:'Cached, then handed back to your PC',
          desc:`The resolver caches the record and returns ${ip} to your PC, which caches it too. Next time, your PC answers from its own cache instantly and skips every step above. It can now open a connection to ${ip}.`,
          details:{'Resolved':`${domain} \u2192 ${ip}`,'Reused':'until TTL expires'}},
      ];
    }

    // Draw the diagram for one step, based on that step's `stage`.
    // Cyan = a question going out; green = an answer or referral coming back.
    function render(s){
      reset();
      const ip  = fakePublicIP(domain);
      const tld = domain.split('.').pop();
      const pc = node('pc'), res = node('res');

      if(s.stage==='cache'){
        pc.classList.add('asking');
      } else if(s.stage==='ask-res'){
        pc.classList.add('asking'); res.classList.add('query');
        link('pc-res').classList.add('live-cyan');
        movePacket(PC, RES, 0.55, 'var(--cyan)', 'A? '+domain);
      } else if(s.stage==='ask-root'){
        res.classList.add('asking'); node('root').classList.add('query');
        link('res-root').classList.add('live-cyan');
        movePacket(RES, ROOT, 0.55, 'var(--cyan)', '.'+tld+' ?');
      } else if(s.stage==='root-ref'){
        node('root').classList.add('answer'); res.classList.add('asking');
        link('res-root').classList.add('live-green');
        movePacket(ROOT, RES, 0.55, 'var(--green)', '.'+tld+' NS');
      } else if(s.stage==='ask-tld'){
        res.classList.add('asking'); node('tld').classList.add('query');
        link('res-tld').classList.add('live-cyan');
        movePacket(RES, TLD, 0.55, 'var(--cyan)', domain+' ?');
      } else if(s.stage==='tld-ref'){
        node('tld').classList.add('answer'); res.classList.add('asking');
        link('res-tld').classList.add('live-green');
        movePacket(TLD, RES, 0.55, 'var(--green)', 'ns.'+domain);
      } else if(s.stage==='ask-auth'){
        res.classList.add('asking'); node('auth').classList.add('query');
        link('res-auth').classList.add('live-cyan');
        movePacket(RES, AUTH, 0.55, 'var(--cyan)', 'A? '+domain);
      } else if(s.stage==='answer'){
        node('auth').classList.add('answer'); res.classList.add('asking');
        link('res-auth').classList.add('live-green');
        movePacket(AUTH, RES, 0.55, 'var(--green)', ip);
      } else if(s.stage==='done'){
        res.classList.add('answer'); pc.classList.add('answer');
        link('pc-res').classList.add('live-green');
        movePacket(RES, PC, 0.55, 'var(--green)', ip);
        cacheBody.innerHTML = `<tr class="new"><td>${domain}</td><td>A</td><td>${ip} \u00b7 TTL 300s</td></tr>`;
      }
    }

    // The DOM elements the player writes into for the DNS panel.
    const els = {
      title: $('#dns-title'), desc: $('#dns-desc'), badge: $('#dns-badge'),
      count: $('#dns-count'), dots: $('#dns-dots'), prev: $('#dns-prev'),
      next: $('#dns-next'), play: $('#dns-play'), replay: $('#dns-replay'),
      detail: $('#dns-detail')
    };
    let player = null;

    // Smoothly scroll the diagram into view (respecting the reduce-motion setting).
    function scrollToDns(){
      const stage = $('#panel-dns .website-stage');
      if(!stage) return;
      const header = $('header.top');
      const offset = (header ? header.offsetHeight : 0) + 14;
      const y = stage.getBoundingClientRect().top + window.pageYOffset - offset;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
    }

    // Rebuild the diagram for the current domain and create a fresh player.
    function run(autoplay){
      const tld = domain.split('.').pop();
      TLD.sub  = '.'+tld;        // label the TLD node with this domain's suffix
      AUTH.sub = domain;         // label the authoritative node with the domain
      build();
      player = createPlayer({ steps: steps(), els, autoplayMs: 3000, onRender: (s)=> render(s) });
      if(autoplay){
        scrollToDns();
        setTimeout(()=>{ if(player) player.play(); }, 450);
      }
    }

    run(false);   // initial load: build but don't autoplay

    // Resolve a new domain from the input, the Enter key, or a quick-pick button.
    function resolveFromInput(raw){
      domain = cleanDomain(raw);
      $('#dns-input').value = domain;
      run(true);
    }
    $('#dns-go').addEventListener('click', ()=> resolveFromInput($('#dns-input').value));
    $('#dns-input').addEventListener('keydown', e=>{ if(e.key==='Enter') resolveFromInput($('#dns-input').value); });
    // scope the quick buttons to THIS panel so we don't grab the OSI panel's buttons
    $all('.quick-domains button', $('#panel-dns')).forEach(btn=>{
      btn.addEventListener('click', ()=> resolveFromInput(btn.dataset.domain));
    });
  }

  window.initDNS = initDNS;
})();
