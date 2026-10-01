/**
 * Shop & Inventory Manager for Ping Pong 15 Challenge
 * Handles catalog browsing, interactive item preview modal with live Canvas rendering,
 * purchase transactions, and inventory equipment slots.
 */

class ShopManager {
  constructor() {
    this.currentCategory = 'rackets';
    this.previewItem = null;
    this.previewAnimationId = null;
    this.previewCanvas = null;
    this.previewCtx = null;
    this.previewBall = { x: 50, y: 75, vx: 3.5, vy: 1.8, radius: 7, trail: [] };
    this.previewPaddle = { x: 260, y: 40, w: 12, h: 70, targetY: 40 };
    this.previewParticles = [];
  }

  init() {
    this.renderShop();
    this.renderInventory();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Category tabs
    document.querySelectorAll('.shop-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.shop-tab-btn').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentCategory = e.currentTarget.dataset.category;
        this.renderShop();
        if (window.soundEngine) window.soundEngine.playClick();
      });
    });

    // Preview modal close
    const closeBtn = document.getElementById('previewModalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closePreviewModal());
    }

    const modalBackdrop = document.getElementById('previewModal');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) this.closePreviewModal();
      });
    }
  }

  // --- SHOP UI RENDERING ---
  renderShop() {
    const container = document.getElementById('shopItemsGrid');
    if (!container) return;

    const catalog = window.storageEngine.getCatalog();
    const items = catalog.filter((it) => it.category === this.currentCategory);
    const user = window.storageEngine.getCurrentUser();

    container.innerHTML = '';

    items.forEach((item) => {
      const isOwned = user ? user.inventory.includes(item.id) : false;
      let isEquipped = false;

      if (user && user.equipped) {
        if (item.category === 'rackets') isEquipped = user.equipped.racket === item.id;
        else if (item.category === 'balls') isEquipped = user.equipped.ball === item.id;
        else if (item.category === 'tables') isEquipped = user.equipped.table === item.id;
        else if (item.category === 'skills') isEquipped = (user.equipped.skills || []).includes(item.id);
      }

      const card = document.createElement('div');
      card.className = `shop-item-card rarity-${item.rarity.toLowerCase()} ${isEquipped ? 'is-equipped' : ''}`;

      // Card Header & Badge
      const rarityClass = `badge-rarity-${item.rarity.toLowerCase()}`;

      // Card Visual Icon/Preview Thumbnail
      let iconHtml = '';
      if (item.category === 'rackets') {
        iconHtml = `<div class="card-art-preview" style="background: radial-gradient(circle, ${item.glow || 'rgba(0,242,254,0.3)'} 0%, transparent 70%);">
          <div class="racket-thumb" style="border-color:${item.color}; box-shadow: 0 0 16px ${item.glow}">
            <div class="racket-inner" style="background:${item.accent || '#fff'}"></div>
          </div>
        </div>`;
      } else if (item.category === 'balls') {
        iconHtml = `<div class="card-art-preview">
          <div class="ball-thumb trail-${item.trailType}" style="background:${item.color}; box-shadow: 0 0 18px ${item.color}"></div>
        </div>`;
      } else if (item.category === 'tables') {
        iconHtml = `<div class="card-art-preview">
          <div class="table-thumb" style="background:${item.tableBg}; border-color:${item.tableBorder}">
            <div class="table-thumb-net" style="background:${item.netColor}"></div>
          </div>
        </div>`;
      } else if (item.category === 'skills') {
        iconHtml = `<div class="card-art-preview">
          <div class="skill-thumb-icon">${item.icon || '⚡'}</div>
        </div>`;
      }

      // Button State
      let actionBtnHtml = '';
      if (isEquipped) {
        actionBtnHtml = `<button class="btn-item-action btn-equipped" disabled>EQUIPADO</button>`;
      } else if (isOwned) {
        actionBtnHtml = `<button class="btn-item-action btn-equip" data-id="${item.id}">EQUIPAR</button>`;
      } else {
        const canAfford = (user?.coins || 0) >= item.price;
        actionBtnHtml = `<button class="btn-item-action btn-buy ${canAfford ? '' : 'btn-disabled'}" data-id="${item.id}">
          COMPRAR 🪙 ${item.price}
        </button>`;
      }

      card.innerHTML = `
        <div class="card-top">
          <span class="rarity-badge ${rarityClass}">${item.rarity.toUpperCase()}</span>
          <span class="item-price-tag">🪙 ${item.price === 0 ? 'GRÁTIS' : item.price}</span>
        </div>
        ${iconHtml}
        <div class="card-info">
          <h3 class="item-name">${item.name}</h3>
          <p class="item-description">${item.description}</p>
          <div class="item-effect-note"><small>✨ ${item.effect}</small></div>
        </div>
        <div class="card-actions">
          <button class="btn-preview" data-id="${item.id}">VISUALIZAR</button>
          ${actionBtnHtml}
        </div>
      `;

      container.appendChild(card);
    });

    // Attach button handlers
    container.querySelectorAll('.btn-buy').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.handleBuy(id);
      });
    });

    container.querySelectorAll('.btn-equip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.handleEquip(id);
      });
    });

    container.querySelectorAll('.btn-preview').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.openPreviewModal(id);
      });
    });
  }

  // --- INVENTORY UI RENDERING ---
  renderInventory() {
    const user = window.storageEngine.getCurrentUser();
    if (!user) return;

    const catalog = window.storageEngine.getCatalog();
    const ownedItems = catalog.filter((it) => user.inventory.includes(it.id));

    // Equipped slots banner in inventory
    const racketSlot = document.getElementById('invEquippedRacket');
    const ballSlot = document.getElementById('invEquippedBall');
    const tableSlot = document.getElementById('invEquippedTable');
    const skillsSlot = document.getElementById('invEquippedSkills');

    const equippedRacket = catalog.find((i) => i.id === user.equipped.racket);
    const equippedBall = catalog.find((i) => i.id === user.equipped.ball);
    const equippedTable = catalog.find((i) => i.id === user.equipped.table);

    if (racketSlot) {
      racketSlot.innerHTML = equippedRacket
        ? `<div class="slot-badge">${equippedRacket.name}</div>`
        : '<span>Nenhuma</span>';
    }
    if (ballSlot) {
      ballSlot.innerHTML = equippedBall
        ? `<div class="slot-badge">${equippedBall.name}</div>`
        : '<span>Nenhuma</span>';
    }
    if (tableSlot) {
      tableSlot.innerHTML = equippedTable
        ? `<div class="slot-badge">${equippedTable.name}</div>`
        : '<span>Nenhuma</span>';
    }
    if (skillsSlot) {
      const skills = (user.equipped.skills || [])
        .map((sId) => catalog.find((i) => i.id === sId))
        .filter(Boolean);

      skillsSlot.innerHTML = skills.length
        ? skills.map((s) => `<span class="slot-badge-skill">${s.icon} ${s.name}</span>`).join(' ')
        : '<span>Nenhuma equipada</span>';
    }

    // Grid of all owned items
    const invGrid = document.getElementById('inventoryItemsGrid');
    if (!invGrid) return;
    invGrid.innerHTML = '';

    if (ownedItems.length === 0) {
      invGrid.innerHTML = `<div class="empty-state">Nenhum item no inventário. Visite a Loja para desbloquear!</div>`;
      return;
    }

    ownedItems.forEach((item) => {
      let isEquipped = false;
      if (item.category === 'rackets') isEquipped = user.equipped.racket === item.id;
      else if (item.category === 'balls') isEquipped = user.equipped.ball === item.id;
      else if (item.category === 'tables') isEquipped = user.equipped.table === item.id;
      else if (item.category === 'skills') isEquipped = (user.equipped.skills || []).includes(item.id);

      const card = document.createElement('div');
      card.className = `shop-item-card rarity-${item.rarity.toLowerCase()} ${isEquipped ? 'is-equipped' : ''}`;

      card.innerHTML = `
        <div class="card-top">
          <span class="rarity-badge badge-rarity-${item.rarity.toLowerCase()}">${item.rarity.toUpperCase()}</span>
          <span class="item-cat-tag">${this.getCategoryLabel(item.category)}</span>
        </div>
        <div class="card-info">
          <h3 class="item-name">${item.icon ? item.icon + ' ' : ''}${item.name}</h3>
          <p class="item-description">${item.description}</p>
          <div class="item-effect-note"><small>✨ ${item.effect}</small></div>
        </div>
        <div class="card-actions">
          <button class="btn-preview" data-id="${item.id}">VISUALIZAR</button>
          ${
            isEquipped
              ? `<button class="btn-item-action btn-equipped" disabled>EM USO</button>`
              : `<button class="btn-item-action btn-equip" data-id="${item.id}">EQUIPAR</button>`
          }
        </div>
      `;

      invGrid.appendChild(card);
    });

    invGrid.querySelectorAll('.btn-equip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.handleEquip(id);
      });
    });

    invGrid.querySelectorAll('.btn-preview').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.openPreviewModal(id);
      });
    });
  }

  getCategoryLabel(cat) {
    if (cat === 'rackets') return '🏓 Raquete';
    if (cat === 'balls') return '⚪ Bolinha';
    if (cat === 'tables') return '🏓 Mesa';
    if (cat === 'skills') return '⚡ Habilidade';
    return cat;
  }

  // --- ACTIONS ---
  handleBuy(itemId) {
    try {
      const res = window.storageEngine.buyItem(itemId);
      if (res && res.success) {
        if (window.soundEngine) window.soundEngine.playCoin();
        this.showToast(`🎉 Você comprou ${res.item.name}!`, 'success');
        this.updateHeaderCoins();
        this.renderShop();
        this.renderInventory();
      }
    } catch (err) {
      if (window.soundEngine) window.soundEngine.playScore(false);
      this.showToast(err.message || 'Erro ao comprar item.', 'error');
    }
  }

  handleEquip(itemId) {
    try {
      const res = window.storageEngine.equipItem(itemId);
      if (res && res.success) {
        if (window.soundEngine) window.soundEngine.playClick();
        this.showToast(`Equipado com sucesso!`, 'success');
        this.renderShop();
        this.renderInventory();
      }
    } catch (err) {
      this.showToast(err.message || 'Erro ao equipar item.', 'error');
    }
  }

  updateHeaderCoins() {
    const user = window.storageEngine.getCurrentUser();
    const coinEl = document.getElementById('userCoinsDisplay');
    if (coinEl && user) {
      coinEl.textContent = user.coins.toLocaleString('pt-BR');
    }
  }

  // --- LIVE CANVAS PREVIEW MODAL ---
  openPreviewModal(itemId) {
    const catalog = window.storageEngine.getCatalog();
    const item = catalog.find((i) => i.id === itemId);
    if (!item) return;

    this.previewItem = item;
    const modal = document.getElementById('previewModal');
    if (!modal) return;

    // Fill details
    document.getElementById('prevItemName').textContent = item.name;
    document.getElementById('prevItemDesc').textContent = item.description;
    document.getElementById('prevItemEffect').textContent = item.effect;
    document.getElementById('prevItemRarity').textContent = item.rarity.toUpperCase();
    document.getElementById('prevItemRarity').className = `badge-rarity-${item.rarity.toLowerCase()}`;
    document.getElementById('prevItemPrice').textContent = `🪙 ${item.price === 0 ? 'Grátis' : item.price}`;

    // Action button
    const user = window.storageEngine.getCurrentUser();
    const isOwned = user ? user.inventory.includes(item.id) : false;
    let isEquipped = false;
    if (user?.equipped) {
      if (item.category === 'rackets') isEquipped = user.equipped.racket === item.id;
      else if (item.category === 'balls') isEquipped = user.equipped.ball === item.id;
      else if (item.category === 'tables') isEquipped = user.equipped.table === item.id;
      else if (item.category === 'skills') isEquipped = (user.equipped.skills || []).includes(item.id);
    }

    const actionContainer = document.getElementById('prevActionBtnContainer');
    if (actionContainer) {
      if (isEquipped) {
        actionContainer.innerHTML = `<button class="btn-equipped" disabled>JÁ EQUIPADO</button>`;
      } else if (isOwned) {
        actionContainer.innerHTML = `<button class="btn-modal-action btn-equip" id="prevEquipBtn">EQUIPAR ITEM</button>`;
        document.getElementById('prevEquipBtn').addEventListener('click', () => {
          this.handleEquip(item.id);
          this.closePreviewModal();
        });
      } else {
        actionContainer.innerHTML = `<button class="btn-modal-action btn-buy" id="prevBuyBtn">COMPRAR (🪙 ${item.price})</button>`;
        document.getElementById('prevBuyBtn').addEventListener('click', () => {
          this.handleBuy(item.id);
          this.closePreviewModal();
        });
      }
    }

    modal.classList.add('active');

    // Init Preview Canvas
    this.previewCanvas = document.getElementById('itemPreviewCanvas');
    if (this.previewCanvas) {
      this.previewCtx = this.previewCanvas.getContext('2d');
      this.previewCanvas.width = 380;
      this.previewCanvas.height = 180;
      this.previewBall = { x: 80, y: 90, vx: 4.2, vy: 2.1, radius: 7, trail: [] };
      this.previewPaddle = { x: 330, y: 55, w: 12, h: 70, targetY: 55 };
      this.previewParticles = [];

      if (this.previewAnimationId) cancelAnimationFrame(this.previewAnimationId);
      this.animatePreview();
    }
  }

  closePreviewModal() {
    const modal = document.getElementById('previewModal');
    if (modal) modal.classList.remove('active');
    if (this.previewAnimationId) {
      cancelAnimationFrame(this.previewAnimationId);
      this.previewAnimationId = null;
    }
    this.previewItem = null;
  }

  animatePreview() {
    if (!this.previewItem || !this.previewCanvas || !this.previewCtx) return;

    const ctx = this.previewCtx;
    const w = this.previewCanvas.width;
    const h = this.previewCanvas.height;
    const item = this.previewItem;

    // Background based on item or default table
    if (item.category === 'tables') {
      ctx.fillStyle = item.tableBg || '#0f172a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = item.tableBorder || '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    } else {
      ctx.fillStyle = '#0a101d';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    }

    // Center dotted line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Update ball
    this.previewBall.x += this.previewBall.vx;
    this.previewBall.y += this.previewBall.vy;

    // Bounce top/bottom
    if (this.previewBall.y - this.previewBall.radius <= 6) {
      this.previewBall.y = 6 + this.previewBall.radius;
      this.previewBall.vy = Math.abs(this.previewBall.vy);
    } else if (this.previewBall.y + this.previewBall.radius >= h - 6) {
      this.previewBall.y = h - 6 - this.previewBall.radius;
      this.previewBall.vy = -Math.abs(this.previewBall.vy);
    }

    // Left wall bounce
    if (this.previewBall.x - this.previewBall.radius <= 8) {
      this.previewBall.x = 8 + this.previewBall.radius;
      this.previewBall.vx = Math.abs(this.previewBall.vx);
    }

    // Paddle tracking
    this.previewPaddle.targetY = this.previewBall.y - this.previewPaddle.h / 2;
    this.previewPaddle.y += (this.previewPaddle.targetY - this.previewPaddle.y) * 0.15;
    this.previewPaddle.y = Math.max(8, Math.min(h - this.previewPaddle.h - 8, this.previewPaddle.y));

    // Paddle collision
    if (
      this.previewBall.vx > 0 &&
      this.previewBall.x + this.previewBall.radius >= this.previewPaddle.x &&
      this.previewBall.x - this.previewBall.radius <= this.previewPaddle.x + this.previewPaddle.w &&
      this.previewBall.y >= this.previewPaddle.y - 6 &&
      this.previewBall.y <= this.previewPaddle.y + this.previewPaddle.h + 6
    ) {
      this.previewBall.vx = -Math.abs(this.previewBall.vx);
      // Spawn particles
      for (let i = 0; i < 12; i++) {
        this.previewParticles.push({
          x: this.previewBall.x,
          y: this.previewBall.y,
          vx: -(Math.random() * 3 + 1),
          vy: (Math.random() - 0.5) * 4,
          color: item.category === 'rackets' ? item.color : '#00f5d4',
          alpha: 1,
        });
      }
    }

    // Ball Trail
    this.previewBall.trail.push({ x: this.previewBall.x, y: this.previewBall.y, alpha: 0.8 });
    if (this.previewBall.trail.length > 8) this.previewBall.trail.shift();

    // Render Trail
    this.previewBall.trail.forEach((t) => {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = item.category === 'balls' ? item.color : '#00f2fe';
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.previewBall.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Render Ball
    ctx.save();
    let bColor = item.category === 'balls' ? item.color : '#ffffff';
    ctx.shadowColor = bColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = bColor;
    ctx.beginPath();
    ctx.arc(this.previewBall.x, this.previewBall.y, this.previewBall.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Render Realistic Table Tennis Paddle (Blade + Handle)
    ctx.save();
    const padCenterX = this.previewPaddle.x + this.previewPaddle.w / 2;
    const padCenterY = this.previewPaddle.y + this.previewPaddle.h * 0.38;
    ctx.translate(padCenterX, padCenterY);
    ctx.rotate(0.12);

    // Wooden handle
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-3.5, 18, 7, 20);

    // Racket Bevel
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Racket Rubber Face
    let pColor = item.category === 'rackets' ? item.color : '#dc2626';
    ctx.shadowColor = item.category === 'rackets' ? item.glow : 'rgba(220, 38, 38, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Render particles
    for (let i = this.previewParticles.length - 1; i >= 0; i--) {
      const p = this.previewParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.04;
      if (p.alpha <= 0) {
        this.previewParticles.splice(i, 1);
      } else {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    this.previewAnimationId = requestAnimationFrame(() => this.animatePreview());
  }

  showToast(msg, type = 'info') {
    const toast = document.getElementById('gameToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `game-toast show toast-${type}`;
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }
}

// Global ShopManager instance
window.shopManager = new ShopManager();
