/**
 * Storage & Backend Simulation Layer for Ping Pong 15 Challenge
 * Enforces business logic, economy, ranking, authentication, inventory,
 * RBAC permissions (USER / ADMIN), moderation system, and match outcome validation.
 */

const STORAGE_KEYS = {
  USERS: 'pp15_users',
  CURRENT_USER_ID: 'pp15_current_user_id',
  INVENTORY: 'pp15_inventory',
  TRANSACTIONS: 'pp15_transactions',
  MATCH_HISTORY: 'pp15_match_history',
  ATTEMPTS: 'pp15_attempts',
  GLOBAL_RANKING: 'pp15_global_ranking',
  MODERATION_LOGS: 'pp15_moderation_logs',
};

// Phase Rewards Table strictly according to specification
const PHASE_REWARDS = {
  1: { name: 'Fase 1 — Muito fácil', reward: 10, bonus: 0 },
  2: { name: 'Fase 2 — Fácil', reward: 15, bonus: 0 },
  3: { name: 'Fase 3 — Fácil+', reward: 20, bonus: 0 },
  4: { name: 'Fase 4 — Normal', reward: 30, bonus: 0 },
  5: { name: 'Fase 5 — Normal+', reward: 40, bonus: 50 },
  6: { name: 'Fase 6 — Médio', reward: 50, bonus: 0 },
  7: { name: 'Fase 7 — Médio+', reward: 65, bonus: 0 },
  8: { name: 'Fase 8 — Difícil', reward: 80, bonus: 0 },
  9: { name: 'Fase 9 — Difícil+', reward: 100, bonus: 0 },
  10: { name: 'Fase 10 — Muito difícil', reward: 125, bonus: 150 },
  11: { name: 'Fase 11 — Extremo', reward: 150, bonus: 0 },
  12: { name: 'Fase 12 — Extremo+', reward: 175, bonus: 0 },
  13: { name: 'Fase 13 — Insano', reward: 200, bonus: 0 },
  14: { name: 'Fase 14 — Quase impossível', reward: 250, bonus: 0 },
  15: { name: 'Fase 15 — Desafio final', reward: 500, bonus: 500 },
};

// Catalog of Items (Paddles, Balls, Tables, Skills)
const CATALOG_ITEMS = [
  // 🏓 RAQUETES
  {
    id: 'racket_classic',
    category: 'rackets',
    name: 'Raquete Clássica',
    price: 0,
    rarity: 'Comum',
    description: 'Design esportivo tradicional de alta confiabilidade.',
    effect: 'Padrão com acabamento texturizado.',
    color: '#00f2fe',
    glow: 'rgba(0, 242, 254, 0.4)',
    accent: '#ffffff',
  },
  {
    id: 'racket_neon',
    category: 'rackets',
    name: 'Raquete Neon',
    price: 100,
    rarity: 'Incomum',
    description: 'Bordas fluorescentes ciano que iluminam cada batida.',
    effect: 'Brilho neon ciano vibrante ao rebater.',
    color: '#00f5d4',
    glow: 'rgba(0, 245, 212, 0.8)',
    accent: '#7b2cbf',
  },
  {
    id: 'racket_flame',
    category: 'rackets',
    name: 'Raquete Flame',
    price: 250,
    rarity: 'Raro',
    description: 'Forjada em calor extremo, projeta faíscas ao contato.',
    effect: 'Efeito de fogo e brasas ao rebater a bola.',
    color: '#ff5400',
    glow: 'rgba(255, 84, 0, 0.85)',
    accent: '#ffbd00',
  },
  {
    id: 'racket_thunder',
    category: 'rackets',
    name: 'Raquete Thunder',
    price: 500,
    rarity: 'Raro',
    description: 'Carregada com descargas de plasma de alta voltagem.',
    effect: 'Efeito elétrico de arcos de choque na bola.',
    color: '#ffd166',
    glow: 'rgba(255, 209, 102, 0.85)',
    accent: '#06d6a0',
  },
  {
    id: 'racket_galaxy',
    category: 'rackets',
    name: 'Raquete Galaxy',
    price: 750,
    rarity: 'Épico',
    description: 'Sintetizada com poeira cósmica e matéria estelar.',
    effect: 'Partículas espaciais e rastro nebuloso no impacto.',
    color: '#9d4edd',
    glow: 'rgba(157, 78, 221, 0.85)',
    accent: '#e0aaff',
  },
  {
    id: 'racket_legendary',
    category: 'rackets',
    name: 'Raquete Legendary',
    price: 1500,
    rarity: 'Lendário',
    description: 'A relíquia suprema dos mestres lendários do Ping Pong.',
    effect: 'Onda de choque dourada e explosão prismática de luz.',
    color: '#f72585',
    glow: 'rgba(247, 37, 133, 0.9)',
    accent: '#ffe600',
  },

  // ⚪ BOLINHAS
  {
    id: 'ball_classic',
    category: 'balls',
    name: 'Bola Clássica',
    price: 0,
    rarity: 'Comum',
    description: 'Bola de celulóide com dinâmica de voo balanceada.',
    effect: 'Rastro tênue esbranquiçado.',
    color: '#ffffff',
    trailType: 'classic',
  },
  {
    id: 'ball_neon',
    category: 'balls',
    name: 'Bola Neon',
    price: 100,
    rarity: 'Incomum',
    description: 'Núcleo eletroluminescente de alta visibilidade.',
    effect: 'Rastro luminoso azul neon em alta velocidade.',
    color: '#00f2fe',
    trailType: 'neon',
  },
  {
    id: 'ball_flame',
    category: 'balls',
    name: 'Bola Flame',
    price: 300,
    rarity: 'Raro',
    description: 'Inflamada com energia térmica constante.',
    effect: 'Deixa um rastro intenso de partículas de fogo e fumaça.',
    color: '#ff3e3e',
    trailType: 'fire',
  },
  {
    id: 'ball_thunder',
    category: 'balls',
    name: 'Bola Thunder',
    price: 500,
    rarity: 'Raro',
    description: 'Descargas estáticas piscando em alta velocidade.',
    effect: 'Produz pequenos efeitos elétricos e centelhas amarelas.',
    color: '#ffea00',
    trailType: 'electric',
  },
  {
    id: 'ball_galaxy',
    category: 'balls',
    name: 'Bola Galaxy',
    price: 750,
    rarity: 'Épico',
    description: 'Gira com gravidade própria e constelações em miniatura.',
    effect: 'Partículas cintilantes de estrelas roxas e violetas.',
    color: '#c77dff',
    trailType: 'galaxy',
  },
  {
    id: 'ball_legendary',
    category: 'balls',
    name: 'Bola Legendary',
    price: 1500,
    rarity: 'Lendário',
    description: 'Banhada em ouro e luz celestial da vitória.',
    effect: 'Rastro dourado radiante com fragmentos prismáticos.',
    color: '#ffd700',
    trailType: 'legendary',
  },

  // 🏟️ MESAS
  {
    id: 'table_classic',
    category: 'tables',
    name: 'Mesa Clássica',
    price: 0,
    rarity: 'Comum',
    description: 'Azul clássico de campeonato com linhas nítidas.',
    effect: 'Ambiente esportivo de arena clássica.',
    theme: 'classic',
    tableBg: '#0f172a',
    tableBorder: '#38bdf8',
    netColor: 'rgba(255, 255, 255, 0.4)',
  },
  {
    id: 'table_neon',
    category: 'tables',
    name: 'Mesa Neon',
    price: 300,
    rarity: 'Incomum',
    description: 'Mesa com linhas luminescentes e luz de borda ativa.',
    effect: 'Grade neon azul e ciano pulsante.',
    theme: 'neon',
    tableBg: '#050b14',
    tableBorder: '#00f2fe',
    netColor: '#00f5d4',
  },
  {
    id: 'table_cyber',
    category: 'tables',
    name: 'Mesa Cyber',
    price: 600,
    rarity: 'Raro',
    description: 'Estética synthwave 2088 com malha isométrica.',
    effect: 'Scanlines dinâmicas e contornos magenta.',
    theme: 'cyber',
    tableBg: '#120524',
    tableBorder: '#f72585',
    netColor: '#b5179e',
  },
  {
    id: 'table_lava',
    category: 'tables',
    name: 'Mesa Lava',
    price: 900,
    rarity: 'Raro',
    description: 'Superfície de basalto com fendas de magma brilhante.',
    effect: 'Brasas ascendentes e brilho avermelhado quente.',
    theme: 'lava',
    tableBg: '#1a0505',
    tableBorder: '#ff5400',
    netColor: '#ff0054',
  },
  {
    id: 'table_galaxy',
    category: 'tables',
    name: 'Mesa Galaxy',
    price: 1200,
    rarity: 'Épico',
    description: 'Visão panorâmica de uma nebulosa cósmica profunda.',
    effect: 'Estrelas de fundo que cintilam lentamente.',
    theme: 'galaxy',
    tableBg: '#0a0118',
    tableBorder: '#7209b7',
    netColor: '#4cc9f0',
  },
  {
    id: 'table_legendary',
    category: 'tables',
    name: 'Mesa Legendary',
    price: 2000,
    rarity: 'Lendário',
    description: 'Mármore obsidiana esculpido com detalhes em ouro puro.',
    effect: 'Bordas de ouro resplandecentes e aura mística de elite.',
    theme: 'legendary',
    tableBg: '#141108',
    tableBorder: '#ffd700',
    netColor: '#f3c623',
  },

  // ⚡ HABILIDADES
  {
    id: 'skill_speed',
    category: 'skills',
    name: 'Velocidade',
    icon: '⚡',
    price: 500,
    rarity: 'Raro',
    duration: 5,
    cooldown: 12,
    description: 'Aumenta temporariamente a velocidade da sua raquete em 60%.',
    effect: 'Movimento instantâneo e ágil por 5 segundos.',
  },
  {
    id: 'skill_shield',
    category: 'skills',
    name: 'Escudo',
    icon: '🛡️',
    price: 700,
    rarity: 'Raro',
    duration: 6,
    cooldown: 18,
    description: 'Cria uma barreira de força atrás da raquete que bloqueia um ponto.',
    effect: 'Salva uma bola perdida e rebate automaticamente.',
  },
  {
    id: 'skill_smash',
    category: 'skills',
    name: 'Smash',
    icon: '🔥',
    price: 800,
    rarity: 'Épico',
    duration: 0,
    cooldown: 10,
    description: 'A próxima rebatida recebe aceleração explosiva de 2.2x.',
    effect: 'Disparo fulminante difícil de ser interceptado pelo adversário.',
  },
  {
    id: 'skill_freeze',
    category: 'skills',
    name: 'Freeze',
    icon: '❄️',
    price: 900,
    rarity: 'Épico',
    duration: 3,
    cooldown: 15,
    description: 'Congela o ar, reduzindo a velocidade da bola para 40% por 3 segundos.',
    effect: 'Tempo de reação estendido para jogadas difíceis.',
  },
  {
    id: 'skill_precision',
    category: 'skills',
    name: 'Precisão',
    icon: '🎯',
    price: 600,
    rarity: 'Incomum',
    duration: 5,
    cooldown: 14,
    description: 'Aumenta a extensão da sua raquete em 50% por 5 segundos.',
    effect: 'Área de contato ampliada para defesa infalível.',
  },
  {
    id: 'skill_turbo',
    category: 'skills',
    name: 'Turbo',
    icon: '⚡',
    price: 1000,
    rarity: 'Lendário',
    duration: 4,
    cooldown: 16,
    description: 'Aumenta ao máximo a velocidade da raquete e a precisão do reflexo por 4 segundos.',
    effect: 'Estado hiperfocado supremo.',
  },
];

// Initial mock leaderboards (elite players)
const DEFAULT_GLOBAL_RANKING = [
  {
    id: 'bot_1',
    name: 'Alex "CyberLord"',
    username: 'cyber_alex',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    maxPhase: 15,
    score: 18450,
    totalTime: 382,
    attempts: 4,
    date: '2026-09-28',
  },
  {
    id: 'bot_2',
    name: 'Valkyrie Prime',
    username: 'valk_99',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    maxPhase: 15,
    score: 17200,
    totalTime: 415,
    attempts: 7,
    date: '2026-09-29',
  },
  {
    id: 'bot_3',
    name: 'Hiroshi Tanaka',
    username: 'hiro_spin',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    maxPhase: 14,
    score: 14900,
    totalTime: 360,
    attempts: 9,
    date: '2026-09-30',
  },
  {
    id: 'bot_4',
    name: 'Elena Rostova',
    username: 'elena_pong',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    maxPhase: 13,
    score: 12850,
    totalTime: 340,
    attempts: 5,
    date: '2026-09-27',
  },
  {
    id: 'bot_5',
    name: 'Marcus Bolt',
    username: 'mbolt',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    maxPhase: 12,
    score: 11200,
    totalTime: 310,
    attempts: 11,
    date: '2026-09-26',
  },
  {
    id: 'bot_6',
    name: 'Camila Santos',
    username: 'cami_fast',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    maxPhase: 10,
    score: 8750,
    totalTime: 245,
    attempts: 6,
    date: '2026-09-25',
  },
  {
    id: 'bot_7',
    name: 'Neo Smash',
    username: 'neosmash',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    maxPhase: 9,
    score: 7400,
    totalTime: 220,
    attempts: 8,
    date: '2026-09-24',
  },
];

class StorageEngine {
  constructor() {
    this.initDatabase();
  }

  initDatabase() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.GLOBAL_RANKING)) {
      localStorage.setItem(STORAGE_KEYS.GLOBAL_RANKING, JSON.stringify(DEFAULT_GLOBAL_RANKING));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MATCH_HISTORY)) {
      localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTEMPTS)) {
      localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MODERATION_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.MODERATION_LOGS, JSON.stringify([]));
    }

    // Ensure initial users exist with the owner/primary user configured as ADMIN
    const users = this.getUsers();
    let currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);

    if (users.length === 0) {
      // 1. Primary Owner Account (ADMIN)
      const adminUser = {
        id: 'usr_admin_01',
        name: 'Administrador Mestre',
        username: 'admin',
        email: 'admin@pingpong.gg',
        password_hash: btoa('admin123'),
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin_pong',
        google_id: null,
        coins: 200,
        highest_phase: 15,
        highest_score: 19500,
        best_time: 320,
        attempts: 12,
        wins: 48,
        losses: 4,
        role: 'ADMIN',
        status: 'ACTIVE',
        ban_reason: null,
        banned_at: null,
        ban_expires_at: null,
        banned_by: null,
        created_at: '2026-09-01T10:00:00.000Z',
        updated_at: new Date().toISOString(),
        equipped: {
          racket: 'racket_legendary',
          ball: 'ball_legendary',
          table: 'table_legendary',
          skills: ['skill_speed', 'skill_smash', 'skill_shield'],
        },
        inventory: [
          'racket_classic', 'racket_neon', 'racket_flame', 'racket_thunder', 'racket_galaxy', 'racket_legendary',
          'ball_classic', 'ball_neon', 'ball_flame', 'ball_thunder', 'ball_galaxy', 'ball_legendary',
          'table_classic', 'table_neon', 'table_cyber', 'table_lava', 'table_galaxy', 'table_legendary',
          'skill_speed', 'skill_shield', 'skill_smash', 'skill_freeze', 'skill_precision', 'skill_turbo',
        ],
        currentRun: { active: false, phase: 1, score: 0, streak: 0, startTime: null, totalTime: 0 },
      };

      // 2. Demo Normal Active Player (USER)
      const normalUser = {
        id: 'usr_player_02',
        name: 'Felipe Pong',
        username: 'felipe_striker',
        email: 'felipe@pingpong.gg',
        password_hash: btoa('123456'),
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=felipe_striker',
        google_id: null,
        coins: 350,
        highest_phase: 8,
        highest_score: 7200,
        best_time: 210,
        attempts: 6,
        wins: 18,
        losses: 5,
        role: 'USER',
        status: 'ACTIVE',
        ban_reason: null,
        banned_at: null,
        ban_expires_at: null,
        banned_by: null,
        created_at: '2026-09-15T14:30:00.000Z',
        updated_at: new Date().toISOString(),
        equipped: { racket: 'racket_neon', ball: 'ball_neon', table: 'table_neon', skills: ['skill_speed'] },
        inventory: ['racket_classic', 'racket_neon', 'ball_classic', 'ball_neon', 'table_classic', 'table_neon', 'skill_speed'],
        currentRun: { active: false, phase: 1, score: 0, streak: 0, startTime: null, totalTime: 0 },
      };

      // 3. Demo Banned Account (for Admin moderation verification)
      const bannedUser = {
        id: 'usr_banned_03',
        name: 'Hacker Trapaceiro',
        username: 'speed_cheat99',
        email: 'cheat@badmail.com',
        password_hash: btoa('123456'),
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=speed_cheat99',
        google_id: null,
        coins: 0,
        highest_phase: 1,
        highest_score: 0,
        best_time: 0,
        attempts: 2,
        wins: 0,
        losses: 2,
        role: 'USER',
        status: 'BANNED',
        ban_reason: 'Uso de scripts não autorizados de macro para cliques automáticos.',
        banned_at: '2026-09-25T16:00:00.000Z',
        ban_expires_at: null, // Permanent
        banned_by: 'usr_admin_01',
        created_at: '2026-09-24T18:20:00.000Z',
        updated_at: new Date().toISOString(),
        equipped: { racket: 'racket_classic', ball: 'ball_classic', table: 'table_classic', skills: [] },
        inventory: ['racket_classic', 'ball_classic', 'table_classic'],
        currentRun: { active: false, phase: 1, score: 0, streak: 0, startTime: null, totalTime: 0 },
      };

      this.saveUsers([adminUser, normalUser, bannedUser]);
      this.setCurrentUser(adminUser.id); // Default to ADMIN as required: "Minha conta deverá ser configurada como ADMIN"

      this.recordTransaction(adminUser.id, 200, 'initial_bonus', '🪙 Bônus de boas-vindas do Administrador');
      this.recordTransaction(normalUser.id, 200, 'initial_bonus', '🪙 Bônus inicial');
      this.logModerationAction({
        adminId: 'usr_admin_01',
        adminName: 'Administrador Mestre',
        targetUserId: 'usr_banned_03',
        targetUsername: 'speed_cheat99',
        action: 'BAN_USER',
        reason: 'Uso de scripts não autorizados de macro para cliques automáticos.',
        metadata: { type: 'PERMANENT' },
      });
    } else {
      // Ensure existing users have role and status attributes
      let changed = false;
      users.forEach((u, i) => {
        if (!u.role) {
          u.role = i === 0 ? 'ADMIN' : 'USER';
          changed = true;
        }
        if (!u.status) {
          u.status = 'ACTIVE';
          changed = true;
        }
      });
      if (changed) this.saveUsers(users);

      if (!currentId || !users.some((u) => u.id === currentId)) {
        this.setCurrentUser(users[0].id);
      }
    }
  }

  // --- USER AUTHENTICATION & PROFILE ---
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    } catch {
      return [];
    }
  }

  saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  getCurrentUser() {
    const users = this.getUsers();
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const user = users.find((u) => u.id === id) || null;
    if (user) {
      // Check if temporary ban has expired
      this.checkUserBanStatus(user);
    }
    return user;
  }

  setCurrentUser(userId) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  }

  logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  }

  // Check if temporary ban has expired; auto-unban if date passed
  checkUserBanStatus(user) {
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      if (user.ban_expires_at) {
        const now = new Date().getTime();
        const expires = new Date(user.ban_expires_at).getTime();
        if (now > expires) {
          user.status = 'ACTIVE';
          user.ban_reason = null;
          user.ban_expires_at = null;
          this.updateUserById(user.id, () => user);
          this.logModerationAction({
            adminId: 'SYSTEM',
            adminName: 'Sistema Automático',
            targetUserId: user.id,
            targetUsername: user.username,
            action: 'AUTO_UNBAN',
            reason: 'Período de suspensão temporária expirado com sucesso.',
            metadata: {},
          });
        }
      }
    }
  }

  registerUser({ name, username, email, password }) {
    const users = this.getUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Este nome de usuário já está em uso.');
    }

    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name,
      username,
      email,
      password_hash: btoa(password),
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      google_id: null,
      coins: 200,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      highest_phase: 0,
      highest_score: 0,
      best_time: 0,
      attempts: 0,
      wins: 0,
      losses: 0,
      role: 'USER',
      status: 'ACTIVE',
      ban_reason: null,
      banned_at: null,
      ban_expires_at: null,
      banned_by: null,
      equipped: {
        racket: 'racket_classic',
        ball: 'ball_classic',
        table: 'table_classic',
        skills: ['skill_speed'],
      },
      inventory: ['racket_classic', 'ball_classic', 'table_classic', 'skill_speed'],
      currentRun: {
        active: false,
        phase: 1,
        score: 0,
        streak: 0,
        startTime: null,
        totalTime: 0,
      },
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setCurrentUser(newUser.id);
    this.recordTransaction(newUser.id, 200, 'initial_bonus', '🪙 Bônus de boas-vindas ao jogador');
    return newUser;
  }

  loginUser(email, password) {
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('E-mail não encontrado.');
    }
    if (user.password_hash !== btoa(password) && !user.google_id) {
      throw new Error('Senha incorreta.');
    }

    this.checkUserBanStatus(user);

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      this.setCurrentUser(user.id);
      throw new Error(`🚫 CONTA SUSPENSA: ${user.ban_reason || 'Violação dos termos de uso do jogo.'}`);
    }

    this.setCurrentUser(user.id);
    return user;
  }

  loginWithGoogle(name = 'Google Player', email = 'google.player@gmail.com') {
    const users = this.getUsers();
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      const username = 'g_' + name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) + Math.floor(Math.random() * 1000);
      user = {
        id: 'usr_g_' + Date.now(),
        name,
        username,
        email,
        password_hash: null,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        google_id: 'goog_' + Date.now(),
        coins: 200,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        highest_phase: 0,
        highest_score: 0,
        best_time: 0,
        attempts: 0,
        wins: 0,
        losses: 0,
        role: 'USER',
        status: 'ACTIVE',
        ban_reason: null,
        banned_at: null,
        ban_expires_at: null,
        banned_by: null,
        equipped: {
          racket: 'racket_classic',
          ball: 'ball_classic',
          table: 'table_classic',
          skills: ['skill_speed'],
        },
        inventory: ['racket_classic', 'ball_classic', 'table_classic', 'skill_speed'],
        currentRun: {
          active: false,
          phase: 1,
          score: 0,
          streak: 0,
          startTime: null,
          totalTime: 0,
        },
      };
      users.push(user);
      this.saveUsers(users);
      this.recordTransaction(user.id, 200, 'initial_bonus', '🪙 Bônus de boas-vindas Google');
    }

    this.checkUserBanStatus(user);

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      this.setCurrentUser(user.id);
      throw new Error(`🚫 CONTA SUSPENSA: ${user.ban_reason || 'Violação dos termos de uso do jogo.'}`);
    }

    this.setCurrentUser(user.id);
    return user;
  }

  updateCurrentUser(updaterFn) {
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    return this.updateUserById(id, updaterFn);
  }

  updateUserById(userId, updaterFn) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx] = updaterFn(users[idx]);
      users[idx].updated_at = new Date().toISOString();
      this.saveUsers(users);
      return users[idx];
    }
    return null;
  }

  // --- RBAC & PERMISSION CHECKS (BACKEND VALIDATION) ---
  hasRole(user, role) {
    return user && user.role === role;
  }

  requireAdmin(user = null) {
    const currentUser = user || this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Acesso negado: Usuário não autenticado.');
    }
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Acesso negado: Requer privilégios de Administrador.');
    }
    if (currentUser.status === 'BANNED' || currentUser.status === 'SUSPENDED') {
      throw new Error('Acesso negado: Conta suspensa.');
    }
    return currentUser;
  }

  assertUserNotBanned(user) {
    if (!user) throw new Error('Usuário não autenticado.');
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new Error(`Ação bloqueada: Sua conta está suspensa. Motivo: ${user.ban_reason || 'Violação das regras.'}`);
    }
  }

  // --- MODERATION ACTIONS & LOGS ---
  getModerationLogs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.MODERATION_LOGS) || '[]');
    } catch {
      return [];
    }
  }

  logModerationAction({ adminId, adminName, targetUserId, targetUsername, action, reason, metadata = {} }) {
    try {
      const logs = this.getModerationLogs();
      const entry = {
        id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        admin_id: adminId,
        admin_name: adminName,
        target_user_id: targetUserId,
        target_username: targetUsername,
        action,
        reason: reason || 'Nenhum motivo fornecido.',
        created_at: new Date().toISOString(),
        metadata,
      };
      logs.unshift(entry);
      if (logs.length > 300) logs.pop();
      localStorage.setItem(STORAGE_KEYS.MODERATION_LOGS, JSON.stringify(logs));
      return entry;
    } catch {
      return null;
    }
  }

  banUser({ adminUserId, targetUserId, reason, isPermanent, expiresAt }) {
    // 1. Validate Admin identity & permissions
    const admin = this.getUsers().find((u) => u.id === adminUserId);
    this.requireAdmin(admin);

    if (adminUserId === targetUserId) {
      throw new Error('Você não pode banir sua própria conta.');
    }

    const target = this.getUsers().find((u) => u.id === targetUserId);
    if (!target) {
      throw new Error('Usuário alvo não encontrado.');
    }

    if (target.role === 'ADMIN') {
      throw new Error('Não é permitido banir outro usuário administrador diretamente.');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('É obrigatório informar o motivo do banimento.');
    }

    const status = isPermanent ? 'BANNED' : 'SUSPENDED';
    const banExpiresAt = isPermanent ? null : (expiresAt || new Date(Date.now() + 7 * 86400000).toISOString());

    // Update target user
    const updated = this.updateUserById(targetUserId, (u) => {
      u.status = status;
      u.ban_reason = reason.trim();
      u.banned_at = new Date().toISOString();
      u.ban_expires_at = banExpiresAt;
      u.banned_by = admin.id;
      // Invalidate current match attempt
      if (u.currentRun) {
        u.currentRun.active = false;
      }
      return u;
    });

    // Record moderation log
    this.logModerationAction({
      adminId: admin.id,
      adminName: admin.name,
      targetUserId: target.id,
      targetUsername: target.username,
      action: isPermanent ? 'BAN_USER' : 'SUSPEND_USER',
      reason: reason.trim(),
      metadata: { isPermanent, expiresAt: banExpiresAt },
    });

    return { success: true, user: updated };
  }

  unbanUser({ adminUserId, targetUserId, reason }) {
    const admin = this.getUsers().find((u) => u.id === adminUserId);
    this.requireAdmin(admin);

    const target = this.getUsers().find((u) => u.id === targetUserId);
    if (!target) {
      throw new Error('Usuário alvo não encontrado.');
    }

    const updated = this.updateUserById(targetUserId, (u) => {
      u.status = 'ACTIVE';
      u.ban_reason = null;
      u.banned_at = null;
      u.ban_expires_at = null;
      u.banned_by = null;
      return u;
    });

    this.logModerationAction({
      adminId: admin.id,
      adminName: admin.name,
      targetUserId: target.id,
      targetUsername: target.username,
      action: 'UNBAN_USER',
      reason: reason ? reason.trim() : 'Desbanimento efetuado pelo administrador.',
      metadata: {},
    });

    return { success: true, user: updated };
  }

  // --- ADMIN DASHBOARD METRICS ---
  getAdminDashboardMetrics() {
    const users = this.getUsers();
    const matches = this.getAllMatches();
    const transactions = this.getAllTransactions();

    const totalPlayers = users.length;
    const activePlayers = users.filter((u) => u.status === 'ACTIVE').length;
    const bannedPlayers = users.filter((u) => u.status === 'BANNED' || u.status === 'SUSPENDED').length;

    const totalMatches = matches.length;
    const matchesWon = matches.filter((m) => m.result === 'win').length;
    const matchesLost = matches.filter((m) => m.result === 'loss').length;

    const coinsDistributed = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const itemsBought = transactions.filter((t) => t.type === 'shop_purchase').length;

    const recentUsers = [...users]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    return {
      totalPlayers,
      activePlayers,
      bannedPlayers,
      totalMatches,
      matchesWon,
      matchesLost,
      coinsDistributed,
      itemsBought,
      recentUsers,
    };
  }

  getAllMatches() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.MATCH_HISTORY) || '[]');
    } catch {
      return [];
    }
  }

  getAllTransactions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
    } catch {
      return [];
    }
  }

  // --- COIN TRANSACTIONS & ECONOMY ---
  recordTransaction(userId, amount, type, description, phase = null) {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
      const tx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        user_id: userId,
        amount,
        type,
        phase,
        description,
        created_at: new Date().toISOString(),
      };
      list.unshift(tx);
      if (list.length > 300) list.pop();
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
      return tx;
    } catch {
      return null;
    }
  }

  getUserTransactions(userId) {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
      return list.filter((tx) => tx.user_id === userId);
    } catch {
      return [];
    }
  }

  // --- SHOP & INVENTORY ---
  getCatalog() {
    return CATALOG_ITEMS;
  }

  buyItem(itemId) {
    const item = CATALOG_ITEMS.find((it) => it.id === itemId);
    if (!item) throw new Error('Item não encontrado.');

    const user = this.getCurrentUser();
    if (!user) throw new Error('Nenhum usuário logado.');

    this.assertUserNotBanned(user);

    if (user.inventory.includes(itemId)) {
      throw new Error('Você já possui este item!');
    }

    if (user.coins < item.price) {
      throw new Error(`Moedas insuficientes! Você tem 🪙 ${user.coins}, mas o item custa 🪙 ${item.price}.`);
    }

    const updated = this.updateCurrentUser((u) => {
      u.coins -= item.price;
      u.inventory.push(itemId);
      return u;
    });

    this.recordTransaction(user.id, -item.price, 'shop_purchase', `Compra: ${item.name}`);
    return { success: true, user: updated, item };
  }

  equipItem(itemId) {
    const item = CATALOG_ITEMS.find((it) => it.id === itemId);
    if (!item) throw new Error('Item não encontrado.');

    const user = this.getCurrentUser();
    if (!user) throw new Error('Nenhum usuário logado.');

    this.assertUserNotBanned(user);

    if (!user.inventory.includes(itemId)) {
      throw new Error('Você não possui este item para equipar.');
    }

    const updated = this.updateCurrentUser((u) => {
      if (item.category === 'rackets') {
        u.equipped.racket = itemId;
      } else if (item.category === 'balls') {
        u.equipped.ball = itemId;
      } else if (item.category === 'tables') {
        u.equipped.table = itemId;
      } else if (item.category === 'skills') {
        if (!u.equipped.skills) u.equipped.skills = [];
        if (u.equipped.skills.includes(itemId)) {
          if (u.equipped.skills.length > 1) {
            u.equipped.skills = u.equipped.skills.filter((id) => id !== itemId);
          }
        } else {
          if (u.equipped.skills.length >= 3) {
            u.equipped.skills.shift();
          }
          u.equipped.skills.push(itemId);
        }
      }
      return u;
    });

    return { success: true, user: updated, equipped: updated.equipped };
  }

  // --- GAME ATTEMPTS & ROGUELITE PROGRESSION ---
  startNewRun() {
    const user = this.getCurrentUser();
    if (!user) return null;

    this.assertUserNotBanned(user);

    const run = {
      active: true,
      phase: 1,
      score: 0,
      streak: 0,
      startTime: Date.now(),
      totalTime: 0,
    };

    const updated = this.updateCurrentUser((u) => {
      u.attempts = (u.attempts || 0) + 1;
      u.currentRun = run;
      return u;
    });

    return updated.currentRun;
  }

  // Backend validation: Rules 2 & 26 (playerScore >= 12 && difference >= 2)
  validateMatchOutcome(playerScore, opponentScore, reportedResult) {
    const isPlayerWin = playerScore >= 12 && (playerScore - opponentScore) >= 2;
    const isOpponentWin = opponentScore >= 12 && (opponentScore - playerScore) >= 2;

    if (reportedResult === 'win') {
      if (!isPlayerWin) {
        throw new Error(`Resultado inválido: A vitória exige pelo menos 12 pontos e 2 pontos de vantagem. Placar informado: ${playerScore} x ${opponentScore}`);
      }
    } else if (reportedResult === 'loss') {
      if (!isOpponentWin) {
        throw new Error(`Resultado inválido: A derrota exige que o adversário tenha pelo menos 12 pontos e 2 pontos de vantagem. Placar informado: ${playerScore} x ${opponentScore}`);
      }
    }
    return true;
  }

  // Called when player wins a phase
  recordPhaseVictory(phaseNumber, playerScore, opponentScore, matchDurationSeconds) {
    const user = this.getCurrentUser();
    if (!user) return null;

    this.assertUserNotBanned(user);

    // Validate the exact rule: points >= 12 AND diff >= 2
    this.validateMatchOutcome(playerScore, opponentScore, 'win');

    const rewardInfo = PHASE_REWARDS[phaseNumber] || { reward: 10, bonus: 0 };
    const earnedCoins = rewardInfo.reward;
    const bonusCoins = rewardInfo.bonus || 0;
    const totalAwarded = earnedCoins + bonusCoins;

    const matchPoints = playerScore * 100 + Math.max(0, 300 - matchDurationSeconds * 2);
    const newStreak = (user.currentRun?.streak || 0) + 1;
    const newTotalScore = (user.currentRun?.score || 0) + matchPoints;
    const newTotalTime = (user.currentRun?.totalTime || 0) + matchDurationSeconds;
    const nextPhase = phaseNumber + 1;

    const completedAll = phaseNumber === 15;

    const updatedUser = this.updateCurrentUser((u) => {
      u.coins = (u.coins || 0) + totalAwarded;
      u.wins = (u.wins || 0) + 1;

      if (phaseNumber > (u.highest_phase || 0)) {
        u.highest_phase = phaseNumber;
      }
      if (newTotalScore > (u.highest_score || 0)) {
        u.highest_score = newTotalScore;
      }
      if (u.best_time === 0 || newTotalTime < u.best_time) {
        if (phaseNumber >= 5) {
          u.best_time = newTotalTime;
        }
      }

      if (completedAll) {
        u.currentRun = {
          active: false,
          phase: 15,
          score: newTotalScore,
          streak: newStreak,
          completed: true,
          totalTime: newTotalTime,
        };
      } else {
        u.currentRun = {
          active: true,
          phase: nextPhase,
          score: newTotalScore,
          streak: newStreak,
          totalTime: newTotalTime,
          startTime: Date.now(),
        };
      }

      return u;
    });

    this.recordTransaction(
      user.id,
      earnedCoins,
      'phase_reward',
      `Vitória na Fase ${phaseNumber} (${playerScore} × ${opponentScore}) (+🪙${earnedCoins})`,
      phaseNumber
    );

    if (bonusCoins > 0) {
      this.recordTransaction(
        user.id,
        bonusCoins,
        'streak_bonus',
        `Bônus Sequência: ${newStreak} fases consecutivas (+🪙${bonusCoins})`,
        phaseNumber
      );
    }

    this.saveMatchResult(user.id, phaseNumber, playerScore, opponentScore, matchPoints, matchDurationSeconds, 'win');
    this.syncUserToGlobalRanking(updatedUser);

    return {
      phase: phaseNumber,
      nextPhase: completedAll ? 15 : nextPhase,
      playerScore,
      opponentScore,
      earnedCoins,
      bonusCoins,
      totalAwarded,
      newCoins: updatedUser.coins,
      currentStreak: newStreak,
      totalScore: newTotalScore,
      matchTime: matchDurationSeconds,
      completedAll,
    };
  }

  // Called when player loses a phase - Permadeath run reset!
  recordPhaseLoss(phaseNumber, playerScore, opponentScore, matchDurationSeconds) {
    const user = this.getCurrentUser();
    if (!user) return null;

    this.assertUserNotBanned(user);

    this.validateMatchOutcome(playerScore, opponentScore, 'loss');

    const streakLost = user.currentRun?.streak || 0;
    const matchPoints = playerScore * 50;
    const finalScore = (user.currentRun?.score || 0) + matchPoints;
    const totalTime = (user.currentRun?.totalTime || 0) + matchDurationSeconds;

    const updatedUser = this.updateCurrentUser((u) => {
      u.losses = (u.losses || 0) + 1;

      if (streakLost > (u.highest_phase || 0)) {
        u.highest_phase = streakLost;
      }
      if (finalScore > (u.highest_score || 0)) {
        u.highest_score = finalScore;
      }

      u.currentRun = {
        active: false,
        phase: 1,
        score: 0,
        streak: 0,
        totalTime: 0,
      };

      return u;
    });

    this.saveMatchResult(user.id, phaseNumber, playerScore, opponentScore, matchPoints, matchDurationSeconds, 'loss');
    this.syncUserToGlobalRanking(updatedUser);

    return {
      failedPhase: phaseNumber,
      playerScore,
      opponentScore,
      streakAchieved: streakLost,
      finalScore,
      totalTime,
    };
  }

  saveMatchResult(userId, phase, playerScore, opponentScore, matchScore, duration, result) {
    try {
      const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATCH_HISTORY) || '[]');
      const user = this.getUsers().find((u) => u.id === userId);
      const match = {
        id: 'res_' + Date.now(),
        user_id: userId,
        user_name: user?.name || 'Jogador',
        username: user?.username || 'player',
        phase,
        player_score: playerScore,
        opponent_score: opponentScore,
        score: matchScore,
        duration: duration,
        result,
        created_at: new Date().toISOString(),
      };
      history.unshift(match);
      if (history.length > 200) history.pop();
      localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(history));
    } catch {}
  }

  getUserMatchHistory(userId) {
    try {
      const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATCH_HISTORY) || '[]');
      return history.filter((m) => m.user_id === userId);
    } catch {
      return [];
    }
  }

  // --- RANKING SYSTEM ---
  getGlobalRanking() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(STORAGE_KEYS.GLOBAL_RANKING) || '[]');
    } catch {
      list = [...DEFAULT_GLOBAL_RANKING];
    }

    // Sort order:
    // 1. Highest Phase reached without defeat (descending)
    // 2. Highest Score (descending)
    // 3. Lowest Total Time (ascending)
    // 4. Most recent date (descending)
    list.sort((a, b) => {
      if (b.maxPhase !== a.maxPhase) return b.maxPhase - a.maxPhase;
      if (b.score !== a.score) return b.score - a.score;
      if ((a.totalTime || 9999) !== (b.totalTime || 9999)) {
        return (a.totalTime || 9999) - (b.totalTime || 9999);
      }
      return new Date(b.date) - new Date(a.date);
    });

    return list;
  }

  syncUserToGlobalRanking(user) {
    if (!user || user.highest_phase === 0) return;
    let list = this.getGlobalRanking();

    const existingIndex = list.findIndex((p) => p.id === user.id);
    const entry = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar_url,
      maxPhase: user.highest_phase,
      score: user.highest_score,
      totalTime: user.best_time || 350,
      attempts: user.attempts || 1,
      date: new Date().toISOString().split('T')[0],
      isCurrentUser: true,
    };

    if (existingIndex !== -1) {
      if (
        entry.maxPhase > list[existingIndex].maxPhase ||
        (entry.maxPhase === list[existingIndex].maxPhase && entry.score > list[existingIndex].score)
      ) {
        list[existingIndex] = entry;
      }
    } else {
      list.push(entry);
    }

    localStorage.setItem(STORAGE_KEYS.GLOBAL_RANKING, JSON.stringify(list));
  }

  getUserRankPosition(userId) {
    const list = this.getGlobalRanking();
    const index = list.findIndex((item) => item.id === userId);
    return index !== -1 ? index + 1 : list.length + 1;
  }
}

// Global storage singleton
window.storageEngine = new StorageEngine();
