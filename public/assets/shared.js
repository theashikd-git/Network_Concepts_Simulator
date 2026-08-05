// Code every module (OSI, ARP, DNS) needs in common: DOM helpers and
// the step-player engine. Must load before osi.js / arp.js / dns.js,
// which read from window.NCS as soon as they run.
window.NCS = (function(){
  "use strict";

  const $ = (sel, root) => (root||document).querySelector(sel);
  const $all = (sel, root) => [...(root||document).querySelectorAll(sel)];

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

  // Hash a domain to a number so the same domain always gets the same fake IP.
  function hashStr(str){
    let h = 0;
    for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) >>> 0; }
    return h;
  }

  // Fake but stable IP for illustration only. Must use >>> (unsigned shift) —
  // a plain >> treats hashes >= 2^31 as negative, which used to break the
  // IP for about half of all domains (e.g. "116.-28.-224.-115").
  function fakePublicIP(domain){
    const h = hashStr(domain);
    const a = 40 + (h % 180);
    const b = (h >>> 8) % 256;
    const c = (h >>> 16) % 256;
    const d = 1 + ((h >>> 24) % 253);
    return [a,b,c,d].join('.');
  }

  function cleanDomain(raw){
    let d = (raw || '').trim().toLowerCase();
    d = d.replace('https://', '').replace('http://', '');
    d = d.split('/')[0];
    let cleaned = '';
    for (const ch of d) {
      const ok = (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '.' || ch === '-';
      if (ok) cleaned += ch;
    }
    return cleaned || 'example.com';
  }

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

  return { $, $all, randHex, randMac, hashStr, fakePublicIP, cleanDomain, createPlayer };
})();

// Tab switching lives here (not in a module file) since it's page chrome.
const { $, $all } = window.NCS;

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

  $all('.mod-card[data-goto]').forEach(card=>{
    card.addEventListener('click', ()=> activateTab(card.dataset.goto));
  });

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

// Each module sets window.initOSI/initARP/initDNS itself; just call
// whichever exist so this file doesn't need to know what's on the page.
document.addEventListener('DOMContentLoaded', function(){
  initTabs();
  if (window.initARP) window.initARP();
  if (window.initDNS) window.initDNS();
  if (window.initOSI) window.initOSI();
});
