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
    
    // Tightly cropped dimensions to remove empty black space
    const width = 280 * scale;
    const height = 320 * scale;

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
          /* Optimization: CSS variables for LED states */
          --led-color: #ffb800;
          --led-opacity: 0.15;
        }

        /* Optimization: Bind LED elements to the variables */
        .led-dot, #ind-l1, #ind-l2, #ind-r1, #ind-r2 {
          transition: fill 0.2s, opacity 0.2s;
          fill: var(--led-color);
          opacity: var(--led-opacity);
        }

        /* Optimization: Promote moving layers to GPU */
        #body-pivot, #head-sway-pivot, #glados-head, #eyeball-assembly, #eye-pupil, #bellows, #eye-lid, #eye-lid-bottom {
          will-change: transform;
        }
        
        #body-pivot { transform-origin: 140px 116px; animation: body-sway 8s ease-in-out infinite; }
        @keyframes body-sway {
          0%   { transform: rotate(-1.4deg); }
          50%  { transform: rotate( 1.4deg); }
          100% { transform: rotate(-1.4deg); }
        }
        
        #head-sway-pivot { transform-origin: 140px 285px; animation: head-ambient-sway 13s ease-in-out infinite; }
        @keyframes head-ambient-sway {
          0%, 100% { transform: rotate(-0.8deg); }
          50%      { transform: rotate(0.8deg); }
        }

        #glados-head {
          transform-box: view-box; transform-origin: 140px 285px;
          transition: transform 1.6s cubic-bezier(0.34, 1.06, 0.64, 1);
        }

        #eye-halo, #eye-center { transition: fill 0.8s ease-in-out; }
        .eye-layer { transition: opacity 0.8s ease-in-out; }
        
        @keyframes eye-breathe { 0%,100%{opacity:.02} 48%{opacity:.2} }
        #eye-halo.breathing { animation: eye-breathe 8s ease-in-out infinite; }
        
        @keyframes danger-flash { 0%,100%{opacity:0} 50%{opacity:1} }
        #danger-ring.active { animation: danger-flash .35s ease-in-out infinite; }

        /* Pulsing Vents animation specifically for processing state */
        @keyframes led-pulse { 0%,100%{opacity:0.2} 50%{opacity:1} }
        .led-matrix.pulsing .led-dot { animation: led-pulse 2s ease-in-out infinite; }
      </style>
      
      <div id="scene">
        <svg id="glados-svg" viewBox="0 116 280 320">
          <defs>
            <linearGradient id="ceramicGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#8a8d94"/>
              <stop offset="8%" stop-color="#b0b4bc"/>
              <stop offset="8.5%" stop-color="#ffffff"/>
              <stop offset="25%" stop-color="#ffffff"/>
              <stop offset="75%" stop-color="#ffffff"/>
              <stop offset="91.5%" stop-color="#e8eaec"/>
              <stop offset="92%" stop-color="#a0a4ac"/>
              <stop offset="100%" stop-color="#6a6d75"/>
            </linearGradient>
            
            <linearGradient id="ceramicShadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
              <stop offset="60%" stop-color="#60646c" stop-opacity="0.1"/>
              <stop offset="85%" stop-color="#2a2c32" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="#0a0a0f" stop-opacity="0.85"/>
            </linearGradient>

            <linearGradient id="bezelGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#4a4d54"/>
              <stop offset="20%" stop-color="#6a6d75"/>
              <stop offset="50%" stop-color="#3a3c42"/>
              <stop offset="80%" stop-color="#1a1c20"/>
              <stop offset="100%" stop-color="#0a0a0c"/>
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
              <stop offset="0%" stop-color="#1a1c20"/>
              <stop offset="50%" stop-color="#3a3e46"/>
              <stop offset="100%" stop-color="#121316"/>
            </linearGradient>
            
            <radialGradient id="eyeGradIdle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="20%" stop-color="#ffcc00"/>
              <stop offset="55%" stop-color="#d95500"/>
              <stop offset="80%" stop-color="#7a1100"/>
              <stop offset="100%" stop-color="#110000"/>
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

            <clipPath id="cavityClip">
               <rect x="97" y="283.25" width="66" height="161.5" rx="33"/>
            </clipPath>
            <clipPath id="trackClip">
               <rect x="107" y="293.25" width="46" height="141.5" rx="23"/>
            </clipPath>
            <clipPath id="eyeballClip">
               <circle cx="130" cy="364" r="25.5"/>
            </clipPath>
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
              <g id="led-matrix-left" class="led-matrix" filter="url(#ledGlow)">
                <rect class="led-dot" x="98" y="140" width="28" height="2" rx="1" />
                <rect class="led-dot" x="98" y="145" width="28" height="2" rx="1" />
                <rect class="led-dot" x="98" y="150" width="28" height="2" rx="1" />
              </g>
              <rect x="150" y="135" width="36" height="20" rx="2.5" fill="#050508" stroke="#101014" stroke-width=".6"/>
              <rect x="152" y="137" width="32" height="16" rx="1.5" fill="#020202"/>
              <g id="led-matrix-right" class="led-matrix" filter="url(#ledGlow)">
                <rect class="led-dot" x="154" y="140" width="28" height="2" rx="1" />
                <rect class="led-dot" x="154" y="145" width="28" height="2" rx="1" />
                <rect class="led-dot" x="154" y="150" width="28" height="2" rx="1" />
              </g>
              <circle cx="100" cy="180" r="2.5" fill="#0a0a0e" stroke="#101014" stroke-width=".5"/>
              <circle id="ind-l1" cx="100" cy="180" r="1.5" />
              <circle cx="108" cy="180" r="2.5" fill="#0a0a0e" stroke="#101014" stroke-width=".5"/>
              <circle id="ind-l2" cx="108" cy="180" r="1.5" />
              <circle cx="172" cy="180" r="2.5" fill="#0a0a0e" stroke="#101014" stroke-width=".5"/>
              <circle id="ind-r1" cx="172" cy="180" r="1.5" />
              <circle cx="180" cy="180" r="2.5" fill="#0a0a0e" stroke="#101014" stroke-width=".5"/>
              <circle id="ind-r2" cx="180" cy="180" r="1.5" />
              <path d="M88 208 L90 224 Q140 240 190 224 L192 208 Z" fill="#0a0a0e" stroke="#050508" stroke-width=".9"/>
              <rect x="118" y="232" width="44" height="20" rx="5" fill="#101014" stroke="#08080c" stroke-width="1"/>
              <rect x="120" y="234" width="40" height="16" rx="4" fill="#08080a"/>
              <ellipse cx="140" cy="252" rx="18" ry="5" fill="#0a0a0e" stroke="#08080c" stroke-width=".7"/>
              <path d="M118" y="234" C110 240 108 248 111 256" stroke="#0a0a0f" stroke-width="5" fill="none" stroke-linecap="round"/>
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
          </g>

          <g id="glados-head-wrapper" transform="translate(0, -65)">
            <g id="head-sway-pivot">
              <g id="glados-head">
                <ellipse cx="140" cy="285" rx="18" ry="6" fill="#181824" stroke="#0a0a0f" stroke-width="1"/>
                <ellipse cx="140" cy="285" rx="12" ry="3.8" fill="#101015" stroke="#181824" stroke-width=".6"/>
                
                <rect x="75" y="232" width="130" height="247" rx="60" fill="url(#ceramicGrad)"/>
                <rect x="75" y="232" width="130" height="247" rx="60" fill="url(#ceramicShadow)"/>
                
                <rect x="93" y="279.25" width="76" height="171.5" rx="38" fill="#000" opacity="0.6" filter="url(#softGlow)"/>
                <rect x="91" y="277.25" width="78" height="173.5" rx="39" fill="url(#bezelGrad)" stroke="#1a1c22" stroke-width="1"/>
                <rect x="93" y="279.25" width="74" height="169.5" rx="37" fill="none" stroke="#6a6d75" stroke-width="1.5"/>

                <g clip-path="url(#cavityClip)">
                   <rect x="97" y="283.25" width="66" height="161.5" rx="33" fill="url(#cavityGrad)"/>
                   <rect x="97" y="283.25" width="66" height="161.5" rx="33" fill="none" stroke="#050607" stroke-width="5" opacity="0.9"/>
                   
                   <rect x="107" y="293.25" width="46" height="141.5" rx="23" fill="url(#trackGrad)" stroke="#000000" stroke-width="3"/>
                   
                   <g clip-path="url(#trackClip)">
                      <g id="bellows" style="transition: transform 0.15s ease-out;">
                         <g stroke="#000" stroke-width="4.5" stroke-linecap="butt" opacity="0.9">
                            <line x1="107" y1="140" x2="153" y2="140" /><line x1="107" y1="152" x2="153" y2="152" /><line x1="107" y1="164" x2="153" y2="164" /><line x1="107" y1="176" x2="153" y2="176" /><line x1="107" y1="188" x2="153" y2="188" /><line x1="107" y1="200" x2="153" y2="200" /><line x1="107" y1="212" x2="153" y2="212" /><line x1="107" y1="224" x2="153" y2="224" /><line x1="107" y1="236" x2="153" y2="236" /><line x1="107" y1="248" x2="153" y2="248" /><line x1="107" y1="260" x2="153" y2="260" /><line x1="107" y1="272" x2="153" y2="272" /><line x1="107" y1="284" x2="153" y2="284" /><line x1="107" y1="296" x2="153" y2="296" /><line x1="107" y1="308" x2="153" y2="308" /><line x1="107" y1="320" x2="153" y2="320" /><line x1="107" y1="332" x2="153" y2="332" /><line x1="107" y1="344" x2="153" y2="344" /><line x1="107" y1="356" x2="153" y2="356" /><line x1="107" y1="368" x2="153" y2="368" /><line x1="107" y1="380" x2="153" y2="380" /><line x1="107" y1="392" x2="153" y2="392" /><line x1="107" y1="404" x2="153" y2="404" /><line x1="107" y1="416" x2="153" y2="416" /><line x1="107" y1="428" x2="153" y2="428" /><line x1="107" y1="440" x2="153" y2="440" /><line x1="107" y1="452" x2="153" y2="452" /><line x1="107" y1="464" x2="153" y2="464" /><line x1="107" y1="476" x2="153" y2="476" /><line x1="107" y1="488" x2="153" y2="488" /><line x1="107" y1="500" x2="153" y2="500" /><line x1="107" y1="512" x2="153" y2="512" /><line x1="107" y1="524" x2="153" y2="524" />
                         </g>
                      </g>
                   </g>

                   <g id="eyeball-assembly" style="transition: transform 0.15s ease-out;">
                      <circle cx="130" cy="364" r="26" fill="#1c1e22" stroke="#000" stroke-width="2"/>
                      <circle cx="130" cy="364" r="23" fill="#0a0b0c"/>
                      
                      <circle cx="147" cy="388" r="3.5" fill="#1a0000" stroke="#000" stroke-width="1"/>
                      <circle id="indicator-dot" cx="147" cy="388" r="2.5" fill="#ff2200" opacity="0.8" filter="url(#softGlow)"/>

                      <circle id="eye-halo" cx="130" cy="364" r="25" fill="#330800" opacity=".05" filter="url(#eyeBloom)"/>
                      
                      <g id="eye-pupil" style="transition: transform 0.15s ease-out;">
                        <circle id="eye-layer-idle" cx="130" cy="364" r="17.6" fill="url(#eyeGradIdle)" filter="url(#softGlow)" class="eye-layer" opacity="1" />
                        <circle id="eye-layer-listen" cx="130" cy="364" r="17.6" fill="url(#eyeGradListen)" filter="url(#softGlow)" class="eye-layer" opacity="0" />
                        <circle id="eye-layer-process" cx="130" cy="364" r="17.6" fill="url(#eyeGradProcess)" filter="url(#softGlow)" class="eye-layer" opacity="0" />
                        <circle id="eye-layer-respond" cx="130" cy="364" r="17.6" fill="url(#eyeGradRespond)" filter="url(#softGlow)" class="eye-layer" opacity="0" />
                        <circle id="eye-center" cx="130" cy="364" r="6.6" fill="#ffe855" />
                        <circle cx="128" cy="362" r="2.2" fill="#ffffff" opacity="0.7" />
                      </g>

                      <g clip-path="url(#eyeballClip)">
                         <path id="eye-lid" d="M 80 200 L 180 200 L 180 364 L 156 364 A 26 26 0 0 0 104 364 L 80 364 Z" fill="url(#lidGrad)" stroke="#000" stroke-width="2" style="transform:translateY(0px); transition:transform 0.7s ease-in-out;"/>
                         <path id="eye-lid-bottom" d="M 80 500 L 180 500 L 180 364 L 156 364 A 26 26 0 0 1 104 364 L 80 364 Z" fill="url(#lidGradFlip)" stroke="#000" stroke-width="2" style="transform:translateY(0px); transition:transform 0.7s ease-in-out;"/>
                      </g>
                   </g>
                </g>

                <path d="M 92 359 L 97 361 L 97 367 L 92 369 Z" fill="#050505"/>
                <path d="M 92 379 L 97 381 L 97 389 L 92 391 Z" fill="#050505"/>
                
                <rect id="danger-ring" x="97" y="283.25" width="66" height="161.5" rx="33" fill="none" stroke="#ff2200" stroke-width="2" opacity="0"/>
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
      svg: root.getElementById('glados-svg'),
      head: root.getElementById('glados-head'),
      bodyPivot: root.getElementById('body-pivot'),
      eyeLayerIdle: root.getElementById('eye-layer-idle'),
      eyeLayerListen: root.getElementById('eye-layer-listen'),
      eyeLayerProcess: root.getElementById('eye-layer-process'),
      eyeLayerRespond: root.getElementById('eye-layer-respond'),
      eyeHalo: root.getElementById('eye-halo'),
      eyeCenter: root.getElementById('eye-center'),
      pupil: root.getElementById('eye-pupil'),
      eyeball: root.getElementById('eyeball-assembly'),
      bellows: root.getElementById('bellows'),
      lidTop: root.getElementById('eye-lid'),
      lidBot: root.getElementById('eye-lid-bottom'),
      dangerRing: root.getElementById('danger-ring'),
      ledMatrices: root.querySelectorAll('.led-matrix')
    };

    let stateNow = 'idle', talkPhase = 0, talkAnim = null, lidTimer = null;
    let pupilTimer = null, idleTimer = null, glitchRaf = null;
    let currentBaseLid = 0;

    function setHead(rot, tx, ty, scale = 1.0, dur, ease = "cubic-bezier(0.34,1.06,0.64,1)") {
      el.head.style.transition = `transform ${dur}s ${ease}`;
      el.head.style.transform = `rotate(${rot}deg) translate(${tx}px,${ty}px) scale(${scale})`;
    }

    function setBodySwivel(rot, sx, dur) {
      el.bodyPivot.style.transition = `transform ${dur || 2.0}s cubic-bezier(0.45,0.05,0.55,0.95)`;
      el.bodyPivot.style.animation = 'none';
      el.bodyPivot.style.transform = `rotate(${rot}deg) scaleX(${sx || 1})`;
    }

    function resetBodySwivel() {
      el.bodyPivot.style.transition = '';
      el.bodyPivot.style.animation = '';
      el.bodyPivot.style.transform = '';
    }

    function setLid(amount, dur = 0.7) {
      const px = amount * 17; 
      el.lidTop.style.transition = `transform ${dur}s ease-in-out`;
      el.lidBot.style.transition = `transform ${dur}s ease-in-out`;
      el.lidTop.style.transform = `translateY(${px}px)`;
      el.lidBot.style.transform = `translateY(${-px}px)`;
    }

    function setBaseLid(amount, dur = 0.7) {
      currentBaseLid = amount;
      setLid(amount, dur);
    }

    function setPupil(px, py) {
      el.pupil.style.transform = `translate(${px}px, ${py}px)`;
      let ey = py * 1.5;
      el.eyeball.style.transform = `translateY(${ey}px)`;
      el.bellows.style.transform = `translateY(${ey}px)`;
    }

    // Optimization: Update via CSS variables instead of DOM queries
    function setLEDs(color, opacity) {
      el.svg.style.setProperty('--led-color', color);
      el.svg.style.setProperty('--led-opacity', opacity);
    }

    function startLidBehavior() {
      if (lidTimer) clearTimeout(lidTimer);
      function loop() {
        if (stateNow === 'idle') {
          let val = Math.max(0, Math.min(1, currentBaseLid + (Math.random() - 0.5) * 0.15));
          setLid(val, 0.5 + Math.random() * 0.8);
          lidTimer = setTimeout(loop, 1500 + Math.random() * 2500);
        } else if (stateNow === 'processing') {
          let val = 0.5 + (Math.random() * 0.35); 
          setLid(val, 0.04 + Math.random() * 0.08);
          lidTimer = setTimeout(loop, 40 + Math.random() * 120);
        }
      }
      loop();
    }

    function stopLidBehavior() {
      if (lidTimer) { clearTimeout(lidTimer); lidTimer = null; }
    }

    const IDLE_BEHAVIORS = [
      { name: 'passive', exec() { setHead(0, 0, 0, 1.0, 2.4); setBaseLid(0, 1.0); resetBodySwivel(); }, min: 6000, max: 13000, weight: 4 },
      { name: 'scan_right', exec() { setHead(12, 0, -5, 0.98, 1.4); setBaseLid(0, 1.0); setBodySwivel(-2, 1, 1.8); }, min: 3500, max: 7000, weight: 1.5 },
      { name: 'scan_left', exec() { setHead(-12, 0, -5, 0.98, 1.4); setBaseLid(0, 1.0); setBodySwivel(2, 1, 1.8); }, min: 3500, max: 7000, weight: 1.5 },
      { name: 'curious', exec() { setHead(8, 0, -20, 1.05, 1.2); setBaseLid(0, 0.8); setBodySwivel(-2, 1, 1.6); }, min: 4000, max: 8000, weight: 2 },
      { name: 'contemptuous', exec() { setHead(-6, 0, 15, 0.95, 1.8); setBaseLid(0.65, 1.0); setBodySwivel(1.5, 1, 2.0); setTimeout(() => { if (stateNow === 'idle') setBaseLid(0, 1.5); }, 1500); }, min: 5000, max: 10000, weight: 2 },
      { name: 'alert', exec() { setHead(0, 0, -25, 1.08, 0.28); setBaseLid(0, 0.2); setBodySwivel(-1, 1, 0.4); }, min: 1500, max: 3000, weight: 1 },
      { name: 'bored', exec() { setHead(2, 0, 20, 0.96, 2.8); setBaseLid(0.7, 1.5); setBodySwivel(1, 1, 3.0); setTimeout(() => { if (stateNow === 'idle') setBaseLid(0, 1.5); }, 1500); }, min: 7000, max: 14000, weight: 1.5 },
      { name: 'full_swivel', exec() { setBodySwivel(-6, 0.96, 2.5); setTimeout(() => { setHead(6, 0, -3, 1.02, 1.2); setBaseLid(0, 0.8); }, 600); }, min: 4000, max: 8000, weight: 0.8 },
      { name: 'glitch', exec() {
          let count = 0;
          let lastTime = 0;
          
          if (glitchRaf) cancelAnimationFrame(glitchRaf);

          function glitchLoop(timestamp) {
            if (!lastTime) lastTime = timestamp;
            const elapsed = timestamp - lastTime;
            
            if (elapsed > 60) {
              lastTime = timestamp;
              
              if (stateNow !== 'idle' || count > 12) {
                cancelAnimationFrame(glitchRaf);
                glitchRaf = null;
                if (stateNow === 'idle') {
                  el.eyeHalo.setAttribute('fill', '#330800');
                  el.eyeCenter.setAttribute('fill', '#ffcc00');
                  setHead(0, 0, 0, 1.0, 0.4);
                }
                return;
              }

              setHead((Math.random()-0.5)*10, (Math.random()-0.5)*8, (Math.random()-0.5)*8, 1.0, 0.05, "linear");
              if (count % 2 === 0) {
                 el.eyeHalo.setAttribute('fill', '#110000');
                 el.eyeCenter.setAttribute('fill', '#884400');
              } else {
                 el.eyeHalo.setAttribute('fill', '#ffb800');
                 el.eyeCenter.setAttribute('fill', '#ffffff');
              }
              count++;
            }
            glitchRaf = requestAnimationFrame(glitchLoop);
          }
          glitchRaf = requestAnimationFrame(glitchLoop);
      }, min: 4000, max: 7000, weight: 0.3 }
    ];

    function dartPupil() {
      if (stateNow === 'idle') {
        const activity = config.eye_speed !== undefined ? config.eye_speed : 50;
        
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
      dartPupil();
      idleTimer = setTimeout(runNextIdleBehavior, 2000 + Math.random() * 3000);
    };

    // Optimization: Handle RAF cleanup
    this.stopIdleCycle = () => {
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
      if (pupilTimer) { clearTimeout(pupilTimer); pupilTimer = null; }
      if (glitchRaf) { cancelAnimationFrame(glitchRaf); glitchRaf = null; }
    };

    const TALK_MOVES = [
      { r: -10, tx: -8, ty: -18, s: 1.02, dur: 1.8, lid: 0.1, px: 0, py: -2 },
      { r: 4, tx: 0, ty: 16, s: 1.08, dur: 1.2, lid: 0.85, px: 0, py: 4 },
      { r: 2, tx: 0, ty: 10, s: 1.04, dur: 1.0, lid: 0.5, px: 0, py: 2 },
      { r: 12, tx: 10, ty: -12, s: 0.96, dur: 2.2, lid: 0.1, px: 0, py: -1 },
      { r: 0, tx: 0, ty: 25, s: 1.10, dur: 1.8, lid: 0.9, px: 0, py: 5 },
      { r: -6, tx: 6, ty: -22, s: 0.98, dur: 1.0, lid: 0.1, px: 0, py: -3 },
      { r: 4, tx: -3, ty: 6, s: 1.03, dur: 2.0, lid: 0.4, px: 0, py: 1 },
      { r: -3, tx: 0, ty: 22, s: 1.15, dur: 1.2, lid: 0.95, px: 0, py: 6 },
      { r: 6, tx: 3, ty: -6, s: 1.0, dur: 1.5, lid: 0.2, px: 0, py: 0 },
    ];

    function startTalkAnim() {
      if (talkAnim) clearTimeout(talkAnim);
      talkPhase = 0;
      function step() {
        const m = TALK_MOVES[talkPhase % TALK_MOVES.length];
        setHead(m.r, m.tx, m.ty, m.s, m.dur, "ease-in-out");
        setLid(m.lid, m.dur);
        setPupil(m.px, m.py);
        setBodySwivel(m.r * -0.6, 1, m.dur); 
        talkPhase++;
        talkAnim = setTimeout(step, m.dur * 1000);
      }
      step();
    }

    const animateGlaDOS = (state) => {
      stateNow = state;
      if (talkAnim) clearTimeout(talkAnim);
      stopLidBehavior();
      this.stopIdleCycle();

      el.ledMatrices.forEach(m => m.classList.remove('pulsing'));
      el.dangerRing.setAttribute('opacity', '0');

      if (state === 'idle') {
        el.eyeLayerIdle.style.opacity = '1'; el.eyeLayerListen.style.opacity = '0'; el.eyeLayerProcess.style.opacity = '0'; el.eyeLayerRespond.style.opacity = '0';
        el.eyeHalo.setAttribute('fill', '#330800'); el.eyeCenter.setAttribute('fill', '#ffcc00');
        setHead(0, 0, 0, 1.0, 2.2); setLid(0, 1.2); setPupil(0, 0); currentBaseLid = 0;
        setLEDs('#ffb800', '0.15');
        resetBodySwivel();
        startLidBehavior();
        this.startIdleCycle();
      } else if (state === 'listening') {
        el.eyeLayerIdle.style.opacity = '0'; el.eyeLayerListen.style.opacity = '1'; el.eyeLayerProcess.style.opacity = '0'; el.eyeLayerRespond.style.opacity = '0';
        el.eyeHalo.setAttribute('fill', '#00ccff'); el.eyeCenter.setAttribute('fill', '#aaffff');
        setHead(4, 0, -8, 1.06, 1.0); setBaseLid(0.1, 0.4); setPupil(0, -3);
        setLEDs('#00ccff', '1');
        setBodySwivel(-2, 1, 1.4);
      } else if (state === 'processing') {
        el.eyeLayerIdle.style.opacity = '0'; el.eyeLayerListen.style.opacity = '0'; el.eyeLayerProcess.style.opacity = '1'; el.eyeLayerRespond.style.opacity = '0';
        el.eyeHalo.setAttribute('fill', '#ff6600'); el.eyeCenter.setAttribute('fill', '#ffddaa');
        setHead(-2, 0, 10, 0.96, 1.4); setBaseLid(0.65, 0.5); 
        setLEDs('#ff6600', '1');
        setBodySwivel(1, 0.98, 1.8);
        el.ledMatrices.forEach(m => m.classList.add('pulsing'));
        startLidBehavior();
        const dart = () => {
          if (stateNow !== 'processing') return;
          setPupil((Math.random() - 0.5) * 12, 4);
          pupilTimer = setTimeout(dart, 200 + Math.random() * 600);
        };
        dart();
      } else if (state === 'responding') {
        el.eyeLayerIdle.style.opacity = '0'; el.eyeLayerListen.style.opacity = '0'; el.eyeLayerProcess.style.opacity = '0'; el.eyeLayerRespond.style.opacity = '1';
        el.eyeHalo.setAttribute('fill', '#ff2200'); el.eyeCenter.setAttribute('fill', '#ffaaaa');
        el.dangerRing.setAttribute('opacity', '1');
        setLEDs('#ff2200', '1');
        setBodySwivel(0, 1, 0.8);
        startTalkAnim();
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
