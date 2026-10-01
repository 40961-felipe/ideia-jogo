/**
 * TABLE TENNIS — 15 CHALLENGE
 * True 3D Perspective Table Tennis Physics & Rendering Engine
 * Simulates official table dimensions, net, 40mm ball, 3D trajectory,
 * gravity, table bounce, net collision, Magnus spin (Topspin/Backspin/Sidespin),
 * Forehand/Backhand, Serves, Smashes, Blocks, and escalating 15-phase AI.
 */

class TableTennisGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // Virtual resolution
    this.width = 1100;
    this.height = 680;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Camera & 3D Perspective Projection parameters
    // Coordinate system:
    // X: lateral across table (-width/2 = left, +width/2 = right)
    // Y: vertical elevation above table (0 = table top surface, +Y = upwards in air)
    // Z: longitudinal depth (0 = player baseline, net at Z = L/2, opponent baseline at Z = L)
    this.tableRealWidth = 152.5; // cm (standard 1.525m)
    this.tableRealLength = 274;  // cm (standard 2.74m)
    this.netHeight = 15.25;      // cm (standard 15.25cm)
    this.ballRadiusReal = 2.0;   // cm (40mm ball)

    // Virtual 3D scale units
    this.tableW = 340;   // virtual X width
    this.tableL = 600;   // virtual Z length
    this.netZ = this.tableL / 2; // 300
    this.netH = 42;      // virtual Y net height

    // Camera position (behind and slightly above player end)
    this.cam = {
      x: 0,
      y: 190,
      z: -170,
      fov: 340,
      horizonY: 260,
    };

    // Match State
    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.countdown = 0;
    this.countdownTimer = null;
    this.minPointsToWin = 12;
    this.minLead = 2;

    this.playerScore = 0;
    this.aiScore = 0;
    this.currentPhase = 1;
    this.matchStartTime = 0;
    this.matchElapsedSeconds = 0;

    // Service state
    this.server = 'player'; // 'player' or 'ai'
    this.servicePhase = 'ready'; // 'ready', 'toss', 'in_play'
    this.serviceCount = 0;

    // Rally tracking
    this.lastHitter = null; // 'player' or 'ai'
    this.bouncesPlayerSide = 0;
    this.bouncesAiSide = 0;
    this.netTouchInRally = false;
    this.rallyLength = 0;

    // Ball 3D state
    this.gravity = 1400; // cm/s^2 equivalent
    this.ball = {
      x: 0,
      y: 35,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spinX: 0, // Topspin (+) or Backspin (-)
      spinY: 0, // Sidespin
      radius: 9,
      trail: [],
    };

    // Player Paddle (Foreground, 3D)
    this.player = {
      x: 0,
      y: 40,
      z: -30,
      vx: 0,
      vy: 0,
      prevX: 0,
      prevY: 0,
      angleZ: 0,
      isForehand: true,
      swingProgress: 0,
      swingType: 'drive', // 'topspin', 'backspin', 'smash', 'block', 'drive'
      reach: 55,
      height: 70,
      width: 52,
    };

    // AI Paddle (Background, 3D)
    this.ai = {
      x: 0,
      y: 40,
      z: this.tableL + 30,
      targetX: 0,
      targetY: 40,
      speedX: 380,
      speedY: 280,
      lerp: 0.08,
      errorOffset: 0,
      spinProficiency: 0.1,
      smashChance: 0.1,
      isForehand: false,
      swingProgress: 0,
      swingType: 'drive',
      height: 65,
      width: 48,
    };

    // Active skills state
    this.skillsState = {
      skill_speed: { active: false, timer: 0, cooldownRemaining: 0, cooldownMax: 12 },
      skill_shield: { active: false, timer: 0, cooldownRemaining: 0, cooldownMax: 18, hitsLeft: 1 },
      skill_smash: { active: false, charged: false, cooldownRemaining: 0, cooldownMax: 10 },
      skill_freeze: { active: false, timer: 0, cooldownRemaining: 0, cooldownMax: 15 },
      skill_precision: { active: false, timer: 0, cooldownRemaining: 0, cooldownMax: 14 },
      skill_turbo: { active: false, timer: 0, cooldownRemaining: 0, cooldownMax: 16 },
    };

    // Visuals & Effects
    this.particles = [];
    this.floatingTexts = [];
    this.screenshake = 0;
    this.lastShotFeedback = '';

    // Inputs
    this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, KeyW: false, KeyS: false, KeyA: false, KeyD: false };
    this.mouseInput = { x: 0, y: 0, isDown: false, moved: false };

    // Callbacks
    this.onPhaseWin = null;
    this.onPhaseLose = null;
    this.onScoreUpdate = null;
    this.onSkillUpdate = null;

    this.setupListeners();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // --- 3D PERSPECTIVE PROJECTION ---
  project3D(x, y, z) {
    const relZ = z - this.cam.z;
    if (relZ <= 5) return { x: this.width / 2, y: this.height / 2, scale: 0, visible: false };

    const scale = this.cam.fov / relZ;
    const screenX = this.width / 2 + (x - this.cam.x) * scale;
    const screenY = this.cam.horizonY + (this.cam.y - y) * scale;

    return {
      x: screenX,
      y: screenY,
      scale: scale,
      visible: true,
    };
  }

  setupListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) { this.keys.ArrowUp = true; e.preventDefault(); }
      if (['ArrowDown', 'KeyS'].includes(e.code)) { this.keys.ArrowDown = true; e.preventDefault(); }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) { this.keys.ArrowLeft = true; e.preventDefault(); }
      if (['ArrowRight', 'KeyD'].includes(e.code)) { this.keys.ArrowRight = true; e.preventDefault(); }
      if (e.code === 'Space') {
        if (this.servicePhase === 'ready' && this.server === 'player') {
          this.executePlayerServe();
        } else if (this.isRunning) {
          this.togglePause();
        }
        e.preventDefault();
      }
      if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
        const index = parseInt(e.code.replace('Digit', '')) - 1;
        this.triggerEquippedSkillByIndex(index);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) this.keys.ArrowUp = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) this.keys.ArrowDown = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.keys.ArrowLeft = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) this.keys.ArrowRight = false;
    });

    // Mouse Controls
    const handlePointerMove = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;

      // Map screen coordinates into 3D player space
      // Lateral X: from -tableW * 0.75 to +tableW * 0.75
      const target3DX = (normX - 0.5) * (this.tableW * 1.5);
      // Vertical Y: from 5 to 110 cm
      const target3DY = Math.max(8, Math.min(125, (1 - normY) * 160));

      this.mouseInput.x = target3DX;
      this.mouseInput.y = target3DY;
      this.mouseInput.moved = true;
    };

    this.canvas.addEventListener('mousemove', (e) => {
      handlePointerMove(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.mouseInput.isDown = true;
      if (this.servicePhase === 'ready' && this.server === 'player') {
        this.executePlayerServe();
      } else {
        this.triggerPlayerSwing();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.mouseInput.isDown = false;
    });

    // Touch controls for mobile / tablet
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        if (this.servicePhase === 'ready' && this.server === 'player') {
          this.executePlayerServe();
        } else {
          this.triggerPlayerSwing();
        }
      }
    }, { passive: true });
  }

  // --- 15 PHASES PROGRESSIVE AI CONFIGURATION ---
  getPhaseConfig(phase) {
    const configs = {
      1: { title: 'Fase 1 — Muito fácil', aiSpeed: 300, aiLerp: 0.05, aiError: 55, spinPower: 0.05, smashRate: 0.04, desc: 'Adversário lento e com frequentes erros de devolução.' },
      2: { title: 'Fase 2 — Fácil', aiSpeed: 340, aiLerp: 0.065, aiError: 45, spinPower: 0.1, smashRate: 0.08, desc: 'Começa a devolver bolas mais consistentes.' },
      3: { title: 'Fase 3 — Fácil+', aiSpeed: 380, aiLerp: 0.08, aiError: 38, spinPower: 0.15, smashRate: 0.12, desc: 'Usa forehand e backhand com maior naturalidade.' },
      4: { title: 'Fase 4 — Normal', aiSpeed: 420, aiLerp: 0.095, aiError: 30, spinPower: 0.22, smashRate: 0.18, desc: 'Aplica topspin moderado nas trocas longas.' },
      5: { title: 'Fase 5 — Normal+', aiSpeed: 460, aiLerp: 0.11, aiError: 25, spinPower: 0.28, smashRate: 0.22, desc: 'Saques com efeito lateral e boa cobertura da mesa.' },
      6: { title: 'Fase 6 — Médio', aiSpeed: 500, aiLerp: 0.13, aiError: 20, spinPower: 0.35, smashRate: 0.28, desc: 'Devoluções rápidas e bloqueios firmes.' },
      7: { title: 'Fase 7 — Médio+', aiSpeed: 540, aiLerp: 0.15, aiError: 16, spinPower: 0.42, smashRate: 0.35, desc: 'Alterna entre topspin ofensivo e backspin defensivo.' },
      8: { title: 'Fase 8 — Difícil', aiSpeed: 590, aiLerp: 0.17, aiError: 13, spinPower: 0.5, smashRate: 0.42, desc: 'Adversário agressivo com saques profundos.' },
      9: { title: 'Fase 9 — Difícil+', aiSpeed: 640, aiLerp: 0.2, aiError: 10, spinPower: 0.58, smashRate: 0.5, desc: 'Contra-ataques imediatos em bolas mal devolvidas.' },
      10: { title: 'Fase 10 — Muito difícil', aiSpeed: 700, aiLerp: 0.23, aiError: 8, spinPower: 0.65, smashRate: 0.58, desc: 'Nível avançado com smashes rápidos e precisos.' },
      11: { title: 'Fase 11 — Extremo', aiSpeed: 760, aiLerp: 0.26, aiError: 6, spinPower: 0.72, smashRate: 0.66, desc: 'Devolve bolas com curvas agressivas de topspin.' },
      12: { title: 'Fase 12 — Extremo+', aiSpeed: 820, aiLerp: 0.3, aiError: 5, spinPower: 0.8, smashRate: 0.74, desc: 'Velocidade impressionante e tempo de reação mínimo.' },
      13: { title: 'Fase 13 — Insano', aiSpeed: 890, aiLerp: 0.34, aiError: 4, spinPower: 0.88, smashRate: 0.82, desc: 'Quase nenhum erro e saques de efeito cortado.' },
      14: { title: 'Fase 14 — Quase impossível', aiSpeed: 960, aiLerp: 0.38, aiError: 2.5, spinPower: 0.94, smashRate: 0.9, desc: 'Reflexos cirúrgicos e domínio completo da mesa.' },
      15: { title: 'Fase 15 — DESAFIO FINAL', aiSpeed: 1050, aiLerp: 0.44, aiError: 1.5, spinPower: 1.0, smashRate: 0.96, desc: 'O mestre supremo do tênis de mesa. Implacável.' },
    };
    return configs[phase] || configs[1];
  }

  startMatch(phaseNumber = 1) {
    this.currentPhase = Math.min(15, Math.max(1, phaseNumber));
    const config = this.getPhaseConfig(this.currentPhase);

    this.playerScore = 0;
    this.aiScore = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.isRunning = true;
    this.matchStartTime = Date.now();
    this.matchElapsedSeconds = 0;
    this.serviceCount = 0;
    this.server = 'player';
    this.servicePhase = 'ready';

    // AI parameters
    this.ai.speedX = config.aiSpeed;
    this.ai.lerp = config.aiLerp;
    this.ai.errorOffset = (Math.random() - 0.5) * config.aiError;
    this.ai.spinProficiency = config.spinPower;
    this.ai.smashChance = config.smashRate;

    // Reset player position
    this.player.x = 0;
    this.player.y = 40;
    this.player.z = -30;

    // Reset skills
    Object.keys(this.skillsState).forEach((key) => {
      this.skillsState[key].active = false;
      this.skillsState[key].timer = 0;
      this.skillsState[key].cooldownRemaining = 0;
    });

    this.particles = [];
    this.floatingTexts = [];
    this.lastShotFeedback = '';

    this.prepareServe();
    this.notifyScoreUpdate();
    this.notifySkillUpdate();
  }

  // Prepare a new point / serve
  prepareServe() {
    this.servicePhase = 'ready';
    this.bouncesPlayerSide = 0;
    this.bouncesAiSide = 0;
    this.lastHitter = null;
    this.netTouchInRally = false;
    this.ball.trail = [];

    // Switch server every 2 points (standard table tennis rule)
    const totalPoints = this.playerScore + this.aiScore;
    if (this.playerScore >= 11 && this.aiScore >= 11) {
      // In deuce, server alternates every single point!
      this.server = totalPoints % 2 === 0 ? 'player' : 'ai';
    } else {
      this.server = Math.floor(totalPoints / 2) % 2 === 0 ? 'player' : 'ai';
    }

    if (this.server === 'player') {
      // Ball rests in front of player ready to be served
      this.ball.x = this.player.x + 15;
      this.ball.y = 35;
      this.ball.z = -15;
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.ball.vz = 0;
      this.ball.spinX = 0;
      this.ball.spinY = 0;
      this.addFloatingText(this.width / 2, this.height / 2 - 80, 'SEU SAQUE! [CLIQUE OU ESPAÇO]', '#00f5d4');
    } else {
      // AI Serve
      this.ball.x = (Math.random() - 0.5) * (this.tableW * 0.6);
      this.ball.y = 35;
      this.ball.z = this.tableL + 15;
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.ball.vz = 0;
      this.ball.spinX = 0;
      this.ball.spinY = 0;
      this.addFloatingText(this.width / 2, this.height / 2 - 80, 'SAQUE DO ADVERSÁRIO...', '#ffd166');

      // AI serves after a short natural delay
      setTimeout(() => {
        if (this.isRunning && this.servicePhase === 'ready' && this.server === 'ai') {
          this.executeAiServe();
        }
      }, 1200);
    }
  }

  executePlayerServe() {
    if (this.servicePhase !== 'ready' || this.server !== 'player') return;
    this.servicePhase = 'in_play';
    this.lastHitter = 'player';
    this.bouncesPlayerSide = 0;
    this.bouncesAiSide = 0;

    // Natural table tennis serve trajectory: bounces first on player side, passes over net, hits opponent side
    const dirX = (this.player.x / (this.tableW / 2)) * 80 + (Math.random() - 0.5) * 40;
    this.ball.vx = dirX;
    this.ball.vy = -60; // arcs downward to bounce on player side
    this.ball.vz = 580;  // moves forward toward opponent
    this.ball.spinX = 15; // gentle topspin

    this.player.swingProgress = 1;
    this.player.swingType = 'drive';
    this.createImpactParticles3D(this.ball.x, this.ball.y, this.ball.z, '#00f2fe', 12);
    if (window.soundEngine) window.soundEngine.playPaddleHit(1.2);
  }

  executeAiServe() {
    if (this.servicePhase !== 'ready' || this.server !== 'ai') return;
    this.servicePhase = 'in_play';
    this.lastHitter = 'ai';
    this.bouncesPlayerSide = 0;
    this.bouncesAiSide = 0;

    const config = this.getPhaseConfig(this.currentPhase);
    const targetX = (Math.random() - 0.5) * (this.tableW * 0.7);

    this.ball.vx = (targetX - this.ball.x) * 1.8;
    this.ball.vy = -65;
    this.ball.vz = -580; // moves toward player
    this.ball.spinX = config.spinPower * 25; // escalating serve spin

    this.ai.swingProgress = 1;
    this.ai.swingType = 'drive';
    this.createImpactParticles3D(this.ball.x, this.ball.y, this.ball.z, '#ff0054', 12);
    if (window.soundEngine) window.soundEngine.playPaddleHit(0.9);
  }

  triggerPlayerSwing() {
    this.player.swingProgress = 1;
  }

  togglePause() {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
  }

  triggerEquippedSkillByIndex(slotIndex) {
    const user = window.storageEngine?.getCurrentUser();
    if (!user || !user.equipped || !user.equipped.skills) return;
    const skillId = user.equipped.skills[slotIndex];
    if (skillId) this.activateSkill(skillId);
  }

  activateSkill(skillId) {
    if (!this.isRunning || this.isPaused) return;
    const skill = this.skillsState[skillId];
    if (!skill || skill.cooldownRemaining > 0 || skill.active) return;

    const catalogItem = window.storageEngine?.getCatalog().find((i) => i.id === skillId);
    if (!catalogItem) return;

    if (window.soundEngine) window.soundEngine.playSkill(skillId.replace('skill_', ''));

    skill.active = true;
    skill.timer = catalogItem.duration || 4;
    skill.cooldownRemaining = catalogItem.cooldown || 12;
    skill.cooldownMax = catalogItem.cooldown || 12;

    if (skillId === 'skill_shield') {
      skill.hitsLeft = 1;
      this.addFloatingText(this.width / 2, this.height / 2, '🛡️ ESCUDO ATIVADO!', '#00f5d4');
    } else if (skillId === 'skill_smash') {
      skill.charged = true;
      this.addFloatingText(this.width / 2, this.height / 2, '🔥 SMASH CARREGADO!', '#ff5400');
    } else if (skillId === 'skill_precision') {
      this.player.reach = 85;
      this.addFloatingText(this.width / 2, this.height / 2, '🎯 PRECISÃO +50%!', '#c77dff');
    } else if (skillId === 'skill_speed') {
      this.addFloatingText(this.width / 2, this.height / 2, '⚡ VELOCIDADE +60%!', '#ffd166');
    } else if (skillId === 'skill_freeze') {
      this.ball.vx *= 0.45;
      this.ball.vy *= 0.45;
      this.ball.vz *= 0.45;
      this.addFloatingText(this.width / 2, this.height / 2, '❄️ FREEZE!', '#4cc9f0');
    } else if (skillId === 'skill_turbo') {
      this.addFloatingText(this.width / 2, this.height / 2, '⚡ TURBO SUPREMO!', '#f72585');
    }

    this.notifySkillUpdate();
  }

  // --- GAME LOOP & PHYSICS UPDATE ---
  loop(timestamp) {
    const dt = 1 / 60;
    if (this.isRunning && !this.isPaused && !this.isGameOver) {
      this.update(dt);
    }
    this.render();
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.matchElapsedSeconds = (Date.now() - this.matchStartTime) / 1000;

    // Update active skills cooldowns
    Object.keys(this.skillsState).forEach((key) => {
      const s = this.skillsState[key];
      if (s.active && s.timer > 0) {
        s.timer -= dt;
        if (s.timer <= 0) {
          s.active = false;
          if (key === 'skill_precision') this.player.reach = 55;
        }
      }
      if (s.cooldownRemaining > 0) {
        s.cooldownRemaining = Math.max(0, s.cooldownRemaining - dt);
        if (s.cooldownRemaining === 0) this.notifySkillUpdate();
      }
    });

    // 1. Update Player Paddle position & posture
    this.updatePlayerPaddle(dt);

    // 2. Update AI Paddle position & state
    this.updateAiPaddle(dt);

    // 3. Update Ball 3D Physics
    if (this.servicePhase === 'in_play') {
      this.updateBallPhysics(dt);
    }

    // 4. Update Visual Particles & Screen Shake
    if (this.screenshake > 0) {
      this.screenshake *= 0.86;
      if (this.screenshake < 0.2) this.screenshake = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 35 * dt;
      ft.alpha -= 0.6 * dt;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  updatePlayerPaddle(dt) {
    this.player.prevX = this.player.x;
    this.player.prevY = this.player.y;

    let moveSpeed = 650;
    if (this.skillsState.skill_speed.active) moveSpeed *= 1.6;
    if (this.skillsState.skill_turbo.active) moveSpeed *= 1.8;

    if (this.mouseInput.moved) {
      // Direct smooth tracking to mouse position
      const diffX = this.mouseInput.x - this.player.x;
      const diffY = this.mouseInput.y - this.player.y;
      this.player.x += diffX * 0.35;
      this.player.y += diffY * 0.35;
    } else {
      if (this.keys.ArrowLeft) this.player.x -= moveSpeed * dt;
      if (this.keys.ArrowRight) this.player.x += moveSpeed * dt;
      if (this.keys.ArrowUp) this.player.y += moveSpeed * dt;
      if (this.keys.ArrowDown) this.player.y -= moveSpeed * dt;
    }

    // Clamp inside realistic player range
    this.player.x = Math.max(-this.tableW * 0.75, Math.min(this.tableW * 0.75, this.player.x));
    this.player.y = Math.max(5, Math.min(130, this.player.y));

    // Player velocity (for imparting speed & spin)
    this.player.vx = (this.player.x - this.player.prevX) / dt;
    this.player.vy = (this.player.y - this.player.prevY) / dt;

    // Forehand / Backhand detection based on body side
    this.player.isForehand = this.player.x >= 0;

    // Swing recovery decay
    if (this.player.swingProgress > 0) {
      this.player.swingProgress = Math.max(0, this.player.swingProgress - dt * 3.5);
    }
  }

  updateAiPaddle(dt) {
    const config = this.getPhaseConfig(this.currentPhase);

    // AI tracks ball when moving toward AI side (vz > 0)
    if (this.ball.vz > 0) {
      this.ai.targetX = this.ball.x + this.ai.errorOffset;
      this.ai.targetY = Math.max(10, Math.min(110, this.ball.y));
    } else {
      // Return to tactical center
      this.ai.targetX = 0;
      this.ai.targetY = 45;
    }

    const diffX = this.ai.targetX - this.ai.x;
    const diffY = this.ai.targetY - this.ai.y;

    const stepX = Math.sign(diffX) * Math.min(Math.abs(diffX), this.ai.speedX * dt);
    const stepY = Math.sign(diffY) * Math.min(Math.abs(diffY), this.ai.speedY * dt);

    this.ai.x += stepX;
    this.ai.y += stepY;

    this.ai.isForehand = this.ai.x < 0; // mirrored

    if (this.ai.swingProgress > 0) {
      this.ai.swingProgress = Math.max(0, this.ai.swingProgress - dt * 3.5);
    }

    // AI Paddle Hit detection (when ball reaches opponent baseline z ~ tableL)
    if (
      this.servicePhase === 'in_play' &&
      this.ball.vz > 0 &&
      this.ball.z >= this.tableL - 10 &&
      this.ball.z <= this.tableL + 40
    ) {
      const dist = Math.hypot(this.ball.x - this.ai.x, this.ball.y - this.ai.y);
      if (dist <= 65) {
        this.handleAiReturn();
      }
    }
  }

  updateBallPhysics(dt) {
    // 1. Gravity and Magnus spin effect
    // Topspin (spinX > 0) causes downward aerodynamic curve
    // Backspin (spinX < 0) causes upward floating aerodynamic lift
    const magnusY = -this.ball.spinX * 3.8;
    const magnusX = this.ball.spinY * 3.2;

    this.ball.vy += (-this.gravity + magnusY) * dt;
    this.ball.vx += magnusX * dt;

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    this.ball.z += this.ball.vz * dt;

    // Trail
    this.ball.trail.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z, alpha: 0.9 });
    if (this.ball.trail.length > 12) this.ball.trail.shift();
    this.ball.trail.forEach((t) => (t.alpha *= 0.88));

    // 2. Table Bounce Collision (y = 0 is table surface)
    const isWithinTableX = Math.abs(this.ball.x) <= this.tableW / 2;
    const isWithinTableZ = this.ball.z >= 0 && this.ball.z <= this.tableL;

    if (this.ball.y <= 0 && isWithinTableX && isWithinTableZ) {
      this.ball.y = 0;
      this.ball.vy = Math.abs(this.ball.vy) * 0.84; // table restitution

      // Spin effect on bounce:
      // Topspin increases forward speed (vz)
      // Backspin brakes forward speed (vz)
      if (this.ball.spinX > 0) {
        this.ball.vz += Math.sign(this.ball.vz) * (this.ball.spinX * 0.4);
        this.ball.spinX *= 0.6; // spin transferred
      } else if (this.ball.spinX < 0) {
        this.ball.vz *= 0.85;
        this.ball.spinX *= 0.6;
      }

      // Check which side of table the bounce occurred
      if (this.ball.z < this.netZ) {
        this.bouncesPlayerSide++;
      } else {
        this.bouncesAiSide++;
      }

      // Visuals & Sound for bounce
      this.createImpactParticles3D(this.ball.x, 0, this.ball.z, '#ffffff', 8);
      if (window.soundEngine) window.soundEngine.playWallHit();

      // Check illegal double bounce
      if (this.bouncesPlayerSide >= 2) {
        this.awardPoint('ai', 'Dois quiques no campo do jogador!');
        return;
      }
      if (this.bouncesAiSide >= 2) {
        this.awardPoint('player', 'Dois quiques no campo do adversário!');
        return;
      }
    }

    // 3. Net Collision (z = netZ, y <= netH)
    if (Math.abs(this.ball.z - this.netZ) <= 10 && this.ball.y <= this.netH) {
      if (Math.abs(this.ball.x) <= this.tableW / 2 + 15) {
        // Ball clips the net
        this.netTouchInRally = true;
        this.ball.vz = -this.ball.vz * 0.35;
        this.ball.vy *= 0.5;
        this.createImpactParticles3D(this.ball.x, this.ball.y, this.netZ, '#00f5d4', 10);
        if (window.soundEngine) window.soundEngine.playWallHit();
      }
    }

    // 4. Player Paddle Hit Detection (when ball approaches z ~ 0)
    if (
      this.ball.vz < 0 &&
      this.ball.z <= this.player.z + 25 &&
      this.ball.z >= this.player.z - 35
    ) {
      const dist = Math.hypot(this.ball.x - this.player.x, this.ball.y - this.player.y);
      if (dist <= this.player.reach) {
        this.handlePlayerReturn();
        return;
      }
    }

    // 5. Out of bounds detection (ball fell past players or off table)
    if (this.ball.y < -70 || this.ball.z < -100 || this.ball.z > this.tableL + 120) {
      this.evaluateOutOfBounds();
    }
  }

  handlePlayerReturn() {
    this.lastHitter = 'player';
    this.bouncesPlayerSide = 0;
    this.bouncesAiSide = 0;
    this.rallyLength++;

    // Calculate shot type based on paddle vertical movement and position
    let shotType = 'drive';
    let spinVal = 10;
    let forwardSpeed = 620;
    let verticalSpeed = 220;

    if (this.skillsState.skill_smash.charged) {
      // Active Smash Skill
      shotType = 'smash';
      forwardSpeed = 980;
      verticalSpeed = 160;
      spinVal = 40;
      this.skillsState.skill_smash.charged = false;
      this.skillsState.skill_smash.active = false;
      this.screenshake = 18;
      this.addFloatingText(this.width / 2, this.height / 2 - 40, '🔥 SUPER SMASH!', '#ff0054');
    } else if (this.player.vy > 120) {
      // Quick upward stroke: TOPSPIN!
      shotType = 'topspin';
      forwardSpeed = 740;
      verticalSpeed = 260;
      spinVal = 35;
      this.addFloatingText(this.width / 2, this.height / 2 - 40, 'TOPSPIN!', '#00f2fe');
    } else if (this.player.vy < -100) {
      // Chopping downward stroke: BACKSPIN!
      shotType = 'backspin';
      forwardSpeed = 520;
      verticalSpeed = 180;
      spinVal = -30;
      this.addFloatingText(this.width / 2, this.height / 2 - 40, 'BACKSPIN!', '#ffd166');
    } else if (Math.abs(this.ball.vz) > 750) {
      // Defensive block against aggressive fast ball
      shotType = 'block';
      forwardSpeed = 560;
      verticalSpeed = 190;
      spinVal = 5;
      this.addFloatingText(this.width / 2, this.height / 2 - 40, 'BLOCK!', '#00f5d4');
    } else {
      shotType = this.player.isForehand ? 'Forehand Drive' : 'Backhand Drive';
      forwardSpeed = 620;
      verticalSpeed = 220;
      spinVal = 12;
    }

    // Directional control: hitting toward left or right of paddle angles return
    const offsetRatio = (this.ball.x - this.player.x) / this.player.reach;
    const lateralSpeed = offsetRatio * 260;

    this.ball.vx = lateralSpeed;
    this.ball.vy = verticalSpeed;
    this.ball.vz = forwardSpeed;
    this.ball.spinX = spinVal;
    this.ball.spinY = offsetRatio * 15;

    this.player.swingProgress = 1;
    this.player.swingType = shotType;

    const user = window.storageEngine?.getCurrentUser();
    const racketId = user?.equipped?.racket || 'racket_classic';
    const racketItem = window.storageEngine?.getCatalog().find((i) => i.id === racketId);
    const hitColor = racketItem?.color || '#00f2fe';

    this.createImpactParticles3D(this.ball.x, this.ball.y, this.ball.z, hitColor, 16);
    if (window.soundEngine) window.soundEngine.playPaddleHit(1.1);
  }

  handleAiReturn() {
    this.lastHitter = 'ai';
    this.bouncesPlayerSide = 0;
    this.bouncesAiSide = 0;
    this.rallyLength++;

    const config = this.getPhaseConfig(this.currentPhase);

    // AI shot selection
    let shotType = 'drive';
    let spinVal = 10;
    let forwardSpeed = 580 + this.currentPhase * 24;
    let verticalSpeed = 210;

    const willSmash = Math.random() < this.ai.smashChance && this.ball.y > 50;
    const willTopspin = Math.random() < 0.65;

    if (willSmash) {
      shotType = 'smash';
      forwardSpeed = 880 + this.currentPhase * 18;
      verticalSpeed = 150;
      spinVal = 30;
      this.screenshake = 14;
      this.addFloatingText(this.width / 2, this.height / 2 - 40, '⚡ ATAQUE DO ADVERSÁRIO!', '#ff0054');
    } else if (willTopspin) {
      shotType = 'topspin';
      forwardSpeed = 660 + this.currentPhase * 20;
      verticalSpeed = 240;
      spinVal = this.ai.spinProficiency * 35;
    } else {
      shotType = 'backspin';
      forwardSpeed = 520 + this.currentPhase * 15;
      verticalSpeed = 180;
      spinVal = -this.ai.spinProficiency * 25;
    }

    // Aim toward corners or away from player
    const targetX = (Math.random() > 0.5 ? 1 : -1) * (this.tableW * (0.25 + Math.random() * 0.2));
    const lateralSpeed = (targetX - this.ball.x) * 1.5;

    this.ball.vx = lateralSpeed;
    this.ball.vy = verticalSpeed;
    this.ball.vz = -forwardSpeed; // moves toward player
    this.ball.spinX = spinVal;
    this.ball.spinY = (Math.random() - 0.5) * 15;

    this.ai.swingProgress = 1;
    this.ai.swingType = shotType;

    this.createImpactParticles3D(this.ball.x, this.ball.y, this.ball.z, '#ff0054', 16);
    if (window.soundEngine) window.soundEngine.playPaddleHit(0.9);
  }

  evaluateOutOfBounds() {
    if (this.servicePhase !== 'in_play') return;

    // Check Shield barrier skill (saves ball if player missed)
    if (
      this.skillsState.skill_shield.active &&
      this.skillsState.skill_shield.hitsLeft > 0 &&
      this.lastHitter === 'ai' &&
      this.ball.z < 0
    ) {
      this.skillsState.skill_shield.hitsLeft = 0;
      this.skillsState.skill_shield.active = false;
      this.ball.vz = 650;
      this.ball.vy = 240;
      this.createImpactParticles3D(this.ball.x, this.ball.y, 0, '#00f5d4', 25);
      this.addFloatingText(this.width / 2, this.height / 2 - 40, '🛡️ DEFESA AUTOMÁTICA!', '#00f5d4');
      if (window.soundEngine) window.soundEngine.playSkill('shield');
      return;
    }

    // Table Tennis Scoring Rules:
    // If player hit last:
    //   - If it bounced 0 times on opponent side: Player hit out! AI scores.
    //   - If it bounced 1 time on opponent side and AI didn't return: Player scores!
    // If AI hit last:
    //   - If it bounced 0 times on player side: AI hit out! Player scores.
    //   - If it bounced 1 time on player side and player didn't return: AI scores.
    if (this.lastHitter === 'player') {
      if (this.bouncesAiSide >= 1) {
        this.awardPoint('player', 'Ponto do Jogador!');
      } else {
        this.awardPoint('ai', 'Bola fora!');
      }
    } else if (this.lastHitter === 'ai') {
      if (this.bouncesPlayerSide >= 1) {
        this.awardPoint('ai', 'Ponto do Adversário!');
      } else {
        this.awardPoint('player', 'Adversário jogou fora!');
      }
    } else {
      this.prepareServe();
    }
  }

  awardPoint(winner, reason = '') {
    this.servicePhase = 'point_awarded';

    if (winner === 'player') {
      this.playerScore++;
      this.screenshake = 10;
      this.addFloatingText(this.width / 2, this.height / 2 - 50, `+1 PONTO! (${reason})`, '#00f5d4');
      if (window.soundEngine) window.soundEngine.playScore(true);
    } else {
      this.aiScore++;
      this.screenshake = 12;
      this.addFloatingText(this.width / 2, this.height / 2 - 50, `PONTO ADVERSÁRIO (${reason})`, '#ff0054');
      if (window.soundEngine) window.soundEngine.playScore(false);
    }

    this.notifyScoreUpdate();
    this.checkMatchEnd();
  }

  checkMatchEnd() {
    // Rule 2 & Rule 26: Must reach >= 12 points AND have at least 2 points lead
    const isPlayerWin = this.playerScore >= this.minPointsToWin && (this.playerScore - this.aiScore) >= this.minLead;
    const isAiWin = this.aiScore >= this.minPointsToWin && (this.aiScore - this.playerScore) >= this.minLead;

    if (isPlayerWin) {
      this.isGameOver = true;
      this.isRunning = false;
      if (window.soundEngine) window.soundEngine.playPhaseWin();

      const duration = Math.round(this.matchElapsedSeconds);

      setTimeout(() => {
        if (this.onPhaseWin) {
          this.onPhaseWin({
            phase: this.currentPhase,
            playerScore: this.playerScore,
            opponentScore: this.aiScore,
            duration,
          });
        }
      }, 800);
    } else if (isAiWin) {
      this.isGameOver = true;
      this.isRunning = false;
      if (window.soundEngine) window.soundEngine.playGameOver();

      const duration = Math.round(this.matchElapsedSeconds);

      setTimeout(() => {
        if (this.onPhaseLose) {
          this.onPhaseLose({
            phase: this.currentPhase,
            playerScore: this.playerScore,
            opponentScore: this.aiScore,
            duration,
          });
        }
      }, 800);
    } else {
      // Continue next serve after point celebration
      setTimeout(() => {
        if (this.isRunning && !this.isGameOver) {
          this.prepareServe();
        }
      }, 1100);
    }
  }

  notifyScoreUpdate() {
    if (this.onScoreUpdate) {
      const isDeuce = this.playerScore >= 11 && this.aiScore >= 11 && this.playerScore === this.aiScore;
      const playerAdvantage = this.playerScore >= 11 && this.aiScore >= 11 && (this.playerScore - this.aiScore === 1);
      const aiAdvantage = this.playerScore >= 11 && this.aiScore >= 11 && (this.aiScore - this.playerScore === 1);

      this.onScoreUpdate({
        playerScore: this.playerScore,
        aiScore: this.aiScore,
        currentPhase: this.currentPhase,
        minPointsToWin: this.minPointsToWin,
        minLead: this.minLead,
        isDeuce,
        playerAdvantage,
        aiAdvantage,
        server: this.server,
      });
    }
  }

  notifySkillUpdate() {
    if (this.onSkillUpdate) {
      this.onSkillUpdate(this.skillsState);
    }
  }

  createImpactParticles3D(x, y, z, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 40;
      this.particles.push({
        x,
        y,
        z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 50,
        vz: (Math.random() - 0.5) * speed,
        color,
        size: Math.random() * 3 + 1.5,
        alpha: 1,
        decay: Math.random() * 1.5 + 1.0,
      });
    }
  }

  addFloatingText(x, y, text, color = '#ffd166') {
    this.floatingTexts.push({ x, y, text, color, alpha: 1 });
  }

  // ==========================================================================
  // 3D RENDERING PIPELINE (OFFICIAL TABLE, NET, RACKETS, BALL SHADOW, PARTICLES)
  // ==========================================================================
  render() {
    this.ctx.save();

    if (this.screenshake > 0) {
      this.ctx.translate(
        (Math.random() - 0.5) * this.screenshake,
        (Math.random() - 0.5) * this.screenshake
      );
    }

    // 1. Draw Sports Arena Backdrop & Floor
    this.renderArenaBackground();

    // 2. Draw 3D Table Tennis Table (legs, surface, lines, specular)
    this.render3DTable();

    // 3. Draw AI Paddle (far side of table)
    this.renderAiRacket();

    // 4. Draw Official Net in center
    this.render3DNet();

    // 5. Draw Ball Shadow on Table Surface
    this.renderBallShadow();

    // 6. Draw 3D Table Tennis Ball & Trail
    this.render3DBall();

    // 7. Draw Player Paddle in foreground
    this.renderPlayerRacket();

    // 8. Draw 3D Particles
    this.render3DParticles();

    // 9. In-Game Overlays (Deuce, Pause, Service hints)
    this.renderOverlays();

    this.ctx.restore();
  }

  renderArenaBackground() {
    const user = window.storageEngine?.getCurrentUser();
    const tableId = user?.equipped?.table || 'table_classic';
    const tableItem = window.storageEngine?.getCatalog().find((i) => i.id === tableId);
    const theme = tableItem?.theme || 'classic';

    // Sports Arena Gradient Backdrop
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    if (theme === 'neon' || theme === 'cyber') {
      bgGrad.addColorStop(0, '#040711');
      bgGrad.addColorStop(0.4, '#081022');
      bgGrad.addColorStop(1, '#020408');
    } else if (theme === 'lava') {
      bgGrad.addColorStop(0, '#150303');
      bgGrad.addColorStop(0.4, '#240808');
      bgGrad.addColorStop(1, '#0a0202');
    } else if (theme === 'galaxy') {
      bgGrad.addColorStop(0, '#060114');
      bgGrad.addColorStop(0.4, '#10052a');
      bgGrad.addColorStop(1, '#050110');
    } else {
      bgGrad.addColorStop(0, '#070b14');
      bgGrad.addColorStop(0.4, '#0d1728');
      bgGrad.addColorStop(1, '#05080f');
    }

    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Floor Parquet / Sports Rubber Mat Perspective Lines
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;
    const floorSteps = 12;
    for (let i = -floorSteps; i <= floorSteps; i++) {
      const p1 = this.project3D(i * 90, -110, -120);
      const p2 = this.project3D(i * 120, -110, this.tableL + 250);
      if (p1.visible && p2.visible) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    }
    this.ctx.restore();
  }

  render3DTable() {
    const user = window.storageEngine?.getCurrentUser();
    const tableId = user?.equipped?.table || 'table_classic';
    const tableItem = window.storageEngine?.getCatalog().find((i) => i.id === tableId);
    const theme = tableItem?.theme || 'classic';

    const halfW = this.tableW / 2;
    const len = this.tableL;

    // 4 Corners of table surface in 3D:
    // Bottom-Left (near player):  (-halfW, 0, 0)
    // Bottom-Right (near player): (+halfW, 0, 0)
    // Top-Right (near opponent):  (+halfW, 0, len)
    // Top-Left (near opponent):   (-halfW, 0, len)
    const pBL = this.project3D(-halfW, 0, 0);
    const pBR = this.project3D(halfW, 0, 0);
    const pTR = this.project3D(halfW, 0, len);
    const pTL = this.project3D(-halfW, 0, len);

    // 1. Draw Table Undercarriage Legs (dark sports metal)
    const legY = -110;
    const legBL = this.project3D(-halfW + 20, legY, 20);
    const legBR = this.project3D(halfW - 20, legY, 20);
    const legTL = this.project3D(-halfW + 20, legY, len - 20);
    const legTR = this.project3D(halfW - 20, legY, len - 20);

    this.ctx.save();
    this.ctx.strokeStyle = '#1a2233';
    this.ctx.lineWidth = 5;
    [
      [pBL, legBL],
      [pBR, legBR],
      [pTL, legTL],
      [pTR, legTR],
    ].forEach(([top, bot]) => {
      this.ctx.beginPath();
      this.ctx.moveTo(top.x, top.y);
      this.ctx.lineTo(bot.x, bot.y);
      this.ctx.stroke();
    });
    this.ctx.restore();

    // 2. Table Thickness (beveled wood edge)
    const thickBL = this.project3D(-halfW, -8, 0);
    const thickBR = this.project3D(halfW, -8, 0);

    this.ctx.fillStyle = '#0a101d';
    this.ctx.beginPath();
    this.ctx.moveTo(pBL.x, pBL.y);
    this.ctx.lineTo(pBR.x, pBR.y);
    this.ctx.lineTo(thickBR.x, thickBR.y);
    this.ctx.lineTo(thickBL.x, thickBL.y);
    this.ctx.closePath();
    this.ctx.fill();

    // 3. Main Table Surface (with lighting gradient)
    const surfaceGrad = this.ctx.createLinearGradient(0, pTL.y, 0, pBL.y);
    if (theme === 'neon') {
      surfaceGrad.addColorStop(0, '#061324');
      surfaceGrad.addColorStop(1, '#092542');
    } else if (theme === 'cyber') {
      surfaceGrad.addColorStop(0, '#15062a');
      surfaceGrad.addColorStop(1, '#2a0c4f');
    } else if (theme === 'lava') {
      surfaceGrad.addColorStop(0, '#1f0707');
      surfaceGrad.addColorStop(1, '#3b0e0e');
    } else if (theme === 'legendary') {
      surfaceGrad.addColorStop(0, '#19150b');
      surfaceGrad.addColorStop(1, '#2c2514');
    } else {
      // Official ITTF Deep Blue Table
      surfaceGrad.addColorStop(0, '#0c2340');
      surfaceGrad.addColorStop(1, '#1d4575');
    }

    this.ctx.fillStyle = surfaceGrad;
    this.ctx.beginPath();
    this.ctx.moveTo(pBL.x, pBL.y);
    this.ctx.lineTo(pBR.x, pBR.y);
    this.ctx.lineTo(pTR.x, pTR.y);
    this.ctx.lineTo(pTL.x, pTL.y);
    this.ctx.closePath();
    this.ctx.fill();

    // 4. Official White Table Borders & Center Line
    this.ctx.save();
    this.ctx.strokeStyle = theme === 'legendary' ? '#ffd700' : '#ffffff';
    this.ctx.lineWidth = 2.5;

    // Outer border
    this.ctx.beginPath();
    this.ctx.moveTo(pBL.x, pBL.y);
    this.ctx.lineTo(pBR.x, pBR.y);
    this.ctx.lineTo(pTR.x, pTR.y);
    this.ctx.lineTo(pTL.x, pTL.y);
    this.ctx.closePath();
    this.ctx.stroke();

    // Longitudinal White Center Line
    const centerNear = this.project3D(0, 0, 0);
    const centerFar = this.project3D(0, 0, len);
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(centerNear.x, centerNear.y);
    this.ctx.lineTo(centerFar.x, centerFar.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  render3DNet() {
    const halfW = this.tableW / 2 + 15; // Net posts extend 15cm outside table
    const netZ = this.netZ;
    const netH = this.netH;

    // Net bottom posts & top posts in 3D
    const pBL = this.project3D(-halfW, 0, netZ);
    const pBR = this.project3D(halfW, 0, netZ);
    const pTL = this.project3D(-halfW, netH, netZ);
    const pTR = this.project3D(halfW, netH, netZ);

    this.ctx.save();

    // Mesh body (semi-transparent dark mesh)
    this.ctx.fillStyle = 'rgba(10, 18, 30, 0.72)';
    this.ctx.beginPath();
    this.ctx.moveTo(pBL.x, pBL.y);
    this.ctx.lineTo(pBR.x, pBR.y);
    this.ctx.lineTo(pTR.x, pTR.y);
    this.ctx.lineTo(pTL.x, pTL.y);
    this.ctx.closePath();
    this.ctx.fill();

    // Grid lines on net
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1;
    for (let x = -halfW; x <= halfW; x += 18) {
      const bot = this.project3D(x, 0, netZ);
      const top = this.project3D(x, netH, netZ);
      this.ctx.beginPath();
      this.ctx.moveTo(bot.x, bot.y);
      this.ctx.lineTo(top.x, top.y);
      this.ctx.stroke();
    }

    // White Top Tape
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(pTL.x, pTL.y);
    this.ctx.lineTo(pTR.x, pTR.y);
    this.ctx.stroke();

    // Metal Net Posts
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(pBL.x, pBL.y);
    this.ctx.lineTo(pTL.x, pTL.y);
    this.ctx.moveTo(pBR.x, pBR.y);
    this.ctx.lineTo(pTR.x, pTR.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  renderBallShadow() {
    // Project shadow directly onto table surface (y = 0)
    const isOverTable = Math.abs(this.ball.x) <= this.tableW / 2 && this.ball.z >= 0 && this.ball.z <= this.tableL;
    const shadowY = isOverTable ? 0 : -105; // on table or on floor
    const pShadow = this.project3D(this.ball.x, shadowY, this.ball.z);

    if (!pShadow.visible) return;

    // Shadow darkens and tightens when closer to surface
    const heightAboveSurface = Math.max(0, this.ball.y - shadowY);
    const alpha = Math.max(0.1, 0.65 - heightAboveSurface * 0.005);
    const rx = (this.ball.radius * 1.5 + heightAboveSurface * 0.08) * pShadow.scale;
    const ry = rx * 0.45; // perspective flattening

    this.ctx.save();
    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    this.ctx.beginPath();
    this.ctx.ellipse(pShadow.x, pShadow.y, rx, ry, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  render3DBall() {
    const user = window.storageEngine?.getCurrentUser();
    const ballId = user?.equipped?.ball || 'ball_classic';
    const ballItem = window.storageEngine?.getCatalog().find((i) => i.id === ballId);
    const ballColor = ballItem?.color || '#ffffff';
    const trailType = ballItem?.trailType || 'classic';

    // 1. Draw 3D Trail
    this.ball.trail.forEach((t, i) => {
      const p = this.project3D(t.x, t.y, t.z);
      if (!p.visible) return;
      this.ctx.save();
      this.ctx.globalAlpha = t.alpha * 0.5;
      let c = ballColor;
      if (trailType === 'fire') c = '#ff5400';
      if (trailType === 'electric') c = '#ffd166';
      if (trailType === 'galaxy') c = '#c77dff';
      if (trailType === 'legendary') c = '#ffd700';
      this.ctx.fillStyle = c;
      const r = (this.ball.radius * 0.7 * (i / this.ball.trail.length)) * p.scale;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 2. Project 3D Ball
    const pBall = this.project3D(this.ball.x, this.ball.y, this.ball.z);
    if (!pBall.visible) return;

    const r = Math.max(3, this.ball.radius * pBall.scale);

    this.ctx.save();
    // Ball Outer Glow
    this.ctx.shadowColor = ballColor;
    this.ctx.shadowBlur = 10;

    // 3D Sphere shading with specular highlight
    const ballGrad = this.ctx.createRadialGradient(
      pBall.x - r * 0.3, pBall.y - r * 0.35, r * 0.1,
      pBall.x, pBall.y, r
    );
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.3, ballColor);
    ballGrad.addColorStop(1, '#94a3b8');

    this.ctx.fillStyle = ballGrad;
    this.ctx.beginPath();
    this.ctx.arc(pBall.x, pBall.y, r, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  // Render Realistic Table Tennis Paddle in 3D
  renderTableTennisPaddle(x, y, z, isPlayer, isForehand, swingProgress, customColor, customAccent) {
    const p = this.project3D(x, y, z);
    if (!p.visible) return;

    const baseW = isPlayer ? this.player.width : this.ai.width;
    const baseH = isPlayer ? this.player.height : this.ai.height;
    const w = baseW * p.scale;
    const h = baseH * p.scale;

    this.ctx.save();
    this.ctx.translate(p.x, p.y);

    // Natural racket tilt angle based on forehand vs backhand and swing
    const tilt = isForehand ? -0.25 - swingProgress * 0.35 : 0.25 + swingProgress * 0.35;
    this.ctx.rotate(tilt);

    // 1. Wooden Handle
    const handleW = w * 0.26;
    const handleH = h * 0.55;
    this.ctx.fillStyle = '#b45309'; // natural wood handle
    this.roundRect(this.ctx, -handleW / 2, h * 0.35, handleW, handleH, 3, true);

    // Handle Grip Stripe
    this.ctx.fillStyle = '#fde68a';
    this.ctx.fillRect(-handleW / 2 + 2, h * 0.42, handleW - 4, handleH * 0.7);

    // 2. Oval Racket Blade & Sponge Rubber
    // Red rubber on forehand side, Black rubber on backhand side (official rule)
    const rubberColor = customColor || (isForehand ? '#dc2626' : '#111827');

    this.ctx.shadowColor = customAccent || 'rgba(0,0,0,0.5)';
    this.ctx.shadowBlur = 12;

    // Wooden bevel edge around rubber
    this.ctx.fillStyle = '#d97706';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, w / 2 + 2, h / 2 + 2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Main Pimpled/Inverted Rubber Face
    this.ctx.fillStyle = rubberColor;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Specular rubber sheen
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    this.ctx.beginPath();
    this.ctx.ellipse(-w * 0.15, -h * 0.15, w * 0.25, h * 0.25, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  renderPlayerRacket() {
    const user = window.storageEngine?.getCurrentUser();
    const racketId = user?.equipped?.racket || 'racket_classic';
    const racketItem = window.storageEngine?.getCatalog().find((i) => i.id === racketId);

    this.renderTableTennisPaddle(
      this.player.x,
      this.player.y,
      this.player.z,
      true,
      this.player.isForehand,
      this.player.swingProgress,
      racketItem?.color,
      racketItem?.glow
    );
  }

  renderAiRacket() {
    this.renderTableTennisPaddle(
      this.ai.x,
      this.ai.y,
      this.ai.z,
      false,
      this.ai.isForehand,
      this.ai.swingProgress,
      '#ef4444',
      'rgba(239, 68, 68, 0.6)'
    );
  }

  render3DParticles() {
    this.particles.forEach((p) => {
      const proj = this.project3D(p.x, p.y, p.z);
      if (!proj.visible) return;
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    this.floatingTexts.forEach((ft) => {
      this.ctx.save();
      this.ctx.globalAlpha = ft.alpha;
      this.ctx.fillStyle = ft.color;
      this.ctx.font = 'bold 22px "Orbitron", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = ft.color;
      this.ctx.shadowBlur = 12;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    });
  }

  renderOverlays() {
    // Service state indicator at bottom
    if (this.servicePhase === 'ready') {
      this.ctx.save();
      this.ctx.textAlign = 'center';
      this.ctx.font = '700 20px "Orbitron", sans-serif';
      if (this.server === 'player') {
        this.ctx.fillStyle = '#00f5d4';
        this.ctx.shadowColor = '#00f5d4';
        this.ctx.shadowBlur = 14;
        this.ctx.fillText('SUA VEZ DE SACAR • CLIQUE OU APERTE [ESPAÇO]', this.width / 2, this.height - 45);
      } else {
        this.ctx.fillStyle = '#ffd166';
        this.ctx.fillText('AGUARDANDO SAQUE DO ADVERSÁRIO...', this.width / 2, this.height - 45);
      }
      this.ctx.restore();
    }

    // Pause Overlay
    if (this.isPaused) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(5, 11, 20, 0.8)';
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.textAlign = 'center';
      this.ctx.font = '900 48px "Orbitron", sans-serif';
      this.ctx.fillStyle = '#ffd166';
      this.ctx.shadowColor = '#ffd166';
      this.ctx.shadowBlur = 20;
      this.ctx.fillText('PARTIDA PAUSADA', this.width / 2, this.height / 2);

      this.ctx.font = '600 18px "Rajdhani", sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText('Pressione [ESPAÇO] para despausar', this.width / 2, this.height / 2 + 45);
      this.ctx.restore();
    }
  }

  roundRect(ctx, x, y, width, height, radius = 5, fill = true, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}

// Global class export
window.PingPongGame = TableTennisGame;
