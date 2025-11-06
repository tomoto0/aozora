/**
 * PWA (Progressive Web App) 機能の管理
 */

// Service Worker の登録
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Service Worker を登録（ルートパスで登録）
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered successfully:', registration);
      
      // 更新チェック
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新しいバージョンが利用可能
              showUpdateAvailable();
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.warn('Service Worker registration failed (this is optional):', error);
      // PWA機能は必須ではないため、エラーは警告のみ
      return null;
    }
  } else {
    console.warn('Service Worker is not supported');
    return null;
  }
}

// Service Worker の更新
export async function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (registration) {
        await registration.update();
      }
    } catch (error) {
      console.warn('Service Worker update failed:', error);
    }
  }
}

// アプリのインストール促進
export class PWAInstallPrompt {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isInstallable = false;
    
    this.init();
  }
  
  init() {
    // インストール可能イベントをリッスン
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.onInstallable();
    });
    
    // インストール完了イベントをリッスン
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App installed');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.isInstallable = false;
      this.onInstalled();
    });
    
    // 既にインストール済みかチェック
    this.checkIfInstalled();
  }
  
  async checkIfInstalled() {
    // スタンドアロンモードで実行されているかチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      return true;
    }
    
    // iOS Safari のホーム画面追加をチェック
    if (window.navigator.standalone === true) {
      this.isInstalled = true;
      return true;
    }
    
    return false;
  }
  
  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      return false;
    }
    
    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('PWA: Install prompt result:', outcome);
      
      if (outcome === 'accepted') {
        this.deferredPrompt = null;
        this.isInstallable = false;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PWA: Install prompt failed:', error);
      return false;
    }
  }
  
  // オーバーライド可能なコールバック
  onInstallable() {
    // インストール可能になった時の処理
  }
  
  onInstalled() {
    // インストール完了時の処理
  }
}

// オフライン状態の管理
export class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.callbacks = {
      online: [],
      offline: []
    };
    
    this.init();
  }
  
  init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.callbacks.online.forEach(callback => callback());
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.callbacks.offline.forEach(callback => callback());
    });
  }
  
  onOnline(callback) {
    this.callbacks.online.push(callback);
  }
  
  onOffline(callback) {
    this.callbacks.offline.push(callback);
  }
  
  removeCallback(type, callback) {
    const index = this.callbacks[type].indexOf(callback);
    if (index > -1) {
      this.callbacks[type].splice(index, 1);
    }
  }
}

// バックグラウンド同期
export async function requestBackgroundSync(tag) {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log('Background sync registered:', tag);
      return true;
    } catch (error) {
      console.warn('Background sync registration failed:', error);
      return false;
    }
  }
  return false;
}

// プッシュ通知の許可要求
export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission === 'granted';
  }
  return false;
}

// プッシュ通知の送信
export function showNotification(title, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const defaultOptions = {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100]
    };
    
    return new Notification(title, { ...defaultOptions, ...options });
  }
  return null;
}

// アプリの更新通知
export function showUpdateAvailable() {
  const notification = showNotification('アプリの更新が利用可能です', {
    body: '新しいバージョンをインストールしますか？',
    actions: [
      { action: 'update', title: '更新' },
      { action: 'dismiss', title: '後で' }
    ]
  });
  
  if (notification) {
    notification.onclick = () => {
      window.location.reload();
    };
  }
}

// PWA の機能サポート状況をチェック
export function checkPWASupport() {
  const support = {
    serviceWorker: 'serviceWorker' in navigator,
    manifest: 'manifest' in document.createElement('link'),
    notification: 'Notification' in window,
    backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
    webShare: 'share' in navigator,
    installPrompt: 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window
  };
  
  console.log('PWA Support:', support);
  return support;
}

// キャッシュの管理
export async function clearAppCache() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('aozora-reader'))
          .map(name => caches.delete(name))
      );
      console.log('App cache cleared');
      return true;
    } catch (error) {
      console.warn('Failed to clear cache:', error);
      return false;
    }
  }
  return false;
}

// ストレージ使用量の確認
export async function getStorageUsage() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage,
        available: estimate.quota,
        percentage: Math.round((estimate.usage / estimate.quota) * 100)
      };
    } catch (error) {
      console.warn('Failed to get storage usage:', error);
      return null;
    }
  }
  return null;
}

