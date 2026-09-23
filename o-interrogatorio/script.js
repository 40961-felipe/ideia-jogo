/**
 * O INTERROGATÓRIO // MOTOR DO JOGO
 * Personagem: Victor Vance (Suspeito)
 * Mecânicas: Estresse dinâmico, ECG interativo, Áudio Web sintetizado, 7 rodadas.
 */

// ============================================================================
// ESTADO DO JOGO
// ============================================================================
const GAME_STATE = {
  maxQuestions: 7,
  questionsLeft: 7,
  stress: 15,
  isGameOver: false,
  soundEnabled: true,
  discoveredClues: new Set(),
  bpm: 68,
  transcript: []
};

// Base de pistas e gatilhos secretos
const CLUE_DEFINITIONS = {
  TIMELINE: {
    id: "timeline",
    title: "Inconsistência de Horário (22h - 23h30)",
    desc: "Victor não possui álibi sólido entre 22h00 e 23h30; antena celular aponta sinal longe de sua cobertura."
  },
  FACTORY: {
    id: "factory",
    title: "Fábrica Abandonada da Família",
    desc: "Propriedade desativada com movimentação suspeita na noite do crime."
  },
  BASEMENT: {
    id: "basement",
    title: "Subsolo & Concreto Fresco",
    desc: "Vestígios de cal e piso concretado recentemente no subsolo da tecelagem."
  },
  CAR: {
    id: "car",
    title: "Carro de Helena Forjado",
    desc: "Veículo abandonado com banco do motorista regulado para 1,85m (a altura de Victor)."
  },
  FRAUD: {
    id: "fraud",
    title: "Fraude de 4 Milhões",
    desc: "Helena pretendia denunciar o desvio bilionário de Victor ao conselho fiscal."
  }
};

// ============================================================================
// SISTEMA DE ÁUDIO SINTETIZADO (Web Audio API - Sem arquivos externos)
// ============================================================================
class SoundEffects {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeep(freq = 440, type = 'sine', duration = 0.08, gainVal = 0.05) {
    if (!GAME_STATE.soundEnabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Falha silenciosa em navegadores com bloqueio estrito de áudio
    }
  }

  playHeartbeat() {
    if (!GAME_STATE.soundEnabled) return;
    this.playBeep(65, 'sine', 0.12, 0.15);
    setTimeout(() => {
      this.playBeep(52, 'sine', 0.16, 0.12);
    }, 140);
  }

  playStressSpike() {
    if (!GAME_STATE.soundEnabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  playDeskSlam() {
    if (!GAME_STATE.soundEnabled) return;
    this.init();
    try {
      // Som grave percussivo de impacto na mesa de metal
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch (e) {}
  }

  playTypewriter() {
    this.playBeep(850 + Math.random() * 200, 'triangle', 0.02, 0.02);
  }

  playVictory() {
    if (!GAME_STATE.soundEnabled) return;
    this.init();
    [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
      setTimeout(() => this.playBeep(freq, 'sine', 0.4, 0.1), idx * 120);
    });
  }

  playDefeat() {
    if (!GAME_STATE.soundEnabled) return;
    this.init();
    [220, 207.65, 196, 174.61].forEach((freq, idx) => {
      setTimeout(() => this.playBeep(freq, 'sawtooth', 0.5, 0.08), idx * 180);
    });
  }
}

const SFX = new SoundEffects();

// ============================================================================
// SIMULADOR DO MONITOR BIOMÉTRICO (ECG CANVAS)
// ============================================================================
class EcgMonitor {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.points = [];
    this.x = 0;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.middleY = this.height / 2;
    this.phase = 0;
    this.lastBeatTime = 0;
  }

  start() {
    const loop = (timestamp) => {
      this.draw(timestamp);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  draw(timestamp) {
    // Frequência de batimento baseada no estresse
    const targetBpm = 60 + Math.floor((GAME_STATE.stress / 100) * 110);
    GAME_STATE.bpm = targetBpm;
    document.getElementById('bpm-display').textContent = `${targetBpm} BPM`;

    const beatInterval = (60 / targetBpm) * 1000;
    const timeSinceLastBeat = timestamp - this.lastBeatTime;

    let yOffset = 0;

    // Gerar onda P-Q-R-S-T
    if (timeSinceLastBeat >= beatInterval) {
      this.lastBeatTime = timestamp;
      this.isBeating = true;
      this.beatPhase = 0;
      SFX.playHeartbeat();
    }

    if (this.isBeating) {
      this.beatPhase += 0.15 * (targetBpm / 60);
      if (this.beatPhase < 0.4) {
        yOffset = -3; // Onda P
      } else if (this.beatPhase >= 0.4 && this.beatPhase < 0.7) {
        yOffset = 4; // Q
      } else if (this.beatPhase >= 0.7 && this.beatPhase < 1.1) {
        yOffset = -18; // Pico R
      } else if (this.beatPhase >= 1.1 && this.beatPhase < 1.4) {
        yOffset = 8; // S
      } else if (this.beatPhase >= 1.4 && this.beatPhase < 1.8) {
        yOffset = -4; // T
      } else {
        this.isBeating = false;
        yOffset = 0;
      }
    }

    // Leve ruído de artefato elétrico
    const noise = (Math.random() - 0.5) * (GAME_STATE.stress > 60 ? 3 : 1);
    const targetY = this.middleY + yOffset + noise;

    this.points.push(targetY);
    if (this.points.length > this.width) {
      this.points.shift();
    }

    // Renderizar
    this.ctx.fillStyle = '#06090e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Linha de grade sutil
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    for (let gy = 0; gy < this.height; gy += 12) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, gy);
      this.ctx.lineTo(this.width, gy);
      this.ctx.stroke();
    }

    // Cor do traço muda conforme estresse
    let strokeColor = '#10b981'; // Verde calmo
    if (GAME_STATE.stress >= 75) strokeColor = '#ef4444'; // Vermelho perigo
    else if (GAME_STATE.stress >= 45) strokeColor = '#f59e0b'; // Âmbar alerta

    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 1.8;
    this.ctx.shadowBlur = GAME_STATE.stress > 70 ? 8 : 4;
    this.ctx.shadowColor = strokeColor;

    this.ctx.beginPath();
    for (let i = 0; i < this.points.length; i++) {
      if (i === 0) {
        this.ctx.moveTo(i, this.points[i]);
      } else {
        this.ctx.lineTo(i, this.points[i]);
      }
    }
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }
}

// ============================================================================
// MOTOR DE DIÁLOGO E PROCESSAMENTO DE PERGUNTAS DO JOGADOR
// ============================================================================
class InterrogationEngine {
  constructor() {
    this.transcriptEl = document.getElementById('transcript');
    this.stressFillEl = document.getElementById('stress-fill');
    this.stressValEl = document.getElementById('stress-percentage');
    this.cluesListEl = document.getElementById('clues-list');
    this.cluesCountEl = document.getElementById('clues-count');
    this.suspectBadgeEl = document.getElementById('suspect-state-badge');
    this.statusDescEl = document.getElementById('status-desc');
    this.portraitBoxEl = document.getElementById('portrait-box');
  }

  processQuestion(userQuestion) {
    if (GAME_STATE.isGameOver || GAME_STATE.questionsLeft <= 0) return;

    // Normalizar texto para análise semântica
    const cleanText = this.normalize(userQuestion);

    // Adiciona fala do detetive na transcrição
    this.appendDetectiveMessage(userQuestion);

    // Decrementar rodada
    GAME_STATE.questionsLeft--;
    this.updateRoundSlots();

    // Analisar padrões e intenções
    const analysis = this.analyzeIntent(cleanText);

    // Calcular novo estresse
    const previousStress = GAME_STATE.stress;
    GAME_STATE.stress = Math.min(100, Math.max(10, GAME_STATE.stress + analysis.stressDelta));

    // Registrar novas pistas
    analysis.discoveredClues.forEach(clueKey => {
      GAME_STATE.discoveredClues.add(clueKey);
    });

    // Atualizar UI
    this.updateStressMeter(previousStress, analysis.stressDelta);
    this.updateCluesUI();
    this.updateAvatarState();

    // Tocar efeito de impacto se estresse subiu muito
    if (analysis.stressDelta >= 25) {
      document.getElementById('game-container').classList.add('shake-screen');
      setTimeout(() => document.getElementById('game-container').classList.remove('shake-screen'), 450);
      SFX.playDeskSlam();
      SFX.playStressSpike();
    } else if (analysis.stressDelta > 0) {
      SFX.playStressSpike();
    }

    // Resposta de Victor com atraso dramático
    setTimeout(() => {
      this.appendVictorMessage(analysis.narrative, analysis.speech, analysis.stressDelta);

      // Verificar condições de Fim de Jogo
      if (GAME_STATE.stress >= 100) {
        this.triggerVictory();
      } else if (GAME_STATE.questionsLeft === 0) {
        this.triggerDefeat();
      }
    }, 600);
  }

  normalize(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s:]/gi, '');
  }

  analyzeIntent(text) {
    let delta = 0;
    let narrative = "";
    let speech = "";
    let discovered = [];

    // Detecção de gatilhos
    const hasFactory = /(fabrica|antiga fabrica|galpao|tecelagem|propriedade|terreno)/.test(text);
    const hasBasement = /(subsolo|porao|concreto|cal|cimento|entulho|enterrada|chao)/.test(text);
    const hasTimeline = /(22h|23h|22:00|23:30|horario|horas|alibi|noite|onze horas|dez horas|cobertura)/.test(text);
    const hasCar = /(carro|veiculo|banco|altura|fuga|estrada|rodovia|volante|bmw|caranga)/.test(text);
    const hasMoney = /(dinheiro|desvio|fraude|milhoes|4 milhoes|auditoria|golpe|socia|contas)/.test(text);
    const hasHelenaBody = /(corpo|matou|assassinou|morte|onde ela esta|sangue|crime)/.test(text);

    // ==========================================
    // 1. COMBO DEVASTADOR: Fábrica + Subsolo/Horário
    // ==========================================
    if (hasFactory && (hasBasement || hasTimeline)) {
      delta = +40;
      discovered.push("FACTORY", "BASEMENT");
      if (hasTimeline) discovered.push("TIMELINE");

      narrative = "Victor perde a cor do rosto instantaneamente. As algemas chacoalham ruidosamente na mesa quando ele tenta recuar o tronco. Pela primeira vez, suas mãos tremem e sua voz perde a compostura habitual.";
      speech = "O que... Quem foi o incompetente que te disse isso?! Aquela tecelagem é propriedade privada lacrada há oito anos! Vocês não tinham autorização nenhuma de pisar no subsolo! Isso é uma armação suja... você não tem provas técnicas de nada que esteja debaixo daquele piso!";
      return { stressDelta: delta, narrative, speech, discoveredClues: discovered };
    }

    // ==========================================
    // 2. GATILHO CRÍTICO: O Subsolo e o Concreto
    // ==========================================
    if (hasBasement) {
      delta = +35;
      discovered.push("BASEMENT", "FACTORY");
      narrative = "A respiração de Victor engasga. Ele pigarreia bruscamente, puxando o colarinho com a ponta dos dedos algemados. Uma gota de suor escorre por sua têmpora enquanto ele fita você com olhos arregalados.";
      speech = "Concreto fresco? Que diabos você está insinuando, Detetive?! Reformas estruturais acontecem o tempo todo nas plantas industriais da família. Se você acha que vai transformar restos de cal em um mandado de homicídio, está redondamente enganado!";
      return { stressDelta: delta, narrative, speech, discoveredClues: discovered };
    }

    // ==========================================
    // 3. PONTO FRACO 1: A Fábrica Abandonada
    // ==========================================
    if (hasFactory) {
      delta = +28;
      discovered.push("FACTORY");
      narrative = "O sorriso cínico de Victor congela. O maxilar dele contrai-se com tanta força que os músculos da mandíbula ficam salientes. Ele apoia as mãos fechadas sobre a mesa, tenso.";
      speech = "A fábrica da minha família? Não seja ridículo. Aquilo é um elefante branco desativado pelo qual meus advogados estão brigando na vara de falências há anos. Por que diabos a Helena iria até aquele lixão industrial se ela estava fugindo da auditoria?";
      return { stressDelta: delta, narrative, speech, discoveredClues: discovered };
    }

    // ==========================================
    // 4. PONTO FRACO 2: Horário Crítico (22h às 23h30)
    // ==========================================
    if (hasTimeline) {
      delta = +25;
      discovered.push("TIMELINE");
      narrative = "Victor desvia o olhar por uma fração de segundo, encarando a parede escura antes de voltar a encará-lo com os olhos semicerrados. Ele ajeita a gravata num gesto puramente mecânico de defesa.";
      speech = "Eu já dei meu depoimento por escrito aos seus inspetores: às 21h40 terminei uma videoconferência com investidores de Zurique. Depois disso tomei uma dose de Bourbon e adormeci na minha cobertura. Se as antenas de celular captaram ruído em outro bairro, culpe a operadora, não a mim.";
      return { stressDelta: delta, narrative, speech, discoveredClues: discovered };
    }

    // ==========================================
    // 5. EVIDÊNCIA: O Carro de Helena & Banco Ajustado
    // ==========================================
    if (hasCar) {
      delta = +20;
      discovered.push("CAR");
      narrative = "Victor solta uma risada breve e vazia, mas seus dedos tamborilam apressados contra o tampo de metal da mesa. Ele tenta parecer descontraído, mas a postura rígida o entrega.";
      speech = "O banco estava ajustado para trás? Helena frequentemente emprestava aquele carro para motoristas de aplicativo ou amigos da diretoria. Vocês estão tentando transformar um detalhe de ergonomia na arma do crime. É quase poético o seu desespero.";
      return { stressDelta: delta, narrative, speech, discoveredClues: discovered };
    }

    // ==========================================
    // 6. MOTIVAÇÃO: O Desvio de 4 Milhões
    // ==========================================
    if (hasMoney) {
      delta = +18;
      discovered.push("FRAUD");
      narrative = "Victor inclina a cabeça, exibindo uma expressão de desdém calculada para mascarar o desconforto evidente. Ele estala a língua com condescendência.";
      speech = "Quatro milhões de dólares? Detetive, a Vance Capital movimenta esse volume antes do almoço numa terça-feira comum. Helena tinha desavenças comigo, sim, mas conflitos societários são resolvidos por arbitragem comercial em cortes de Nova York, não com sangue.";
      return { stressDelta: delta, narrative, speech, discoveredClues: discovered };
    }

    // ==========================================
    // 7. ACUSAÇÃO DIRETA SEM PROVAS CONCRETAS
    // ==========================================
    if (hasHelenaBody) {
      delta = +5;
      narrative = "Victor reclina-se na cadeira com um meio-sorriso zombeteiro nos lábios. Ele o fita com calma glacial, satisfeito por notar a falta de substância na sua investida.";
      speech = "Você entra nesta sala e me acusa de assassinato sem ter apresentado uma única evidência tangível? Nenhum sangue, nenhuma confissão, nenhum corpo. Meu advogado vai fazer picadinho desse relatório em menos de cinco minutos perante o juiz.";
      return { stressDelta: delta, narrative, speech, discoveredClues: discovered };
    }

    // ==========================================
    // 8. PERGUNTA VAGA, FRACA OU PROVOCAÇÃO
    // ==========================================
    delta = -5; // Estresse cai ligeiramente
    narrative = "Victor suspira longamente, como um professor obrigado a tolerar a pergunta medíocre de um aluno desatento. Ele olha ostensivamente para o relógio na parede.";
    speech = "É esse o seu melhor repertório investigativo? Você está gastando o tempo que lhe resta com devaneios infantis. Daqui a pouco meus advogados chegam e você terá que me soltar sem absolutamente nada nas mãos.";

    return { stressDelta: delta, narrative, speech, discoveredClues: discovered };
  }

  appendDetectiveMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'dialogue-bubble detective';
    bubble.innerHTML = `
      <div class="speaker-tag">
        <span class="speaker-name">DETETIVE PRINCIPAL</span>
        <span class="badge-role">JOGADOR</span>
      </div>
      <div class="message-content">
        <p class="speech">"${this.escapeHtml(text)}"</p>
      </div>
    `;
    this.transcriptEl.appendChild(bubble);
    this.scrollToBottom();
  }

  appendVictorMessage(narrative, speech, delta) {
    const bubble = document.createElement('div');
    bubble.className = 'dialogue-bubble victor';

    let deltaBadge = "";
    if (delta > 0) {
      deltaBadge = `<span class="stress-delta increase">▲ +${delta}% ESTRESSE</span>`;
    } else if (delta < 0) {
      deltaBadge = `<span class="stress-delta decrease">▼ ${delta}% ESTRESSE</span>`;
    } else {
      deltaBadge = `<span class="stress-delta neutral">■ 0% ESTRESSE</span>`;
    }

    bubble.innerHTML = `
      <div class="speaker-tag">
        <span class="badge-role">SUSPEITO</span>
        <span class="speaker-name">VICTOR VANCE</span>
        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
        ${deltaBadge}
      </div>
      <div class="message-content">
        <p><em>${narrative}</em></p>
        <p class="speech">"${speech}"</p>
      </div>
    `;

    this.transcriptEl.appendChild(bubble);
    this.scrollToBottom();
    SFX.playTypewriter();
  }

  updateRoundSlots() {
    const slots = document.querySelectorAll('.slot');
    const usedCount = GAME_STATE.maxQuestions - GAME_STATE.questionsLeft;

    slots.forEach((slot, index) => {
      if (index < usedCount) {
        slot.classList.remove('active');
        slot.classList.add('used');
      } else {
        slot.classList.add('active');
        slot.classList.remove('used');
      }
    });

    const leftText = document.getElementById('questions-left-text');
    leftText.textContent = `${GAME_STATE.questionsLeft} pergunta${GAME_STATE.questionsLeft !== 1 ? 's' : ''} restante${GAME_STATE.questionsLeft !== 1 ? 's' : ''}`;
    
    if (GAME_STATE.questionsLeft <= 2) {
      leftText.style.color = '#ef4444';
      leftText.style.fontWeight = 'bold';
    }
  }

  updateStressMeter(previousStress, delta) {
    this.stressFillEl.style.width = `${GAME_STATE.stress}%`;
    this.stressValEl.textContent = `${GAME_STATE.stress}%`;

    // Alterar cores conforme nível de estresse
    if (GAME_STATE.stress >= 75) {
      this.stressFillEl.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
      this.stressValEl.style.color = '#ef4444';
    } else if (GAME_STATE.stress >= 45) {
      this.stressFillEl.style.background = 'linear-gradient(90deg, #10b981, #f59e0b)';
      this.stressValEl.style.color = '#f59e0b';
    } else {
      this.stressFillEl.style.background = 'linear-gradient(90deg, #10b981, #38bdf8)';
      this.stressValEl.style.color = '#38bdf8';
    }
  }

  updateAvatarState() {
    const stress = GAME_STATE.stress;
    this.portraitBoxEl.className = 'portrait-wrapper';

    if (stress < 40) {
      this.suspectBadgeEl.className = 'state-badge calm';
      this.suspectBadgeEl.textContent = 'ESTADO: CÍNICO & CALMO';
      this.statusDescEl.textContent = '"Advogados a caminho. Postura desafiadora e desdenhosa."';
    } else if (stress < 70) {
      this.portraitBoxEl.classList.add('portrait-nervous');
      this.suspectBadgeEl.className = 'state-badge nervous';
      this.suspectBadgeEl.textContent = 'ESTADO: INQUIETO & DEFENSIVO';
      this.statusDescEl.textContent = '"Ajustando a gola, evitando contato visual prolongado."';
    } else if (stress < 100) {
      this.portraitBoxEl.classList.add('portrait-nervous', 'portrait-sweating', 'portrait-panicked');
      this.suspectBadgeEl.className = 'state-badge threatened';
      this.suspectBadgeEl.textContent = 'ESTADO: AMEAÇADO & AGRESSIVO';
      this.statusDescEl.textContent = '"Suor frio nas têmporas, mãos cerradas, respiração curta."';
    } else {
      this.portraitBoxEl.classList.add('portrait-nervous', 'portrait-sweating', 'portrait-panicked');
      this.suspectBadgeEl.className = 'state-badge breakdown';
      this.suspectBadgeEl.textContent = 'ESTADO: COLAPSO PSICOLÓGICO';
      this.statusDescEl.textContent = '"Comportamento quebrado. Incapaz de sustentar as mentiras."';
    }
  }

  updateCluesUI() {
    const count = GAME_STATE.discoveredClues.size;
    this.cluesCountEl.textContent = `${count}/5`;

    if (count === 0) {
      this.cluesListEl.innerHTML = `<li class="clue-item empty">Nenhuma contradição exposta ainda...</li>`;
      return;
    }

    this.cluesListEl.innerHTML = '';
    GAME_STATE.discoveredClues.forEach(clueId => {
      const clue = CLUE_DEFINITIONS[clueId];
      if (clue) {
        const li = document.createElement('li');
        li.className = 'clue-item';
        li.innerHTML = `<strong>${clue.title}:</strong> ${clue.desc}`;
        this.cluesListEl.appendChild(li);
      }
    });
  }

  scrollToBottom() {
    this.transcriptEl.scrollTop = this.transcriptEl.scrollHeight;
  }

  triggerVictory() {
    GAME_STATE.isGameOver = true;
    document.getElementById('player-input').disabled = true;
    document.getElementById('send-btn').disabled = true;

    // Fala final de colapso de Victor no chat
    setTimeout(() => {
      const finalBubble = document.createElement('div');
      finalBubble.className = 'dialogue-bubble victor';
      finalBubble.innerHTML = `
        <div class="speaker-tag">
          <span class="badge-role" style="background: #ef4444; color: #fff;">CONFISSÃO</span>
          <span class="speaker-name">VICTOR VANCE</span>
        </div>
        <div class="message-content" style="border-left-color: #ef4444; background: #260a0d;">
          <p><em>Victor desaba contra o metal da mesa, enterrando o rosto nas mãos algemadas. Ele perde completamente o fôlego e o controle, com os olhos lacrimejando em puro pânico.</em></p>
          <p class="speech" style="color: #fca5a5; font-weight: 600;">
            "CHEGA! Mandem desligar essa droga de câmera agora! ...Eu não aguento mais essa pressão... Ela não ia parar! A Helena ia me denunciar na manhã seguinte, ia me expulsar da própria empresa que eu ergui do zero! Eu a levei até a fábrica... nós brigamos... ela bateu a cabeça nos degraus de metal. Eu entrei em pânico! O corpo está enterrado sob a sapata de concreto no subsolo 2 da tecelagem... agora tirem essas algemas de mim!"
          </p>
        </div>
      `;
      this.transcriptEl.appendChild(finalBubble);
      this.scrollToBottom();
      SFX.playVictory();

      // Abrir modal de vitória
      setTimeout(() => {
        this.showModal({
          victory: true,
          badge: "CASO RESOLVIDO // CONFISSÃO TOTAL",
          title: "VITÓRIA DO DETETIVE",
          narrative: "Victor Vance não suportou a pressão psicológica das suas perguntas e confessou o homicídio e a ocultação de cadáver de Helena Castro antes da chegada de seus advogados. A perícia foi despachada para o subsolo da fábrica e a ordem de prisão preventiva foi expedida imediatamente.",
          questionsUsed: GAME_STATE.maxQuestions - GAME_STATE.questionsLeft,
          cluesFound: `${GAME_STATE.discoveredClues.size}/5`,
          finalStress: `${GAME_STATE.stress}%`
        });
      }, 2500);
    }, 1200);
  }

  triggerDefeat() {
    GAME_STATE.isGameOver = true;
    document.getElementById('player-input').disabled = true;
    document.getElementById('send-btn').disabled = true;

    setTimeout(() => {
      const defeatBubble = document.createElement('div');
      defeatBubble.className = 'dialogue-bubble victor';
      defeatBubble.innerHTML = `
        <div class="speaker-tag">
          <span class="badge-role" style="background: #3f3f46; color: #fff;">ENCERRADO</span>
          <span class="speaker-name">ADVOGADOS DE DEFESA</span>
        </div>
        <div class="message-content" style="border-left-color: #64748b;">
          <p><em>A porta de aço da sala de interrogatório é aberta com força. Dois advogados de terno cinza e maletas de couro entram acompanhados pelo delegado plantonista com uma ordem de habeas corpus em mãos.</em></p>
          <p class="speech">"Este interrogatório está formalmente encerrado por violação dos direitos do meu cliente. O Sr. Vance está liberado imediatamente."</p>
          <p><em>Victor se levanta devagar, esticando os punhos enquanto os policiais removem as algemas. Ele olha para você com um sorriso triunfante e ajeita o paletó:</em></p>
          <p class="speech">"Eu avisei, Detetive. Você é apenas mais um funcionário público brincando de Sherlock Holmes. Passar bem."</p>
        </div>
      `;
      this.transcriptEl.appendChild(defeatBubble);
      this.scrollToBottom();
      SFX.playDefeat();

      setTimeout(() => {
        this.showModal({
          victory: false,
          badge: "TEMPO ESGOTADO // HABEAS CORPUS",
          title: "O ASSASSINO SAIU LIVRE",
          narrative: "As 7 rodadas de perguntas se esgotaram sem que você conseguisse quebrar a frieza de Victor Vance ou apresentar uma contradição definitiva. Ele deixou a delegacia livre pela porta da frente escoltado por seus advogados e pegará um jato privado para fora do país antes do amanhecer.",
          questionsUsed: 7,
          cluesFound: `${GAME_STATE.discoveredClues.size}/5`,
          finalStress: `${GAME_STATE.stress}%`
        });
      }, 2500);
    }, 1200);
  }

  showModal(data) {
    const modal = document.getElementById('endgame-modal');
    const card = document.getElementById('modal-card');
    const badge = document.getElementById('modal-badge');
    const title = document.getElementById('modal-title');
    const narrative = document.getElementById('modal-narrative');
    const stats = document.getElementById('modal-stats');

    card.className = `modal-card ${data.victory ? 'victory-theme' : 'defeat-theme'}`;
    badge.textContent = data.badge;
    title.textContent = data.title;
    narrative.textContent = data.narrative;

    stats.innerHTML = `
      <div class="modal-stat-box">
        <span class="modal-stat-value">${data.questionsUsed}/7</span>
        <span class="modal-stat-label">PERGUNTAS FEITAS</span>
      </div>
      <div class="modal-stat-box">
        <span class="modal-stat-value">${data.cluesFound}</span>
        <span class="modal-stat-label">PISTAS EXPOSTAS</span>
      </div>
      <div class="modal-stat-box">
        <span class="modal-stat-value" style="color: ${data.victory ? '#10b981' : '#ef4444'}">${data.finalStress}</span>
        <span class="modal-stat-label">ESTRESSE FINAL</span>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  escapeHtml(string) {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(string).replace(/[&<>"']/g, s => entityMap[s]);
  }
}

// ============================================================================
// INICIALIZAÇÃO DE EVENTOS E INTERAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const engine = new InterrogationEngine();
  const ecg = new EcgMonitor('ecgCanvas');
  ecg.start();

  const form = document.getElementById('question-form');
  const input = document.getElementById('player-input');
  const soundBtn = document.getElementById('sound-btn');
  const soundIcon = document.getElementById('sound-icon');
  const restartBtn = document.getElementById('restart-btn');
  const modalRestartBtn = document.getElementById('modal-restart-btn');
  const chips = document.querySelectorAll('.chip-btn');

  // Envio de pergunta digitada
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query || GAME_STATE.isGameOver) return;

    input.value = '';
    engine.processQuestion(query);
  });

  // Clique em Chips de Pistas Rápidas
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (GAME_STATE.isGameOver) return;
      const query = chip.getAttribute('data-query');
      input.value = query;
      input.focus();
    });
  });

  // Alternar Áudio
  soundBtn.addEventListener('click', () => {
    GAME_STATE.soundEnabled = !GAME_STATE.soundEnabled;
    soundIcon.textContent = GAME_STATE.soundEnabled ? '🔊 SOM: ATIVADO' : '🔇 SOM: MUDO';
    if (GAME_STATE.soundEnabled) SFX.playBeep(520, 'sine', 0.05, 0.05);
  });

  // Reiniciar Jogo
  const resetGame = () => {
    location.reload();
  };
  restartBtn.addEventListener('click', resetGame);
  modalRestartBtn.addEventListener('click', resetGame);

  // Ativar áudio no primeiro clique do usuário
  document.body.addEventListener('click', () => {
    SFX.init();
  }, { once: true });
});
