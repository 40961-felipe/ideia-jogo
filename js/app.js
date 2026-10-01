/**
 * Main Application Bootstrapper
 * Initializes Storage, Shop, UI, and Audio controllers
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Ensure storage is initialized
  if (window.storageEngine) {
    window.storageEngine.initDatabase();
  }

  // 2. Initialize Shop & Inventory
  if (window.shopManager) {
    window.shopManager.init();
  }

  // 3. Initialize UI Controller & Router
  if (window.uiManager) {
    window.uiManager.init();
  }

  console.log('🏓 PING PONG — 15 CHALLENGE inicializado com sucesso!');
});
