// ARP module: draws a small local network as SVG, animates a broadcast
// request then a single unicast reply from the matching device.
// Depends on assets/shared.js.
(function(){
  "use strict";
  const { $, $all, randMac, createPlayer } = window.NCS;

  function initARP(){
    const SVG_NS = 'http://www.w3.org/2000/svg';   // SVG lives in its own XML namespace
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

    // createElementNS is the SVG version of createElement.
    function el(name, attrs){
      const e = document.createElementNS(SVG_NS, name);
      for(const [key, value] of Object.entries(attrs)) e.setAttribute(key, value);
      return e;
    }

    // Build one device as a group <g>: an IP/MAC chip, the box + emoji, a name
    // label, and a hidden red "X" used to show devices that reject the request.
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
      g.appendChild(ip); g.appendChild(mac); g.appendChild(emo); g.appendChild(lab);
      // reject X (over the box, hidden by default)
      const rx = el('path', {class:'arp-reject-x', d:`M ${d.x-12} ${d.y-12} L ${d.x+12} ${d.y+12} M ${d.x+12} ${d.y-12} L ${d.x-12} ${d.y+12}`});
      g.appendChild(rx);
      return g;
    }

    // Draw the whole diagram: switch, links, PC, the three devices, and the packet.
    function build(){
      svg.innerHTML = '';
      // switch node (small, center)
      const sw = el('g', {class:'arp-node', 'data-id':'switch'});
      sw.appendChild(el('rect', {class:'node-box', x:SWITCH.x-30, y:SWITCH.y-22, width:60, height:44, rx:9}));
      const se = el('text', {class:'node-emoji', x:SWITCH.x, y:SWITCH.y+6, 'text-anchor':'middle'}); se.textContent = '\uD83D\uDD00';
      const sl = el('text', {class:'node-label', x:SWITCH.x, y:SWITCH.y+34, 'text-anchor':'middle'}); sl.textContent = 'Switch';
      sw.appendChild(se); sw.appendChild(sl);

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

    // Clear every highlight/label so each step starts from a clean diagram.
    function reset(){
      $all('.arp-node', svg).forEach(n=> n.classList.remove('asking','broadcast','reject','match'));
      $all('.arp-link', svg).forEach(l=> l.classList.remove('live-amber','live-green'));
      $all('.arp-reject-x', svg).forEach(x=> x.classList.remove('show'));
      $all('.node-mac', svg).forEach(m=> m.textContent = 'MAC ?');
      const pkt = $('#arp-packet', svg); if(pkt) pkt.classList.remove('show');
      cacheBody.innerHTML = `<tr><td colspan="3" style="color:var(--text-faint);">Empty resolve an address to fill it in</td></tr>`;
    }

    // Small look-up helpers for a node or a link by its id.
    function node(id){ return svg.querySelector(`.arp-node[data-id="${id}"]`); }
    function link(id){ return svg.querySelector(`.arp-link[data-link="${id}"]`); }

    // Move the packet chip to (x,y), recolour it and relabel it.
    function movePacket(x, y, color, text){
      const pkt = $('#arp-packet', svg);
      if(!pkt) return;
      pkt.querySelector('rect').setAttribute('fill', color);
      pkt.querySelector('text').textContent = text;
      pkt.setAttribute('transform', `translate(${x},${y})`);
      pkt.classList.add('show');
    }

    // The 6 steps of the ARP story. `target` is filled in when the user picks a device.
    function steps(){
      return [
        {stage:'idle', badge:'ARP \u00b7 cache check',
          title:'Your PC needs a MAC address',
          desc:`Your PC wants to send data to ${target.label} at ${target.ip}, but a frame can only be delivered using a MAC (hardware) address. Your PC checks its 
           first \u2014 and it's empty. So it must ask the network.`,
          details:{'Have':target.ip, 'Need':`MAC of ${target.ip}`}},
        {stage:'broadcast', badge:'ARP Request \u00b7 broadcast',
          title:'ARP Request \u2014 shout to everyone',
          desc:`Your PC sends an ARP Request as a broadcast: "Who has ${target.ip}? Tell 192.168.1.15." The switch floods it to every device on the network \u2014 that's what broadcast means.`,
          details:{'Dst MAC':'FF:FF:FF:FF:FF:FF','Type':'broadcast'}},
        {stage:'inspect', badge:'ARP Request \u00b7 received',
          title:'Every device checks: "is that me?"',
          desc:`All three devices receive the same request and compare the asked-for IP (${target.ip}) against their own. Only one of them will match.`,
          details:{'Question':`is ${target.ip} mine?`}},
        {stage:'match', badge:'ARP Request \u00b7 result',
          title:'The wrong devices drop it \u2014 one matches',
          desc:`The devices whose IP doesn't match simply discard the request. ${target.label} sees its own IP (${target.ip}) and gets ready to reply.`,
          details:{'Match':`${target.label} (${target.ip})`}},
        {stage:'reply', badge:'ARP Reply \u00b7 unicast',
          title:'ARP Reply \u2014 one answer, straight back',
          desc:`${target.label} replies directly to your PC only (a unicast, not a broadcast): "${target.ip} is at ${target.mac}." Notice it travels back along a single path, not to everyone.`,
          details:{'From':target.label,'MAC':target.mac}},
        {stage:'done', badge:'ARP \u00b7 cache updated',
          title:'Your PC saves it in the ARP cache',
          desc:`Your PC stores the ${target.ip} \u2192 ${target.mac} mapping so it won't need to broadcast again for a while. Now it can finally build and send its frame.`,
          details:{'Cached':`${target.ip} \u2192 ${target.mac}`}},
      ];
    }

    // Draw the diagram for one step, based on that step's `stage`.
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

    // The DOM elements the player writes into for the ARP panel.
    const els = {
      title: $('#arp-title'), desc: $('#arp-desc'), badge: $('#arp-badge'),
      count: $('#arp-count'), dots: $('#arp-dots'), prev: $('#arp-prev'),
      next: $('#arp-next'), play: $('#arp-play'), replay: $('#arp-replay'),
      detail: $('#arp-detail')
    };
    let player = null;

    // Build the "resolve which device?" buttons; clicking one changes `target`.
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

    // Smoothly scroll the diagram into view. matchMedia lets us respect a user's
    // "reduce motion" accessibility setting and jump instantly instead.
    function scrollToArp(){
      const stage = $('#panel-arp .website-stage');
      if(!stage) return;
      const header = $('header.top');
      const offset = (header ? header.offsetHeight : 0) + 14;
      const y = stage.getBoundingClientRect().top + window.pageYOffset - offset;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
    }

    // Create a fresh player for the current target and optionally start playing.
    function run(autoplay){
      player = createPlayer({
        steps: steps(), els, autoplayMs: 3000,
        onRender: (s)=> render(s)
      });
      if(autoplay){
        scrollToArp();
        setTimeout(()=>{ if(player) player.play(); }, 450);   // let the scroll settle first
      }
    }

    build();
    buildTargetButtons();
    run(false);

    $('#arp-go').addEventListener('click', ()=>{ build(); run(true); });
  }

  window.initARP = initARP;
})();
