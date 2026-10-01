/**
 * UI Controller, Navigation Router, Admin Panel, and Modals for Ping Pong 15 Challenge
 */

class UIManager {
  constructor() {
    this.currentView = 'inicio';
    this.currentAdminTab = 'dashboard';
    this.gameInstance = null;
    this.userFilter = 'all';
    this.userSearchTerm = '';
  }

  init() {
    this.setupNavigation();
    this.setupAuthForms();
    this.setupGameModals();
    this.setupAdminFeatures();
    this.setupSoundToggle();
    this.handleRouteFromHash();

    window.addEventListener('hashchange', () => this.handleRouteFromHash());
    this.updateUserHeader();
  }

  setupSoundToggle() {
    const btn = document.getElementById('soundToggleBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const enabled = window.soundEngine.toggleSound();
      btn.innerHTML = enabled ? '🔊 Som' : '🔇 Mudo';
      btn.classList.toggle('sound-muted', !enabled);
    });
  }

  updateUserHeader() {
    const user = window.storageEngine.getCurrentUser();
    const nameEl = document.getElementById('headerUserName');
    const avatarEl = document.getElementById('headerUserAvatar');
    const roleBadge = document.getElementById('headerUserRoleBadge');
    const coinsEl = document.getElementById('userCoinsDisplay');
    const authLinks = document.getElementById('headerAuthLinks');
    const userMenu = document.getElementById('headerUserMenu');
    const navAdmin = document.getElementById('navLinkAdmin');

    if (user) {
      if (nameEl) nameEl.textContent = user.name;
      if (avatarEl) avatarEl.src = user.avatar_url;
      if (roleBadge) {
        roleBadge.textContent = user.role;
        roleBadge.className = `user-role-badge badge-${user.role.toLowerCase()}`;
      }
      if (coinsEl) coinsEl.textContent = (user.coins || 0).toLocaleString('pt-BR');
      if (authLinks) authLinks.style.display = 'none';
      if (userMenu) userMenu.style.display = 'flex';

      // Show Admin Navigation Link if user is ADMIN
      if (navAdmin) {
        navAdmin.style.display = user.role === 'ADMIN' ? 'flex' : 'none';
      }
    } else {
      if (authLinks) authLinks.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
      if (coinsEl) coinsEl.textContent = '0';
      if (navAdmin) navAdmin.style.display = 'none';
    }
  }

  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        if (view) {
          window.location.hash = view;
          if (window.soundEngine) window.soundEngine.playClick();
        }
      });
    });

    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.storageEngine.logout();
        this.updateUserHeader();
        window.location.hash = 'login';
      });
    }

    const bannedLogoutBtn = document.getElementById('btnBannedLogout');
    if (bannedLogoutBtn) {
      bannedLogoutBtn.addEventListener('click', () => {
        window.storageEngine.logout();
        this.updateUserHeader();
        window.location.hash = 'login';
      });
    }
  }

  handleRouteFromHash() {
    let hash = window.location.hash.replace('#', '') || 'inicio';
    const user = window.storageEngine.getCurrentUser();

    // Check ban status on navigation
    if (user && (user.status === 'BANNED' || user.status === 'SUSPENDED')) {
      if (['jogo', 'loja', 'inventario'].includes(hash)) {
        hash = 'banned';
      }
    }

    // Role-based protection: /admin
    if (hash === 'admin') {
      if (!user || user.role !== 'ADMIN') {
        window.shopManager?.showToast('Acesso negado: Requer privilégios de Administrador.', 'error');
        window.location.hash = 'inicio';
        return;
      }
    }

    this.navigate(hash);
  }

  navigate(viewName) {
    this.currentView = viewName;

    // Hide all view sections
    document.querySelectorAll('.app-view').forEach((sec) => {
      sec.classList.remove('active');
    });

    // Update active navbar item
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.view === viewName);
    });

    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Refresh view data
    if (viewName === 'inicio') {
      this.renderDashboard();
    } else if (viewName === 'loja') {
      window.shopManager.renderShop();
    } else if (viewName === 'inventario') {
      window.shopManager.renderInventory();
    } else if (viewName === 'ranking') {
      this.renderRankingPage();
    } else if (viewName === 'perfil') {
      this.renderProfilePage();
    } else if (viewName === 'jogo') {
      this.initGameView();
    } else if (viewName === 'admin') {
      this.renderAdminPage();
    } else if (viewName === 'banned') {
      this.renderBannedScreen();
    }

    this.updateUserHeader();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- BANNED SCREEN ---
  renderBannedScreen() {
    const user = window.storageEngine.getCurrentUser();
    if (!user) return;
    const reasonEl = document.getElementById('bannedReasonText');
    const typeEl = document.getElementById('bannedTypeText');
    const expRow = document.getElementById('bannedExpiresRow');
    const expEl = document.getElementById('bannedExpiresText');

    if (reasonEl) reasonEl.textContent = user.ban_reason || 'Violação das diretrizes de jogo limpo.';
    if (typeEl) typeEl.textContent = user.ban_expires_at ? 'Suspensão Temporária' : 'Banimento Permanente';

    if (expRow && expEl) {
      if (user.ban_expires_at) {
        expRow.style.display = 'flex';
        expEl.textContent = new Date(user.ban_expires_at).toLocaleDateString() + ' às ' + new Date(user.ban_expires_at).toLocaleTimeString();
      } else {
        expRow.style.display = 'none';
      }
    }
  }

  // --- DASHBOARD / HOME ---
  renderDashboard() {
    const user = window.storageEngine.getCurrentUser();
    if (!user) return;

    const welcomeEl = document.getElementById('dashWelcomeName');
    const bestPhaseEl = document.getElementById('dashRecordPhase');
    const bestScoreEl = document.getElementById('dashRecordScore');
    const globalRankEl = document.getElementById('dashGlobalRank');

    if (welcomeEl) welcomeEl.textContent = user.name;
    if (bestPhaseEl) bestPhaseEl.textContent = user.highest_phase ? `Fase ${user.highest_phase}` : 'Fase 1';
    if (bestScoreEl) bestScoreEl.textContent = (user.highest_score || 0).toLocaleString('pt-BR');

    const rankPos = window.storageEngine.getUserRankPosition(user.id);
    if (globalRankEl) globalRankEl.textContent = `#${rankPos}`;

    const roadmapContainer = document.getElementById('dashRoadmapStrip');
    if (roadmapContainer) {
      roadmapContainer.innerHTML = '';
      const highest = user.highest_phase || 0;
      const current = user.currentRun?.active ? user.currentRun.phase : 1;

      for (let p = 1; p <= 15; p++) {
        const item = document.createElement('div');
        let statusClass = 'locked';
        let icon = `${p}`;

        if (p < current || p <= highest) {
          statusClass = 'completed';
          icon = `✓`;
        } else if (p === current) {
          statusClass = 'current';
          icon = `▶`;
        }

        item.className = `roadmap-mini-step ${statusClass}`;
        item.title = `Fase ${p}`;
        item.innerHTML = `<span class="step-num">${icon}</span><span class="step-label">F${p}</span>`;
        roadmapContainer.appendChild(item);
      }
    }
  }

  // --- GAME VIEW & CONTROLLER ---
  initGameView() {
    const user = window.storageEngine.getCurrentUser();
    if (user && (user.status === 'BANNED' || user.status === 'SUSPENDED')) {
      window.location.hash = 'banned';
      return;
    }

    if (!this.gameInstance) {
      this.gameInstance = new PingPongGame('pingPongCanvas');

      this.gameInstance.onScoreUpdate = (state) => this.updateInGameScoreboard(state);
      this.gameInstance.onSkillUpdate = (skills) => this.updateInGameSkillsUI(skills);
      this.gameInstance.onPhaseWin = (data) => this.handleGamePhaseWin(data);
      this.gameInstance.onPhaseLose = (data) => this.handleGamePhaseLose(data);
    }

    let phaseToPlay = 1;
    if (user?.currentRun?.active) {
      phaseToPlay = user.currentRun.phase || 1;
    } else {
      window.storageEngine.startNewRun();
      phaseToPlay = 1;
    }

    this.renderInGameHUD(phaseToPlay);
    this.gameInstance.startMatch(phaseToPlay);
  }

  renderInGameHUD(phase) {
    const user = window.storageEngine.getCurrentUser();
    const config = this.gameInstance.getPhaseConfig(phase);

    document.getElementById('hudPhaseTitle').textContent = config.title;
    document.getElementById('hudCurrentStreak').textContent = `Sequência: ${user?.currentRun?.streak || 0} vitórias`;

    const ruleTag = document.getElementById('hudMatchRuleNotice');
    if (ruleTag) {
      ruleTag.textContent = 'Mínimo 12 pontos • Vantagem de 2';
      ruleTag.className = 'hud-rule-tag';
    }

    const hotbar = document.getElementById('inGameSkillsHotbar');
    if (hotbar) {
      hotbar.innerHTML = '';
      const catalog = window.storageEngine.getCatalog();
      const equippedSkills = (user?.equipped?.skills || ['skill_speed'])
        .map((sId) => catalog.find((i) => i.id === sId))
        .filter(Boolean);

      equippedSkills.forEach((skill, index) => {
        const slot = document.createElement('button');
        slot.className = 'skill-hotbar-slot';
        slot.id = `skillSlot_${skill.id}`;
        slot.innerHTML = `
          <span class="slot-key-hint">${index + 1}</span>
          <span class="slot-icon">${skill.icon}</span>
          <span class="slot-label">${skill.name}</span>
          <div class="slot-cooldown-overlay" id="cdOverlay_${skill.id}"></div>
        `;
        slot.addEventListener('click', () => {
          this.gameInstance.activateSkill(skill.id);
        });
        hotbar.appendChild(slot);
      });
    }

    const touchUp = document.getElementById('touchBtnPaddleUp');
    const touchDown = document.getElementById('touchBtnPaddleDown');
    if (touchUp && touchDown) {
      touchUp.onpointerdown = () => {
        this.gameInstance.keys.ArrowUp = true;
        this.gameInstance.useMouse = false;
      };
      touchUp.onpointerup = () => (this.gameInstance.keys.ArrowUp = false);
      touchDown.onpointerdown = () => {
        this.gameInstance.keys.ArrowDown = true;
        this.gameInstance.useMouse = false;
      };
      touchDown.onpointerup = () => (this.gameInstance.keys.ArrowDown = false);
    }
  }

  updateInGameScoreboard({ playerScore, aiScore, isDeuce, playerAdvantage, aiAdvantage }) {
    const pScoreEl = document.getElementById('hudPlayerScore');
    const aiScoreEl = document.getElementById('hudAiScore');
    const ruleTag = document.getElementById('hudMatchRuleNotice');

    if (pScoreEl) pScoreEl.textContent = playerScore;
    if (aiScoreEl) aiScoreEl.textContent = aiScore;

    if (ruleTag) {
      if (isDeuce) {
        ruleTag.textContent = `EMPATE (${playerScore} × ${aiScore}) • DEUCE: PRECISA DE 2 PONTOS SEGUIDOS!`;
        ruleTag.className = 'hud-rule-tag tag-deuce';
      } else if (playerAdvantage) {
        ruleTag.textContent = `VANTAGEM SUA (+1) • FALTA 1 PONTO PARA A VITÓRIA!`;
        ruleTag.className = 'hud-rule-tag tag-advantage-player';
      } else if (aiAdvantage) {
        ruleTag.textContent = `VANTAGEM DO ADVERSÁRIO (+1) • DEFENDA O PONTO!`;
        ruleTag.className = 'hud-rule-tag tag-advantage-ai';
      } else {
        ruleTag.textContent = 'Mínimo 12 pontos • Vantagem de 2';
        ruleTag.className = 'hud-rule-tag';
      }
    }
  }

  updateInGameSkillsUI(skills) {
    Object.keys(skills).forEach((skillId) => {
      const s = skills[skillId];
      const slot = document.getElementById(`skillSlot_${skillId}`);
      const overlay = document.getElementById(`cdOverlay_${skillId}`);
      if (!slot) return;

      if (s.cooldownRemaining > 0) {
        slot.classList.add('on-cooldown');
        if (overlay) {
          const pct = (s.cooldownRemaining / s.cooldownMax) * 100;
          overlay.style.height = `${pct}%`;
          overlay.textContent = `${Math.ceil(s.cooldownRemaining)}s`;
        }
      } else {
        slot.classList.remove('on-cooldown');
        if (overlay) {
          overlay.style.height = '0%';
          overlay.textContent = '';
        }
      }

      if (s.active) {
        slot.classList.add('skill-active');
      } else {
        slot.classList.remove('skill-active');
      }
    });
  }

  // --- VICTORY & DEFEAT HANDLERS (RULES 2, 7, 8, 24, 26) ---
  handleGamePhaseWin({ phase, playerScore, opponentScore, duration }) {
    try {
      const victoryData = window.storageEngine.recordPhaseVictory(phase, playerScore, opponentScore, duration);
      if (!victoryData) return;

      this.updateUserHeader();

      const modal = document.getElementById('victoryModal');
      if (!modal) return;

      document.getElementById('vicPhaseDone').textContent = `Fase ${phase} Concluída!`;
      document.getElementById('vicMatchScore').textContent = `${playerScore} × ${opponentScore}`;
      document.getElementById('vicDuration').textContent = `${duration}s`;
      document.getElementById('vicStreak').textContent = `${victoryData.currentStreak} fases`;
      document.getElementById('vicNextPhase').textContent = victoryData.completedAll
        ? '🏆 TODAS AS FASES CONCLUÍDAS!'
        : `Fase ${victoryData.nextPhase}`;

      document.getElementById('vicRewardCoins').textContent = `+🪙 ${victoryData.earnedCoins}`;
      const bonusEl = document.getElementById('vicBonusCoins');
      if (victoryData.bonusCoins > 0) {
        bonusEl.style.display = 'block';
        bonusEl.textContent = `🎉 BÔNUS SEQUÊNCIA: +🪙 ${victoryData.bonusCoins}!`;
      } else {
        bonusEl.style.display = 'none';
      }

      document.getElementById('vicTotalCoins').textContent = `🪙 ${victoryData.newCoins.toLocaleString('pt-BR')}`;

      // Rule 24: Phase 15 Final Challenge Victory Special Celebration
      const eliteBanner = document.getElementById('vicEliteBanner');
      if (victoryData.completedAll) {
        if (eliteBanner) {
          eliteBanner.style.display = 'block';
          eliteBanner.innerHTML = `
            <div class="elite-achievement-box">
              <h2>🏆🏆🏆 DESAFIO COMPLETADO!</h2>
              <p><strong>15 / 15 FASES</strong></p>
              <p class="elite-sub">VOCÊ VENCEU O DESAFIO FINAL E ENTROU PARA A HISTÓRIA!</p>
              <div class="elite-stats-sum">
                <span>Pontuação Final: ${victoryData.totalScore.toLocaleString('pt-BR')} pts</span>
                <span>Tempo Total: ${victoryData.matchTime}s</span>
              </div>
            </div>
          `;
        }
        document.getElementById('vicTitleText').textContent = '🏆 VITÓRIA SUPREMA!';
        const btnNext = document.getElementById('btnNextPhase');
        btnNext.textContent = 'VER MEU RANKING';
        btnNext.onclick = () => {
          modal.classList.remove('active');
          window.location.hash = 'ranking';
        };
      } else {
        if (eliteBanner) eliteBanner.style.display = 'none';
        document.getElementById('vicTitleText').textContent = 'FASE CONCLUÍDA!';
        const btnNext = document.getElementById('btnNextPhase');
        btnNext.textContent = 'PRÓXIMA FASE ➔';
        btnNext.onclick = () => {
          modal.classList.remove('active');
          const nextPhase = victoryData.nextPhase;
          this.renderInGameHUD(nextPhase);
          this.gameInstance.startMatch(nextPhase);
        };
      }

      modal.classList.add('active');
    } catch (err) {
      window.shopManager?.showToast(err.message, 'error');
    }
  }

  handleGamePhaseLose({ phase, playerScore, opponentScore, duration }) {
    try {
      const lossData = window.storageEngine.recordPhaseLoss(phase, playerScore, opponentScore, duration);
      this.updateUserHeader();

      const modal = document.getElementById('defeatModal');
      if (!modal) return;

      document.getElementById('defPhaseFailed').textContent = `Eliminado na Fase ${phase}`;
      document.getElementById('defMatchScore').textContent = `${playerScore} × ${opponentScore}`;
      document.getElementById('defStreak').textContent = `${lossData?.streakAchieved || 0} fases`;

      modal.classList.add('active');
    } catch (err) {
      window.shopManager?.showToast(err.message, 'error');
    }
  }

  setupGameModals() {
    const retryBtn = document.getElementById('btnRetryChallenge');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        const modal = document.getElementById('defeatModal');
        if (modal) modal.classList.remove('active');

        window.storageEngine.startNewRun();
        this.renderInGameHUD(1);
        this.gameInstance.startMatch(1);
      });
    }

    const pauseBtn = document.getElementById('btnInGamePause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (this.gameInstance) this.gameInstance.togglePause();
      });
    }

    const leaveBtn = document.getElementById('btnInGameLeave');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        if (confirm('Deseja sair da partida? Sua tentativa atual será interrompida.')) {
          if (this.gameInstance) {
            this.gameInstance.isRunning = false;
          }
          window.location.hash = 'inicio';
        }
      });
    }
  }

  // --- RANKING PAGE RENDERING ---
  renderRankingPage() {
    const list = window.storageEngine.getGlobalRanking();
    const user = window.storageEngine.getCurrentUser();

    // Podium (Top 3)
    const podiumContainer = document.getElementById('rankingPodium');
    if (podiumContainer) {
      podiumContainer.innerHTML = '';
      const top3 = list.slice(0, 3);
      const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

      podiumOrder.forEach((player) => {
        if (!player) return;
        const realRank = list.findIndex((p) => p.id === player.id) + 1;
        const rankClass = realRank === 1 ? 'rank-gold' : realRank === 2 ? 'rank-silver' : 'rank-bronze';
        const medalIcon = realRank === 1 ? '🥇' : realRank === 2 ? '🥈' : '🥉';

        const card = document.createElement('div');
        card.className = `podium-card ${rankClass}`;
        card.innerHTML = `
          <div class="podium-medal">${medalIcon}</div>
          <img src="${player.avatar}" alt="${player.name}" class="podium-avatar">
          <div class="podium-name">${player.name}</div>
          <div class="podium-username">@${player.username}</div>
          <div class="podium-phase">Fase Máxima: <strong>${player.maxPhase}/15</strong></div>
          <div class="podium-score">🪙 ${player.score.toLocaleString('pt-BR')} pts</div>
          <div class="podium-meta"><small>⏱️ ${player.totalTime}s • 🎯 ${player.attempts} tentativas</small></div>
        `;
        podiumContainer.appendChild(card);
      });
    }

    // Ranking Table
    const tableBody = document.getElementById('rankingTableBody');
    if (tableBody) {
      tableBody.innerHTML = '';

      list.forEach((player, idx) => {
        const rank = idx + 1;
        const isSelf = user && player.id === user.id;

        const row = document.createElement('tr');
        row.className = `${isSelf ? 'user-highlight-row' : ''} ${rank <= 3 ? 'top-3-row' : ''}`;
        row.innerHTML = `
          <td class="col-rank">#${rank}</td>
          <td class="col-player">
            <div class="player-cell">
              <img src="${player.avatar}" class="table-avatar" alt="Avatar">
              <div>
                <span class="player-name">${player.name} ${isSelf ? '<strong>(Você)</strong>' : ''}</span>
                <span class="player-user">@${player.username}</span>
              </div>
            </div>
          </td>
          <td class="col-phase"><span class="badge-phase">Fase ${player.maxPhase}</span></td>
          <td class="col-score"><strong>${player.score.toLocaleString('pt-BR')}</strong></td>
          <td class="col-time">${player.totalTime}s</td>
          <td class="col-attempts">${player.attempts}</td>
          <td class="col-date">${player.date}</td>
        `;
        tableBody.appendChild(row);
      });
    }
  }

  // --- PROFILE PAGE RENDERING ---
  renderProfilePage() {
    const user = window.storageEngine.getCurrentUser();
    if (!user) {
      window.location.hash = 'login';
      return;
    }

    document.getElementById('profileAvatar').src = user.avatar_url;
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileUsername').textContent = `@${user.username}`;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileCoins').textContent = (user.coins || 0).toLocaleString('pt-BR');

    const roleBadge = document.getElementById('profileRoleBadge');
    if (roleBadge) {
      roleBadge.textContent = user.role;
      roleBadge.className = `user-role-badge badge-${user.role.toLowerCase()}`;
    }

    const rankPos = window.storageEngine.getUserRankPosition(user.id);
    document.getElementById('profileRank').textContent = `#${rankPos}`;

    document.getElementById('profileHighestPhase').textContent = `Fase ${user.highest_phase || 0}`;
    document.getElementById('profileHighestScore').textContent = (user.highest_score || 0).toLocaleString('pt-BR');
    document.getElementById('profileWins').textContent = user.wins || 0;
    document.getElementById('profileLosses').textContent = user.losses || 0;
    document.getElementById('profileAttempts').textContent = user.attempts || 0;
    document.getElementById('profileBestTime').textContent = user.best_time ? `${user.best_time}s` : '--';

    const winrate =
      user.wins + user.losses > 0 ? Math.round((user.wins / (user.wins + user.losses)) * 100) : 0;
    document.getElementById('profileWinrate').textContent = `${winrate}%`;

    const roadmapContainer = document.getElementById('profileRoadmapList');
    if (roadmapContainer) {
      roadmapContainer.innerHTML = '';
      const highest = user.highest_phase || 0;
      const current = user.currentRun?.active ? user.currentRun.phase : 1;

      for (let p = 1; p <= 15; p++) {
        const node = document.createElement('div');
        let status = 'locked';
        let badgeText = 'Bloqueada';

        if (p < current || p <= highest) {
          status = 'completed';
          badgeText = 'Concluída ✓';
        } else if (p === current) {
          status = 'current';
          badgeText = 'Fase Atual';
        }

        node.className = `phase-node ${status}`;
        node.innerHTML = `
          <div class="phase-node-circle">${status === 'completed' ? '✓' : p}</div>
          <div class="phase-node-info">
            <span class="phase-node-title">Fase ${p}</span>
            <span class="phase-node-badge">${badgeText}</span>
          </div>
        `;
        roadmapContainer.appendChild(node);
      }
    }

    // Match History
    const historyTableBody = document.getElementById('profileHistoryBody');
    if (historyTableBody) {
      const history = window.storageEngine.getUserMatchHistory(user.id);
      historyTableBody.innerHTML = '';

      if (history.length === 0) {
        historyTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhuma partida registrada ainda.</td></tr>`;
      } else {
        history.slice(0, 10).forEach((m) => {
          const tr = document.createElement('tr');
          const isWin = m.result === 'win';
          const scoreDisplay = m.player_score !== undefined ? `${m.player_score} × ${m.opponent_score}` : '--';
          tr.innerHTML = `
            <td>Fase ${m.phase}</td>
            <td><strong>${scoreDisplay}</strong></td>
            <td><span class="badge-result ${isWin ? 'res-win' : 'res-loss'}">${isWin ? 'VITÓRIA' : 'DERROTA'}</span></td>
            <td>${m.score} pts</td>
            <td>${m.duration}s</td>
            <td>${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          `;
          historyTableBody.appendChild(tr);
        });
      }
    }

    // Transactions Log
    const txTableBody = document.getElementById('profileTransactionsBody');
    if (txTableBody) {
      const txs = window.storageEngine.getUserTransactions(user.id);
      txTableBody.innerHTML = '';

      if (txs.length === 0) {
        txTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">Nenhuma transação de moedas.</td></tr>`;
      } else {
        txs.slice(0, 10).forEach((t) => {
          const tr = document.createElement('tr');
          const isPositive = t.amount > 0;
          tr.innerHTML = `
            <td>${new Date(t.created_at).toLocaleDateString()} ${new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${t.description}</td>
            <td class="${isPositive ? 'tx-plus' : 'tx-minus'}"><strong>${isPositive ? '+' : ''}${t.amount} 🪙</strong></td>
            <td><small>${t.type}</small></td>
          `;
          txTableBody.appendChild(tr);
        });
      }
    }
  }

  // ==========================================================================
  // ADMIN PANEL LOGIC (RULES 27 TO 45)
  // ==========================================================================
  setupAdminFeatures() {
    // Admin tab switching
    document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const tab = e.currentTarget.dataset.tab;
        this.currentAdminTab = tab;

        document.querySelectorAll('.admin-subview').forEach((v) => v.classList.remove('active'));
        const targetView = document.getElementById(`adminTab-${tab}`);
        if (targetView) targetView.classList.add('active');

        this.renderAdminSubTab(tab);
        if (window.soundEngine) window.soundEngine.playClick();
      });
    });

    // Admin Users Search Input
    const searchInput = document.getElementById('admUserSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.userSearchTerm = e.target.value.toLowerCase().trim();
        this.renderAdminUsersTable();
      });
    }

    // Admin Users Filter Buttons
    document.querySelectorAll('.adm-filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.adm-filter-btn').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.userFilter = e.currentTarget.dataset.filter;
        this.renderAdminUsersTable();
      });
    });

    // Ban Form Submit
    const banForm = document.getElementById('formBanUser');
    if (banForm) {
      banForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleBanSubmit();
      });
    }

    // Ban Type Radio toggling (temporary vs permanent)
    document.querySelectorAll('input[name="banType"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const expiresGroup = document.getElementById('banExpiresGroup');
        if (expiresGroup) {
          expiresGroup.style.display = e.target.value === 'temporary' ? 'block' : 'none';
        }
      });
    });

    // Ban Cancel button & close
    const banClose = document.getElementById('modalBanClose');
    const banCancel = document.getElementById('btnCancelBan');
    if (banClose) banClose.onclick = () => this.closeModal('modalBanUser');
    if (banCancel) banCancel.onclick = () => this.closeModal('modalBanUser');

    // Unban Form Submit
    const unbanForm = document.getElementById('formUnbanUser');
    if (unbanForm) {
      unbanForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUnbanSubmit();
      });
    }

    const unbanClose = document.getElementById('modalUnbanClose');
    const unbanCancel = document.getElementById('btnCancelUnban');
    if (unbanClose) unbanClose.onclick = () => this.closeModal('modalUnbanUser');
    if (unbanCancel) unbanCancel.onclick = () => this.closeModal('modalUnbanUser');

    // User Details Close
    const detailsClose = document.getElementById('modalDetailsClose');
    if (detailsClose) detailsClose.onclick = () => this.closeModal('modalUserDetails');
  }

  renderAdminPage() {
    this.renderAdminDashboardMetrics();
    this.renderAdminSubTab(this.currentAdminTab);
  }

  renderAdminSubTab(tab) {
    if (tab === 'dashboard') this.renderAdminDashboardMetrics();
    else if (tab === 'users') this.renderAdminUsersTable();
    else if (tab === 'banned') this.renderAdminBannedTable();
    else if (tab === 'matches') this.renderAdminMatchesTable();
    else if (tab === 'coins') this.renderAdminCoinsTable();
    else if (tab === 'items') this.renderAdminItemsTable();
    else if (tab === 'ranking') this.renderAdminRankingTable();
    else if (tab === 'logs') this.renderAdminLogsTable();
  }

  renderAdminDashboardMetrics() {
    const metrics = window.storageEngine.getAdminDashboardMetrics();

    document.getElementById('admTotalPlayers').textContent = metrics.totalPlayers;
    document.getElementById('admActivePlayers').textContent = metrics.activePlayers;
    document.getElementById('admBannedPlayers').textContent = metrics.bannedPlayers;
    document.getElementById('admTotalMatches').textContent = metrics.totalMatches;
    document.getElementById('admMatchesWon').textContent = metrics.matchesWon;
    document.getElementById('admMatchesLost').textContent = metrics.matchesLost;
    document.getElementById('admCoinsCirculation').textContent = `🪙 ${metrics.coinsDistributed.toLocaleString('pt-BR')}`;
    document.getElementById('admItemsBought').textContent = metrics.itemsBought;

    const recentBody = document.getElementById('admRecentUsersBody');
    if (recentBody) {
      recentBody.innerHTML = '';
      metrics.recentUsers.forEach((u) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${u.name}</strong> (@${u.username})</td>
          <td>${u.email}</td>
          <td><span class="user-role-badge badge-${u.role.toLowerCase()}">${u.role}</span></td>
          <td><span class="status-pill status-${u.status.toLowerCase()}">${u.status}</span></td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
        `;
        recentBody.appendChild(tr);
      });
    }
  }

  renderAdminUsersTable() {
    const users = window.storageEngine.getUsers();
    const currentUser = window.storageEngine.getCurrentUser();
    const tbody = document.getElementById('admUsersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const filtered = users.filter((u) => {
      // Filter by role or status
      if (this.userFilter === 'ACTIVE' && u.status !== 'ACTIVE') return false;
      if (this.userFilter === 'BANNED' && u.status !== 'BANNED' && u.status !== 'SUSPENDED') return false;
      if (this.userFilter === 'ADMIN' && u.role !== 'ADMIN') return false;

      // Filter by search term
      if (this.userSearchTerm) {
        const match =
          u.name.toLowerCase().includes(this.userSearchTerm) ||
          u.username.toLowerCase().includes(this.userSearchTerm) ||
          u.email.toLowerCase().includes(this.userSearchTerm) ||
          u.id.toLowerCase().includes(this.userSearchTerm);
        if (!match) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Nenhum usuário encontrado com os filtros atuais.</td></tr>`;
      return;
    }

    filtered.forEach((u) => {
      const isSelf = currentUser && currentUser.id === u.id;
      const isBanned = u.status === 'BANNED' || u.status === 'SUSPENDED';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="player-cell">
            <img src="${u.avatar_url}" class="table-avatar" alt="Avatar">
            <div>
              <span class="player-name">${u.name} ${isSelf ? '<strong>(Você)</strong>' : ''}</span>
              <span class="player-user">@${u.username} • ID: ${u.id.slice(-6)}</span>
            </div>
          </div>
        </td>
        <td>${u.email}</td>
        <td><span class="user-role-badge badge-${u.role.toLowerCase()}">${u.role}</span></td>
        <td><span class="badge-phase">Fase ${u.highest_phase || 0}</span></td>
        <td>🪙 ${(u.coins || 0).toLocaleString('pt-BR')}</td>
        <td><span class="status-pill status-${u.status.toLowerCase()}">${u.status}</span></td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
        <td class="col-actions">
          <button class="btn-adm-action btn-adm-view" data-id="${u.id}">VER</button>
          ${
            isSelf
              ? ''
              : isBanned
              ? `<button class="btn-adm-action btn-adm-unban" data-id="${u.id}">DESBANIR</button>`
              : `<button class="btn-adm-action btn-adm-ban" data-id="${u.id}">BANIR</button>`
          }
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach actions
    tbody.querySelectorAll('.btn-adm-view').forEach((b) => {
      b.onclick = (e) => this.openUserDetailsModal(e.currentTarget.dataset.id);
    });
    tbody.querySelectorAll('.btn-adm-ban').forEach((b) => {
      b.onclick = (e) => this.openBanModal(e.currentTarget.dataset.id);
    });
    tbody.querySelectorAll('.btn-adm-unban').forEach((b) => {
      b.onclick = (e) => this.openUnbanModal(e.currentTarget.dataset.id);
    });
  }

  renderAdminBannedTable() {
    const users = window.storageEngine.getUsers();
    const banned = users.filter((u) => u.status === 'BANNED' || u.status === 'SUSPENDED');
    const tbody = document.getElementById('admBannedTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (banned.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhuma conta banida no momento.</td></tr>`;
      return;
    }

    banned.forEach((u) => {
      const tr = document.createElement('tr');
      const isPermanent = !u.ban_expires_at;
      tr.innerHTML = `
        <td><strong>${u.name}</strong> (@${u.username})</td>
        <td><span class="status-pill status-${u.status.toLowerCase()}">${isPermanent ? 'PERMANENTE' : 'TEMPORÁRIO'}</span></td>
        <td class="col-reason">${u.ban_reason || 'Nenhum motivo registrado.'}</td>
        <td>${u.banned_at ? new Date(u.banned_at).toLocaleString() : '--'}</td>
        <td>${u.ban_expires_at ? new Date(u.ban_expires_at).toLocaleDateString() : 'Indeterminado'}</td>
        <td><button class="btn-adm-action btn-adm-unban" data-id="${u.id}">DESBANIR</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-adm-unban').forEach((b) => {
      b.onclick = (e) => this.openUnbanModal(e.currentTarget.dataset.id);
    });
  }

  renderAdminMatchesTable() {
    const matches = window.storageEngine.getAllMatches();
    const tbody = document.getElementById('admMatchesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (matches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Nenhuma partida registrada até o momento.</td></tr>`;
      return;
    }

    matches.slice(0, 30).forEach((m) => {
      const isWin = m.result === 'win';
      const scoreDisplay = m.player_score !== undefined ? `${m.player_score} × ${m.opponent_score}` : '--';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${m.user_name || 'Jogador'}</strong> (@${m.username || 'user'})</td>
        <td>Fase ${m.phase}</td>
        <td><strong>${scoreDisplay}</strong></td>
        <td><span class="badge-result ${isWin ? 'res-win' : 'res-loss'}">${isWin ? 'VITÓRIA' : 'DERROTA'}</span></td>
        <td>${m.score} pts</td>
        <td>${m.duration}s</td>
        <td>${new Date(m.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderAdminCoinsTable() {
    const txs = window.storageEngine.getAllTransactions();
    const tbody = document.getElementById('admCoinsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhuma transação no histórico.</td></tr>`;
      return;
    }

    txs.slice(0, 40).forEach((t) => {
      const isPos = t.amount > 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><small>${t.user_id}</small></td>
        <td>${t.description}</td>
        <td class="${isPos ? 'tx-plus' : 'tx-minus'}"><strong>${isPos ? '+' : ''}${t.amount} 🪙</strong></td>
        <td><span class="tx-tag">${t.type}</span></td>
        <td>${t.phase ? `Fase ${t.phase}` : '--'}</td>
        <td>${new Date(t.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderAdminItemsTable() {
    const catalog = window.storageEngine.getCatalog();
    const tbody = document.getElementById('admItemsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    catalog.forEach((it) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${it.name}</strong></td>
        <td>${window.shopManager.getCategoryLabel(it.category)}</td>
        <td><span class="rarity-badge badge-rarity-${it.rarity.toLowerCase()}">${it.rarity}</span></td>
        <td>🪙 ${it.price === 0 ? 'Grátis' : it.price}</td>
        <td><small>${it.effect}</small></td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderAdminRankingTable() {
    const ranking = window.storageEngine.getGlobalRanking();
    const tbody = document.getElementById('admRankingTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    ranking.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${idx + 1}</strong></td>
        <td>${p.name} (@${p.username})</td>
        <td><span class="badge-phase">Fase ${p.maxPhase}</span></td>
        <td><strong>${p.score.toLocaleString('pt-BR')}</strong></td>
        <td>${p.totalTime}s</td>
        <td>${p.attempts}</td>
        <td>${p.date}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderAdminLogsTable() {
    const logs = window.storageEngine.getModerationLogs();
    const tbody = document.getElementById('admLogsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhum log de moderação registrado.</td></tr>`;
      return;
    }

    logs.forEach((l) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(l.created_at).toLocaleString()}</td>
        <td><strong>${l.admin_name}</strong></td>
        <td><span class="mod-action-badge mod-${l.action.toLowerCase()}">${l.action}</span></td>
        <td>${l.target_username ? `@${l.target_username}` : l.target_user_id}</td>
        <td class="col-reason">${l.reason}</td>
        <td><small>${JSON.stringify(l.metadata || {})}</small></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // --- BAN & UNBAN MODALS ---
  openBanModal(targetUserId) {
    const currentUser = window.storageEngine.getCurrentUser();
    if (currentUser?.id === targetUserId) {
      window.shopManager?.showToast('Você não pode banir sua própria conta.', 'error');
      return;
    }

    const target = window.storageEngine.getUsers().find((u) => u.id === targetUserId);
    if (!target) return;

    document.getElementById('banTargetUserId').value = target.id;
    document.getElementById('banTargetUserDisplay').value = `${target.name} (@${target.username})`;
    document.getElementById('banReasonInput').value = '';

    // Set default date to 7 days from now
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    document.getElementById('banExpiresInput').value = nextWeek;

    this.openModal('modalBanUser');
  }

  handleBanSubmit() {
    const adminUser = window.storageEngine.getCurrentUser();
    const targetUserId = document.getElementById('banTargetUserId').value;
    const reason = document.getElementById('banReasonInput').value;
    const isPermanent = document.querySelector('input[name="banType"]:checked').value === 'permanent';
    const expiresDate = document.getElementById('banExpiresInput').value;

    try {
      window.storageEngine.banUser({
        adminUserId: adminUser.id,
        targetUserId,
        reason,
        isPermanent,
        expiresAt: isPermanent ? null : new Date(expiresDate + 'T23:59:59').toISOString(),
      });

      this.closeModal('modalBanUser');
      window.shopManager?.showToast('Usuário banido com sucesso!', 'success');
      this.renderAdminUsersTable();
      this.renderAdminBannedTable();
      this.renderAdminDashboardMetrics();
    } catch (err) {
      window.shopManager?.showToast(err.message, 'error');
    }
  }

  openUnbanModal(targetUserId) {
    const target = window.storageEngine.getUsers().find((u) => u.id === targetUserId);
    if (!target) return;

    document.getElementById('unbanTargetUserId').value = target.id;
    document.getElementById('unbanTargetUserDisplay').value = `${target.name} (@${target.username})`;
    document.getElementById('unbanReasonInput').value = '';

    this.openModal('modalUnbanUser');
  }

  handleUnbanSubmit() {
    const adminUser = window.storageEngine.getCurrentUser();
    const targetUserId = document.getElementById('unbanTargetUserId').value;
    const reason = document.getElementById('unbanReasonInput').value;

    try {
      window.storageEngine.unbanUser({
        adminUserId: adminUser.id,
        targetUserId,
        reason,
      });

      this.closeModal('modalUnbanUser');
      window.shopManager?.showToast('Usuário desbanido com sucesso!', 'success');
      this.renderAdminUsersTable();
      this.renderAdminBannedTable();
      this.renderAdminDashboardMetrics();
    } catch (err) {
      window.shopManager?.showToast(err.message, 'error');
    }
  }

  openUserDetailsModal(userId) {
    const target = window.storageEngine.getUsers().find((u) => u.id === userId);
    if (!target) return;

    const content = document.getElementById('userDetailsContent');
    const isBanned = target.status === 'BANNED' || target.status === 'SUSPENDED';

    content.innerHTML = `
      <div class="user-details-header">
        <img src="${target.avatar_url}" class="details-avatar" alt="Avatar">
        <div>
          <h3>${target.name}</h3>
          <span class="user-user">@${target.username}</span>
          <div style="margin-top: 4px;">
            <span class="user-role-badge badge-${target.role.toLowerCase()}">${target.role}</span>
            <span class="status-pill status-${target.status.toLowerCase()}">${target.status}</span>
          </div>
        </div>
      </div>

      <div class="user-details-grid">
        <div><strong>ID do Sistema:</strong> ${target.id}</div>
        <div><strong>E-mail:</strong> ${target.email}</div>
        <div><strong>Saldo de Moedas:</strong> 🪙 ${(target.coins || 0).toLocaleString('pt-BR')}</div>
        <div><strong>Maior Fase:</strong> Fase ${target.highest_phase || 0}</div>
        <div><strong>Maior Pontuação:</strong> ${(target.highest_score || 0).toLocaleString('pt-BR')} pts</div>
        <div><strong>Melhor Tempo:</strong> ${target.best_time ? target.best_time + 's' : '--'}</div>
        <div><strong>Vitórias:</strong> ${target.wins || 0}</div>
        <div><strong>Derrotas:</strong> ${target.losses || 0}</div>
        <div><strong>Tentativas:</strong> ${target.attempts || 0}</div>
        <div><strong>Cadastro em:</strong> ${new Date(target.created_at).toLocaleString()}</div>
      </div>

      ${
        isBanned
          ? `<div class="details-ban-box">
              <h4>⚠️ Informações de Suspensão</h4>
              <p><strong>Motivo:</strong> ${target.ban_reason || 'Não informado'}</p>
              <p><strong>Data do Bloqueio:</strong> ${target.banned_at ? new Date(target.banned_at).toLocaleString() : '--'}</p>
              <p><strong>Expiração:</strong> ${target.ban_expires_at ? new Date(target.ban_expires_at).toLocaleString() : 'Permanente'}</p>
             </div>`
          : ''
      }

      <div class="details-items-box">
        <h4>Itens Desbloqueados (${target.inventory.length})</h4>
        <div class="details-tags">
          ${target.inventory.map((id) => `<span class="slot-badge">${id}</span>`).join(' ')}
        </div>
      </div>
    `;

    this.openModal('modalUserDetails');
  }

  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('active');
  }

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  }

  // --- AUTH FORMS ---
  setupAuthForms() {
    const loginForm = document.getElementById('formLogin');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const pass = document.getElementById('loginPass').value;
        const errorEl = document.getElementById('loginError');

        try {
          window.storageEngine.loginUser(email, pass);
          if (errorEl) errorEl.textContent = '';
          this.updateUserHeader();
          window.location.hash = 'inicio';
        } catch (err) {
          if (errorEl) errorEl.textContent = err.message;
        }
      });
    }

    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    if (btnGoogleLogin) {
      btnGoogleLogin.addEventListener('click', () => {
        try {
          window.storageEngine.loginWithGoogle('Jogador Google', 'google.challenger@gmail.com');
          this.updateUserHeader();
          window.location.hash = 'inicio';
        } catch (err) {
          window.shopManager?.showToast(err.message, 'error');
        }
      });
    }

    const registerForm = document.getElementById('formRegister');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const pass = document.getElementById('regPass').value;
        const confirmPass = document.getElementById('regPassConfirm').value;
        const errorEl = document.getElementById('registerError');

        if (pass !== confirmPass) {
          if (errorEl) errorEl.textContent = 'As senhas não coincidem!';
          return;
        }

        try {
          window.storageEngine.registerUser({ name, username, email, password: pass });
          if (errorEl) errorEl.textContent = '';
          this.updateUserHeader();
          window.location.hash = 'inicio';
        } catch (err) {
          if (errorEl) errorEl.textContent = err.message;
        }
      });
    }

    const dailyBtn = document.getElementById('btnClaimDaily');
    if (dailyBtn) {
      dailyBtn.addEventListener('click', () => {
        const user = window.storageEngine.getCurrentUser();
        if (!user) return;
        window.storageEngine.updateCurrentUser((u) => {
          u.coins = (u.coins || 0) + 100;
          return u;
        });
        window.storageEngine.recordTransaction(user.id, 100, 'daily_reward', '🎁 Recompensa Diária Coletada');
        if (window.soundEngine) window.soundEngine.playCoin();
        window.shopManager.showToast('🎁 +100 moedas coletadas com sucesso!', 'success');
        this.updateUserHeader();
        dailyBtn.disabled = true;
        dailyBtn.textContent = 'COLETADO HOJE ✓';
      });
    }
  }
}

// Global UIManager instance
window.uiManager = new UIManager();
