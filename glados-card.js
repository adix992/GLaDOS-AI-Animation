class GladosCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // Lovelace calls this to pass the configuration
  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity (e.g., assist_satellite.living_room) for GLaDOS to track.');
    }
    this.config = config;
  }

  // Lovelace calls this whenever any state changes in Home Assistant
  set hass(hass) {
    if (!hass) return;

    if (!this.contentReady) {
      this.setupDOM();
      this.initGlados();
      this.contentReady = true;
    }

    const stateObj = hass.states[this.config.entity];
    if (stateObj) {
      const stateStr = stateObj.state;
      // Only trigger animation updates if the state actually changed
      if (this._currentState !== stateStr) {
        this._currentState = stateStr;
        if (this.applyState) this.applyState(stateStr);
      }
    }
  }

  getCardSize() {
    return 6; 
  }

  setupDOM() {
    const zoom = this.config.zoom !== undefined ? this.config.zoom : 85;
    const scale = zoom / 100;
    
    // Exact container dimensions calculated to match the viewBox aspect ratio
    const width = 280 * scale;
    const height = 410 * scale;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000000;
          border-radius: var(--ha-card-border-radius, 12px);
          overflow: hidden;
          width: 100%;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        #scene {
          width: ${width}px;
          height: ${height}px;
          display: flex; 
          align-items: center;
          justify-content: center;
        }
        
        #glados-svg { 
          width: 100%;
          height: 100%;
          display: block; 
          overflow: visible; 
        }
        
        #body-pivot { transform-origin: 140px 116px; animation: body-sway 8s ease-in-out infinite; }
        @keyframes body-sway {
          0%   { transform: rotate(-1.4deg); }
          50%  { transform: rotate( 1.4deg); }
          100% { transform: rotate(-1.4deg); }
        }
        
        #glados-head {
          transform-box: view-box; transform-origin: 140px 285px;
          transition: transform 1.6s cubic-bezier(0.34, 1.06, 0.64, 1);
        }

        #eye-halo, #eye-center { transition: fill 0.8s ease-in-out; }
        .eye-layer { transition: opacity 0.8s ease-in-out; }
        
        @keyframes eye-breathe { 0%,100%{opacity:.02} 48%{opacity:.8} }
        #eye-halo.breathing { animation: eye-breathe 8s ease-in-out infinite; }
        
        @keyframes danger-flash { 0%,100%{opacity:0} 50%{opacity:1} }
        #danger-ring.active { animation: danger-flash .35s ease-in-out infinite; }
      </style>
      
      <div id="scene">
        <!-- Reverted top crop: y-start is 80; height remains 410 -->
        <svg id="glados-svg" viewBox="0 80 280 410">
          <defs>
            <linearGradient id="ceramicGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#b0b4bc"/>
              <stop offset="15%" stop-color="#e8eaec"/>
              <stop offset="50%" stop-color="#ffffff"/>
              <stop offset="85%" stop-color="#d0d4dc"/>
              <stop offset="100%" stop-color="#8a8e96"/>
            </linearGradient>
            <linearGradient id="ceramicShadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
              <stop offset="70%" stop-color="#60646c" stop-opacity="0.2"/>
              <stop offset="100%" stop-color="#2a2c32" stop-opacity="0.8"/>
            </linearGradient>
            <linearGradient id="ceramicGradDark" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#8a8e96"/>
              <stop offset="15%" stop-color="#b0b4bc"/>
              <stop offset="50%" stop-color="#d0d4dc"/>
              <stop offset="85%" stop-color="#8a8e96"/>
              <stop offset="100%" stop-color="#555a62"/>
            </linearGradient>
            <linearGradient id="armorVDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#14141a"/>
              <stop offset="50%" stop-color="#09090c"/>
              <stop offset="100%" stop-color="#040406"/>
            </linearGradient>
            <linearGradient id="cavityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#181a1c"/>
              <stop offset="100%" stop-color="#30353a"/>
            </linearGradient>
            <linearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#111214"/>
              <stop offset="50%" stop-color="#2a2d30"/>
              <stop offset="100%" stop-color="#0a0a0c"/>
            </linearGradient>
            <radialGradient id="eyeGradIdle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="25%" stop-color="#ffe855"/>
              <stop offset="60%" stop-color="#ff8800"/>
              <stop offset="85%" stop-color="#aa2200"/>
              <stop offset="100%" stop-color="#1a0200"/>
            </radialGradient>
            <radialGradient id="eyeGradListen" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="25%" stop-color="#aaffff"/>
              <stop offset="60%" stop-color="#00ccff"/>
              <stop offset="85%" stop-color="#0066aa"/>
              <stop offset="100%" stop-color="#001a33"/>
            </radialGradient>
            <radialGradient id="eyeGradProcess" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="25%" stop-color="#ffddaa"/>
              <stop offset="60%" stop-color="#ff6600"/>
              <stop offset="85%" stop-color="#aa3300"/>
              <stop offset="100%" stop-color="#220a00"/>
            </radialGradient>
            <radialGradient id="eyeGradRespond" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="25%" stop-color="#ffaaaa"/>
              <stop offset="60%" stop-color="#ff2200"/>
              <stop offset="85%" stop-color="#aa0000"/>
              <stop offset="100%" stop-color="#220000"/>
            </radialGradient>
            <filter id="eyeBloom" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="10" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="ledGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <linearGradient id="lidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1f2124"/>
              <stop offset="100%" stop-color="#08090a"/>
            </linearGradient>
            <linearGradient id="lidGradFlip" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#1f2124"/>
              <stop offset="100%" stop-color="#08090a"/>
            </linearGradient>
          </defs>

          <g id="body-pivot">
            <g id="torso" transform="translate(140, 116) scale(1.2) translate(-140, -116)">
              <ellipse cx="140" cy="116" rx="55" ry="15" fill="#1c1c26" stroke="#0c0c12" stroke-width="1.2"/>
              <ellipse cx="140" cy="116" rx="46" ry="11" fill="#141420" stroke="#1e1e2c" stroke-width=".7"/>
              <path d="M95 130 L92 138 L90 200 Q90 206 97 208 L183 208 Q190 206 190 200 L188 138 L185 130 Z" fill="url(#armorVDark)" stroke="#111115" stroke-width=".8"/>
              <path d="M94 126 L86 134 L84 200 Q84 210 94 212 L186 212 Q196 210 196 200 L194 134 L186 126 Z" fill="url(#ceramicGradDark)" stroke="#80848c" stroke-width="1.4"/>
              <path d="M90 132 L62 140 L58 180 L62 196 L74 200 L90 196 Z" fill="url(#ceramicGradDark)" stroke="#80848c" stroke-width="1"/>
              <path d="M90 136 L66 143 L62 178 L66 192 L76 196 L90 192 Z" fill="#eeeeee" opacity="0.05"/>
              <circle cx="60" cy="168" r="9" fill="#14141c" stroke="#0c0c12" stroke-width="1"/>
              <circle cx="60" cy="168" r="5.5" fill="#0c0c10" stroke="#1a1a22" stroke-width=".8"/>
              <path d="M90 132 C86 152 84 172 86 192" stroke="#1a1a22" stroke-width="2.5" fill="none" opacity=".8"/>
              <path d="M190 132 L218 140 L222 180 L218 196 L206 200 L190 196 Z" fill="url(#ceramicGradDark)" stroke="#80848c" stroke-width="1"/>
              <path d="M190 136 L214 143 L218 178 L214 192 L204 196 L190 192 Z" fill="#eeeeee" opacity="0.05"/>
              <circle cx="220" cy="168" r="9" fill="#14141c" stroke="#0c0c12" stroke-width="1"/>
              <circle cx="220" cy="168" r="5.5" fill="#0c0c10" stroke="#1a1a22" stroke-width=".8"/>
              <path d="M190 132 C194 152 196 172 194 192" stroke="#1a1a22" stroke-width="2.5" fill="none" opacity=".8"/>
              <line x1="90" y1="152" x2="190" y2="152" stroke="#a0a4ac" stroke-width="1"/>
              <line x1="89" y1="174" x2="191" y2="174" stroke="#a0a4ac" stroke-width="1"/>
              <line x1="140" y1="128" x2="140" y2="210" stroke="#a0a4ac" stroke-width="1"/>
              <rect x="94" y="135" width="36" height="20" rx="2.5" fill="#050508" stroke="#101014" stroke-width=".6"/>
              <rect x="96" y="137" width="32" height="16" rx="1.5" fill="#020202"/>
              <g id="led-matrix-left" filter="url(#ledGlow)">
                <rect class="led-dot" x="98" y="140" width="28" height="2" rx="1" fill="#ffb800" opacity=".2"/>
                <rect class="led-dot" x="98" y="145" width="28" height="2" rx="1" fill="#ffb800" opacity=".2"/>
                <rect class="led-dot" x="98" y="150" width="28" height="2" rx="1" fill="#ffb800" opacity=".2"/>
              </g>
              <rect x="150" y="135" width="36" height="20" rx="2.5" fill="#050508" stroke="#101014" stroke-width=".6"/>
              <rect x="152" y="137" width="32" height="16" rx="1.5" fill="#020202"/>
              <g id="led-matrix-right" filter="url(#ledGlow)">
                <rect class="led-dot" x="154" y="140" width="28" height="2" rx="1" fill="#ffb800" opacity=".2"/>
                <rect class="led-dot" x="154" y="145" width="28" height="2" rx="1" fill="#ffb800" opacity=".2"/>
                <rect class="led-dot" x="154" y="150" width="28" height="2" rx="1" fill="#ffb800" opacity=".2"/>
              </g>
              <circle cx="100" cy="180" r="2.5" fill="#0a0a0e" stroke="#101014" stroke-width=".5"/>
              <circle id="ind-l1" cx="100" cy="180" r="1.5" fill="#ffb800" opacity=".2"/>
              <circle cx="108" cy="180" r="2.5" fill="#0a0a0e" stroke="#101014" stroke-width=".5"/>
              <circle id="ind-l2" cx="108" cy="180" r="1.5" fill="#ffb800" opacity=".2"/>
              <circle cx="172" cy="180" r="2.5" fill="#0a0a0e" stroke="#101014" stroke-width=".5"/>
              <circle id="ind-r1" cx="172" cy="180" r="1.5" fill="#ffb800" opacity=".2"/>
              <circle cx="180" cy="180" r="2.5" fill="#0a0a0e" stroke="#101014" stroke-width=".5"/>
              <circle id="ind-r2" cx="180" cy="180" r="1.5" fill="#ffb800" opacity=".2"/>
              <path d="M88 208 L90 224 Q140 240 190 224 L192 208 Z" fill="#0a0a0e" stroke="#050508" stroke-width=".9"/>
              <rect x="118" y="232" width="44" height="20" rx="5" fill="#101014" stroke="#08080c" stroke-width="1"/>
              <rect x="120" y="234" width="40" height="16" rx="4" fill="#08080a"/>
              <ellipse cx="140" cy="252" rx="18" ry="5" fill="#0a0a0e" stroke="#08080c" stroke-width=".7"/>
              <path d="M118 234 C110 240 108 248 111 256" stroke="#0a0a0f" stroke-width="5" fill="none" stroke-linecap="round"/>
              <path d="M162 234 C170 240 172 248 169 256" stroke="#0a0a0f" stroke-width="5" fill="none" stroke-linecap="round"/>
              <rect x="122" y="256" width="36" height="18" rx="4" fill="#101014" stroke="#08080c" stroke-width=".9"/>
              <rect x="124" y="258" width="32" height="14" rx="3" fill="#08080a"/>
              <ellipse cx="140" cy="274" rx="15" ry="4.5" fill="#0a0a0e" stroke="#08080c" stroke-width=".6"/>
              <path d="M122 258 C114 264 112 270 115 277" stroke="#0a0a0f" stroke-width="4.5" fill="none" stroke-linecap="round"/>
              <path d="M158 258 C166 264 168 270 165 277" stroke="#0a0a0f" stroke-width="4.5" fill="none" stroke-linecap="round"/>
              <rect x="126" y="278" width="28" height="16" rx="3.5" fill="#101014" stroke="#08080c" stroke-width=".8"/>
              <rect x="128" y="280" width="24" height="12" rx="2.5" fill="#08080a"/>
              <ellipse cx="140" cy="294" rx="12" ry="4" fill="#0a0a0e" stroke="#08080c" stroke-width=".6"/>
              <rect x="130" y="297" width="20" height="13" rx="3" fill="#101014" stroke="#08080c" stroke-width=".8"/>
              <rect x="132" y="299" width="16" height="9" rx="2" fill="#08080a"/>
            </g>

            <g id="glados-head-wrapper" transform="translate(0, -65)">
              <g id="glados-head">
                <ellipse cx="140" cy="285" rx="18" ry="6" fill="#181824" stroke="#0a0a0f" stroke-width="1"/>
                <ellipse cx="140" cy="285" rx="12" ry="3.8" fill="#101015" stroke="#181824" stroke-width=".6"/>
                <rect x="75" y="219" width="130" height="310" rx="60" fill="url(#ceramicGrad)"/>
                <rect x="75" y="219" width="130" height="310" rx="60" fill="url(#ceramicShadow)"/>
                <path d="M 100 449 Q 105 459 100 469 M 165 454 Q 160 464 170 474 M 170 474 L 175 464 M 95 454 L 90 464" stroke="#9a9ea5" stroke-width="1" fill="none" opacity="0.6"/>
                <rect x="95" y="269" width="90" height="190" rx="40" fill="url(#cavityGrad)" stroke="#444a50" stroke-width="2"/>
                <rect x="95" y="269" width="90" height="190" rx="40" fill="none" stroke="#111215" stroke-width="4" opacity="0.8"/>
                <rect x="105" y="279" width="70" height="170" rx="35" fill="url(#trackGrad)" stroke="#000000" stroke-width="3"/>
                <circle cx="140" cy="364" r="28" fill="#1c1e22" stroke="#000" stroke-width="2"/>
                <circle cx="140" cy="364" r="23" fill="#0a0b0c"/>
                
                <circle id="eye-halo" cx="140" cy="364" r="26" fill="#ffb800" opacity=".4" filter="url(#eyeBloom)"/>
                
                <g id="eye-pupil" style="transition: transform 0.15s ease-out;">
                  <circle id="eye-layer-idle" cx="140" cy="364" r="16" fill="url(#eyeGradIdle)" filter="url(#softGlow)" class="eye-layer" opacity="1" />
                  <circle id="eye-layer-listen" cx="140" cy="364" r="16" fill="url(#eyeGradListen)" filter="url(#softGlow)" class="eye-layer" opacity="0" />
                  <circle id="eye-layer-process" cx="140" cy="364" r="16" fill="url(#eyeGradProcess)" filter="url(#softGlow)" class="eye-layer" opacity="0" />
                  <circle id="eye-layer-respond" cx="140" cy="364" r="16" fill="url(#eyeGradRespond)" filter="url(#softGlow)" class="eye-layer" opacity="0" />
                  <circle id="eye-center" cx="140" cy="364" r="6" fill="#ffe855" />
                  <circle cx="138" cy="362" r="2" fill="#ffffff" opacity="0.7" />
                </g>

                <clipPath id="lidClip">
                  <rect x="105" y="279" width="70" height="170" rx="35"/>
                </clipPath>
                <g clip-path="url(#lidClip)">
                  <path id="eye-lid" d="M 100 250 L 180 250 L 180 364 L 168 364 A 28 28 0 0 0 112 364 L 100 364 Z" fill="url(#lidGrad)" stroke="#000" stroke-width="2" style="transform:translateY(0px); transition:transform 0.7s ease-in-out;"/>
                  <path id="eye-lid-bottom" d="M 100 480 L 180 480 L 180 364 L 168 364 A 28 28 0 0 1 112 364 L 100 364 Z" fill="url(#lidGradFlip)" stroke="#000" stroke-width="2" style="transform:translateY(0px); transition:transform 0.7s ease-in-out;"/>
                </g>

                <g stroke="#08090a" stroke-width="4" stroke-linecap="round" opacity="0.7">
                  <line x1="115" y1="294" x2="165" y2="294"/>
                  <line x1="112" y1="304" x2="168" y2="304"/>
                  <line x1="110" y1="314" x2="170" y2="314"/>
                  <line x1="110" y1="324" x2="170" y2="324"/>
                  <line x1="110" y1="414" x2="170" y2="414"/>
                  <line x1="112" y1="424" x2="168" y2="424"/>
                  <line x1="115" y1="434" x2="165" y2="434"/>
                </g>
                <path d="M 105 359 L 110 361 L 110 367 L 105 369 Z" fill="#050505"/>
                <path d="M 100 379 L 105 381 L 105 389 L 100 391 Z" fill="#050505"/>
                <circle cx="155" cy="389" r="4.5" fill="#1a0000" stroke="#000" stroke-width="1"/>
                <circle id="indicator-dot" cx="155" cy="389" r="3" fill="#ff2200" opacity="0.8" filter="url(#softGlow)"/>
                <rect id="danger-ring" x="95" y="269" width="90" height="190" rx="40" fill="none" stroke="#ff2200" stroke-width="2" opacity="0"/>
              </g>
            </g>
          </g>
        </svg>
      </div>
    `;
  }

  initGlados() {
    const root = this.shadowRoot;
    const config = this.config;

    const el = {
      head: root.getElementById('glados-head'),
      bodyPivot: root.getElementById('body-pivot'),
      eyeHalo: root.getElementById('eye-halo'),
      eyeLayerIdle: root.getElementById('eye-layer-idle'),
      eyeLayerListen: root.getElementById('eye-layer-listen'),
      eyeLayerProcess: root.getElementById('eye-layer-process'),
      eyeLayerRespond: root.getElementById('eye-layer-respond'),
      eyeCenter: root.getElementById('eye-center'),
      pupil: root.getElementById('eye-pupil'),
      lidTop: root.getElementById('eye-lid'),
      lidBot: root.getElementById('eye-lid-bottom'),
      dangerRing: root.getElementById('danger-ring'),
      indicatorDot: root.getElementById('indicator-dot'),
      leds: root.querySelectorAll('.led-dot'),
      indL1: root.getElementById('ind-l1'),
      indL2: root.getElementById('ind-l2'),
      indR1: root.getElementById('ind-r1'),
      indR2: root.getElementById('ind-r2')
    };

    let stateNow = 'idle';
    let currentBaseLid = 0;
    let lidBehaviorTimer = null;
    let talkAnim = null;
    let talkPhase = 0;
    let idleTimer = null;
    let pupilTimer = null;

    function setHead(rot, tx, ty, dur, ease = "cubic-bezier(0.34,1.06,0.64,1)") {
      if (!el.head) return;
      el.head.style.transition = `transform ${dur || 1.8}s ${ease}`;
      el.head.style.transform = `rotate(${rot}deg) translate(${tx}px,${ty}px)`;
    }

    function setBodySwivel(rot, sx, dur) {
      if (!el.bodyPivot) return;
      el.bodyPivot.style.transition = `transform ${dur || 2.0}s cubic-bezier(0.45,0.05,0.55,0.95)`;
      el.bodyPivot.style.animation = 'none';
      el.bodyPivot.style.transform = `rotate(${rot}deg) scaleX(${sx || 1})`;
    }

    function resetBodySwivel() {
      if (!el.bodyPivot) return;
      el.bodyPivot.style.transition = '';
      el.bodyPivot.style.animation = '';
      el.bodyPivot.style.transform = '';
    }

    function setLid(amount, dur = 0.7) {
      if (!el.lidTop || !el.lidBot) return;
      const topPx = amount * 11;
      const botPx = amount * 11;
      el.lidTop.style.transition = `transform ${dur}s ease-in-out`;
      el.lidBot.style.transition = `transform ${dur}s ease-in-out`;
      el.lidTop.style.transform = `translateY(${topPx}px)`;
      el.lidBot.style.transform = `translateY(${-botPx}px)`;
    }

    function setBaseLid(amount, dur = 0.7) {
      currentBaseLid = amount;
      setLid(amount, dur);
    }

    function startLidBehavior() {
      stopLidBehavior();
      function loop() {
        if (stateNow === 'idle') {
          let offset = (Math.random() - 0.5) * 0.15;
          let val = Math.max(0, Math.min(1, currentBaseLid + offset));
          setLid(val, 0.5 + Math.random() * 0.8);
          lidBehaviorTimer = setTimeout(loop, 1500 + Math.random() * 2500);
        } else if (stateNow === 'processing') {
          let val = currentBaseLid + (Math.random() * 0.3 - 0.15);
          setLid(val, 0.05 + Math.random() * 0.1);
          lidBehaviorTimer = setTimeout(loop, 50 + Math.random() * 150);
        }
      }
      loop();
    }

    function stopLidBehavior() {
      if (lidBehaviorTimer) { clearTimeout(lidBehaviorTimer); lidBehaviorTimer = null; }
    }

    function setPupil(px, py) {
      if (!el.pupil) return;
      el.pupil.style.transform = `translate(${px}px, ${py}px)`;
    }

    function setEyeColor(state) {
      if (!el.eyeLayerIdle) return;
      el.eyeLayerIdle.style.opacity = (state === 'idle') ? '1' : '0';
      el.eyeLayerListen.style.opacity = (state === 'listening') ? '1' : '0';
      el.eyeLayerProcess.style.opacity = (state === 'processing') ? '1' : '0';
      el.eyeLayerRespond.style.opacity = (state === 'responding') ? '1' : '0';

      if (state === 'idle') {
        el.eyeHalo.setAttribute('fill', '#ffb800');
        el.eyeCenter.setAttribute('fill', '#ffe855');
      } else if (state === 'listening') {
        el.eyeHalo.setAttribute('fill', '#00ccff');
        el.eyeCenter.setAttribute('fill', '#aaffff');
      } else if (state === 'processing') {
        el.eyeHalo.setAttribute('fill', '#ff6600');
        el.eyeCenter.setAttribute('fill', '#ffddaa');
      } else if (state === 'responding') {
        el.eyeHalo.setAttribute('fill', '#ff2200');
        el.eyeCenter.setAttribute('fill', '#ffaaaa');
      }
    }

    function setLEDs(color, opacity) {
      if (!el.leds) return;
      el.leds.forEach(l => { l.setAttribute('fill', color); l.setAttribute('opacity', opacity); });
      if (el.indL1) { el.indL1.setAttribute('fill', color); el.indL1.setAttribute('opacity', opacity); }
      if (el.indL2) { el.indL2.setAttribute('fill', color); el.indL2.setAttribute('opacity', opacity); }
      if (el.indR1) { el.indR1.setAttribute('fill', color); el.indR1.setAttribute('opacity', opacity); }
      if (el.indR2) { el.indR2.setAttribute('fill', color); el.indR2.setAttribute('opacity', opacity); }
    }

    function setIndicator(color, opacity) {
      if (!el.indicatorDot) return;
      el.indicatorDot.setAttribute('fill', color);
      el.indicatorDot.setAttribute('opacity', opacity);
    }

    const TALK_MOVES = [
      { r: -10, tx: -8, ty: -18, dur: 1.8, lid: 0.1, ease: "ease-in-out" },
      { r: 4, tx: 0, ty: 16, dur: 0.4, lid: 0.5, ease: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      { r: 2, tx: 0, ty: 10, dur: 0.6, lid: 0.4, ease: "ease-in-out" },
      { r: 12, tx: 10, ty: -12, dur: 2.2, lid: 0.1, ease: "ease-in-out" },
      { r: 0, tx: 0, ty: 25, dur: 1.5, lid: 0.6, ease: "ease-in-out" },
      { r: -6, tx: 6, ty: -22, dur: 0.5, lid: 0.1, ease: "ease-out" },
      { r: 4, tx: -3, ty: 6, dur: 2.0, lid: 0.3, ease: "ease-in-out" },
      { r: -3, tx: 0, ty: 22, dur: 0.3, lid: 0.6, ease: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      { r: 6, tx: 3, ty: -6, dur: 1.2, lid: 0.2, ease: "ease-in-out" },
    ];

    function startTalkAnim() {
      stopTalkAnim();
      talkPhase = 0;
      function step() {
        const m = TALK_MOVES[talkPhase % TALK_MOVES.length];
        setHead(m.r, m.tx, m.ty, m.dur, m.ease || "ease-in-out");
        setLid(m.lid, m.dur);
        setBodySwivel(m.r * -0.6, 1, m.dur);
        talkPhase++;
        talkAnim = setTimeout(step, m.dur * 1000);
      }
      step();
    }

    function stopTalkAnim() {
      if (talkAnim) { clearTimeout(talkAnim); talkAnim = null; }
    }

    const IDLE_BEHAVIORS = [
      { name: 'passive', exec() { setHead(0, 0, 0, 2.4); setBaseLid(0, 1.0); resetBodySwivel(); }, min: 6000, max: 13000, weight: 4 },
      { name: 'scan_right', exec() { setHead(12, 0, -5, 1.4); setBaseLid(0, 1.0); setBodySwivel(-2, 1, 1.8); }, min: 3500, max: 7000, weight: 1.5 },
      { name: 'scan_left', exec() { setHead(-12, 0, -5, 1.4); setBaseLid(0, 1.0); setBodySwivel(2, 1, 1.8); }, min: 3500, max: 7000, weight: 1.5 },
      { name: 'curious', exec() { setHead(8, 0, -20, 1.2); setBaseLid(0, 0.8); setBodySwivel(-2, 1, 1.6); }, min: 4000, max: 8000, weight: 2 },
      { name: 'contemptuous', exec() { setHead(-6, 0, 15, 1.8); setBaseLid(0.65, 1.0); setBodySwivel(1.5, 1, 2.0); setTimeout(() => { if (stateNow === 'idle') setBaseLid(0, 1.5); }, 1500); }, min: 5000, max: 10000, weight: 2 },
      { name: 'alert', exec() { setHead(0, 0, -25, 0.28); setBaseLid(0, 0.2); setBodySwivel(-1, 1, 0.4); }, min: 1500, max: 3000, weight: 1 },
      { name: 'bored', exec() { setHead(2, 0, 20, 2.8); setBaseLid(0.7, 1.5); setBodySwivel(1, 1, 3.0); setTimeout(() => { if (stateNow === 'idle') setBaseLid(0, 1.5); }, 1500); }, min: 7000, max: 14000, weight: 1.5 },
      { name: 'full_swivel', exec() { setBodySwivel(-6, 0.96, 2.5); setTimeout(() => { setHead(6, 0, -3, 1.2); setBaseLid(0, 0.8); }, 600); }, min: 4000, max: 8000, weight: 0.8 },
    ];

    function dartPupil() {
      if (stateNow === 'idle') {
        let activity = config.eye_speed !== undefined ? config.eye_speed : 50;

        if (activity === 0) {
          setPupil(0, 0);
          pupilTimer = setTimeout(dartPupil, 1000);
          return;
        }

        const max = 7;
        const px = (Math.random() - 0.5) * max * 2;
        const py = (Math.random() - 0.5) * max * 2;
        setPupil(px, py);

        let base = 600;
        let rand = 2500;
        if (activity > 50) {
          let m = 1.0 - ((activity - 50) / 50) * 0.85;
          base *= m; rand *= m;
        } else {
          let m = 1.0 + ((50 - activity) / 50) * 5.0;
          base *= m; rand *= m;
        }

        pupilTimer = setTimeout(dartPupil, base + Math.random() * rand);
      }
    }

    function runNextIdleBehavior() {
      if (stateNow !== 'idle') return;
      const total = IDLE_BEHAVIORS.reduce((s, b) => s + b.weight, 0);
      let r = Math.random() * total, chosen = IDLE_BEHAVIORS[0];
      for (const b of IDLE_BEHAVIORS) { r -= b.weight; if (r <= 0) { chosen = b; break; } }
      chosen.exec();
      idleTimer = setTimeout(runNextIdleBehavior, chosen.min + Math.random() * (chosen.max - chosen.min));
    }

    this.startIdleCycle = () => {
      this.stopIdleCycle();
      IDLE_BEHAVIORS[0].exec();
      dartPupil();
      idleTimer = setTimeout(runNextIdleBehavior, 2500 + Math.random() * 4000);
    };

    this.stopIdleCycle = () => {
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
      if (pupilTimer) { clearTimeout(pupilTimer); pupilTimer = null; }
    };

    const animateGlaDOS = (state) => {
      stateNow = state;
      stopTalkAnim();
      stopLidBehavior();
      if (el.dangerRing) el.dangerRing.setAttribute('opacity', '0');
      if (el.eyeHalo) el.eyeHalo.classList.remove('breathing');

      if (state === 'idle') {
        setHead(0, 0, 0, 2.2); setBaseLid(0, 1.2); setPupil(0, 0);
        if (el.eyeHalo) el.eyeHalo.classList.add('breathing');
        setEyeColor('idle');
        setLEDs('#ffb800', '.15');
        setIndicator('#ff2200', '.8');
        resetBodySwivel();
        this.startIdleCycle();
      } else if (state === 'listening') {
        setHead(4, 0, -8, 1.0); setBaseLid(0.1, 0.4); setPupil(0, -3);
        setEyeColor('listening');
        setLEDs('#00ccff', '1');
        setIndicator('#00ccff', '1');
        setBodySwivel(-2, 1, 1.4);
      } else if (state === 'processing') {
        setHead(-2, 0, 10, 1.4); setBaseLid(0.55, 0.5); setPupil(0, 4);
        setEyeColor('processing');
        setLEDs('#ff6600', '.8');
        setIndicator('#ff6600', '1');
        setBodySwivel(1, 0.98, 1.8);
        startLidBehavior();
      } else if (state === 'responding') {
        setHead(0, 0, -5, 0.5); setBaseLid(0.2, 0.3); setPupil(0, 0);
        setEyeColor('responding');
        setLEDs('#ff2200', '1');
        setIndicator('#ff2200', '1');
        if (el.dangerRing) el.dangerRing.setAttribute('opacity', '1');
        setBodySwivel(0, 1, 0.8); startTalkAnim();
      }
    };

    this.applyState = (raw) => {
      const s = (raw || 'idle').toLowerCase();
      const mapped =
        s.includes('respond') || s.includes('speak') || s.includes('tts') ? 'responding' :
        s.includes('listen') ? 'listening' :
        s.includes('process') || s.includes('think') ? 'processing' :
        s.includes('wake') ? 'listening' : 'idle';

      this.stopIdleCycle();
      animateGlaDOS(mapped);
    };

    this.applyState('idle');
  }

  disconnectedCallback() {
    if (this.stopIdleCycle) this.stopIdleCycle();
  }
}

customElements.define('glados-card', GladosCard);
