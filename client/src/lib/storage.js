/**
 * ローカルストレージを使用した設定とデータの永続化
 */

// ストレージキー定数
const STORAGE_KEYS = {
  SETTINGS: 'aozora_reader_settings',
  READING_PROGRESS: 'aozora_reader_progress',
  BOOKMARKS: 'aozora_reader_bookmarks',
  FAVORITES: 'aozora_reader_favorites',
  READING_HISTORY: 'aozora_reader_history',
  REVIEWS: 'aozora_reader_reviews'
};

// デフォルト設定
const DEFAULT_SETTINGS = {
  darkMode: false,
  fontSize: 16,
  lineHeight: 1.8,
  fontFamily: 'serif',
  writingMode: 'horizontal', // 'horizontal' | 'vertical'
  pageWidth: 'normal', // 'narrow' | 'normal' | 'wide'
  autoSave: true,
  readingSpeed: 300 // 文字/分
};

/**
 * 設定の管理
 */
export class SettingsManager {
  static getSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings) {
    try {
      const currentSettings = this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
      return newSettings;
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      throw error;
    }
  }

  static resetSettings() {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('設定のリセットに失敗しました:', error);
      throw error;
    }
  }
}

/**
 * 読書進捗の管理
 */
export class ReadingProgressManager {
  static getProgress(bookId) {
    try {
      const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEYS.READING_PROGRESS) || '{}');
      return allProgress[bookId] || {
        bookId,
        currentPosition: 0,
        totalLength: 0,
        percentage: 0,
        lastReadAt: null,
        readingTime: 0 // 読書時間（分）
      };
    } catch (error) {
      console.error('読書進捗の読み込みに失敗しました:', error);
      return {
        bookId,
        currentPosition: 0,
        totalLength: 0,
        percentage: 0,
        lastReadAt: null,
        readingTime: 0
      };
    }
  }

  static saveProgress(bookId, progress) {
    try {
      const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEYS.READING_PROGRESS) || '{}');
      allProgress[bookId] = {
        ...allProgress[bookId],
        ...progress,
        bookId,
        lastReadAt: new Date().toISOString()
      };
      
      // パーセンテージを計算
      if (progress.totalLength > 0) {
        allProgress[bookId].percentage = Math.round((progress.currentPosition / progress.totalLength) * 100);
      }
      
      localStorage.setItem(STORAGE_KEYS.READING_PROGRESS, JSON.stringify(allProgress));
      return allProgress[bookId];
    } catch (error) {
      console.error('読書進捗の保存に失敗しました:', error);
      throw error;
    }
  }

  static getAllProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.READING_PROGRESS) || '{}');
    } catch (error) {
      console.error('全読書進捗の読み込みに失敗しました:', error);
      return {};
    }
  }

  static deleteProgress(bookId) {
    try {
      const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEYS.READING_PROGRESS) || '{}');
      delete allProgress[bookId];
      localStorage.setItem(STORAGE_KEYS.READING_PROGRESS, JSON.stringify(allProgress));
    } catch (error) {
      console.error('読書進捗の削除に失敗しました:', error);
      throw error;
    }
  }
}

/**
 * ブックマークの管理
 */
export class BookmarkManager {
  static getBookmarks(bookId) {
    try {
      const allBookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '{}');
      return allBookmarks[bookId] || [];
    } catch (error) {
      console.error('ブックマークの読み込みに失敗しました:', error);
      return [];
    }
  }

  static addBookmark(bookId, bookmark) {
    try {
      const allBookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '{}');
      if (!allBookmarks[bookId]) {
        allBookmarks[bookId] = [];
      }
      
      const newBookmark = {
        id: Date.now().toString(),
        position: bookmark.position,
        text: bookmark.text,
        note: bookmark.note || '',
        createdAt: new Date().toISOString()
      };
      
      allBookmarks[bookId].push(newBookmark);
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(allBookmarks));
      return newBookmark;
    } catch (error) {
      console.error('ブックマークの追加に失敗しました:', error);
      throw error;
    }
  }

  static removeBookmark(bookId, bookmarkId) {
    try {
      const allBookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '{}');
      if (allBookmarks[bookId]) {
        allBookmarks[bookId] = allBookmarks[bookId].filter(b => b.id !== bookmarkId);
        localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(allBookmarks));
      }
    } catch (error) {
      console.error('ブックマークの削除に失敗しました:', error);
      throw error;
    }
  }
}

/**
 * お気に入りの管理
 */
export class FavoritesManager {
  static getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
    } catch (error) {
      console.error('お気に入りの読み込みに失敗しました:', error);
      return [];
    }
  }

  static addFavorite(bookId) {
    try {
      const favorites = this.getFavorites();
      if (!favorites.includes(bookId)) {
        favorites.push(bookId);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
      }
      return favorites;
    } catch (error) {
      console.error('お気に入りの追加に失敗しました:', error);
      throw error;
    }
  }

  static removeFavorite(bookId) {
    try {
      const favorites = this.getFavorites();
      const newFavorites = favorites.filter(id => id !== bookId);
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(newFavorites));
      return newFavorites;
    } catch (error) {
      console.error('お気に入りの削除に失敗しました:', error);
      throw error;
    }
  }

  static isFavorite(bookId) {
    return this.getFavorites().includes(bookId);
  }
}

/**
 * 読書履歴の管理
 */
export class ReadingHistoryManager {
  static getHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.READING_HISTORY) || '[]');
    } catch (error) {
      console.error('読書履歴の読み込みに失敗しました:', error);
      return [];
    }
  }

  static addToHistory(bookId, bookInfo) {
    try {
      const history = this.getHistory();
      const existingIndex = history.findIndex(item => item.bookId === bookId);
      
      const historyItem = {
        bookId,
        title: bookInfo.title,
        author: bookInfo.author,
        lastReadAt: new Date().toISOString()
      };
      
      if (existingIndex >= 0) {
        // 既存のアイテムを更新して先頭に移動
        history.splice(existingIndex, 1);
      }
      
      history.unshift(historyItem);
      
      // 履歴は最大50件まで保持
      if (history.length > 50) {
        history.splice(50);
      }
      
      localStorage.setItem(STORAGE_KEYS.READING_HISTORY, JSON.stringify(history));
      return history;
    } catch (error) {
      console.error('読書履歴の追加に失敗しました:', error);
      throw error;
    }
  }

  static clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEYS.READING_HISTORY);
      return [];
    } catch (error) {
      console.error('読書履歴のクリアに失敗しました:', error);
      throw error;
    }
  }
}

/**
 * レビューの管理
 */
export class ReviewManager {
  static getReviews(bookId) {
    try {
      const allReviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || '{}');
      return allReviews[bookId] || [];
    } catch (error) {
      console.error('レビューの読み込みに失敗しました:', error);
      return [];
    }
  }

  static addReview(bookId, review) {
    try {
      const allReviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || '{}');
      if (!allReviews[bookId]) {
        allReviews[bookId] = [];
      }
      
      const newReview = {
        id: Date.now().toString(),
        rating: review.rating,
        title: review.title,
        content: review.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      allReviews[bookId].push(newReview);
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(allReviews));
      return newReview;
    } catch (error) {
      console.error('レビューの追加に失敗しました:', error);
      throw error;
    }
  }

  static updateReview(bookId, reviewId, updates) {
    try {
      const allReviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || '{}');
      if (allReviews[bookId]) {
        const reviewIndex = allReviews[bookId].findIndex(r => r.id === reviewId);
        if (reviewIndex >= 0) {
          allReviews[bookId][reviewIndex] = {
            ...allReviews[bookId][reviewIndex],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(allReviews));
          return allReviews[bookId][reviewIndex];
        }
      }
      return null;
    } catch (error) {
      console.error('レビューの更新に失敗しました:', error);
      throw error;
    }
  }

  static deleteReview(bookId, reviewId) {
    try {
      const allReviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || '{}');
      if (allReviews[bookId]) {
        allReviews[bookId] = allReviews[bookId].filter(r => r.id !== reviewId);
        localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(allReviews));
      }
    } catch (error) {
      console.error('レビューの削除に失敗しました:', error);
      throw error;
    }
  }
}
