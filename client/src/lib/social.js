/**
 * ソーシャル機能（読書記録の共有）
 */

// 読書記録を共有用のテキストに変換
export function generateShareText(book, progress, review = null) {
  let shareText = `📚 「${book.title}」（${book.author}）を読んでいます！\n\n`;
  
  if (progress && progress.percentage > 0) {
    if (progress.percentage >= 100) {
      shareText += `✅ 読了しました！\n`;
    } else {
      shareText += `📖 読書進捗: ${progress.percentage}%\n`;
    }
  }
  
  if (review) {
    shareText += `\n⭐ 評価: ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}\n`;
    shareText += `💭 ${review.title}\n`;
    if (review.content.length > 100) {
      shareText += `${review.content.substring(0, 100)}...\n`;
    } else {
      shareText += `${review.content}\n`;
    }
  }
  
  shareText += `\n#青空文庫 #読書記録 #${book.author.replace(/\s+/g, '')}`;
  
  return shareText;
}

// 読書統計を共有用のテキストに変換
export function generateStatsShareText(stats) {
  let shareText = `📊 私の読書統計\n\n`;
  shareText += `📚 読了作品数: ${stats.completedBooks}冊\n`;
  shareText += `⏱️ 総読書時間: ${Math.round(stats.totalReadingTime / 60)}時間\n`;
  shareText += `❤️ お気に入り作品数: ${stats.favoriteBooks}冊\n`;
  
  if (stats.favoriteAuthor) {
    shareText += `✍️ よく読む著者: ${stats.favoriteAuthor}\n`;
  }
  
  shareText += `\n#青空文庫 #読書記録 #読書統計`;
  
  return shareText;
}

// Twitter/X で共有
export function shareOnTwitter(text, url = '') {
  const twitterUrl = new URL('https://twitter.com/intent/tweet');
  twitterUrl.searchParams.set('text', text);
  if (url) {
    twitterUrl.searchParams.set('url', url);
  }
  
  window.open(twitterUrl.toString(), '_blank', 'width=600,height=400');
}

// Facebook で共有
export function shareOnFacebook(url, quote = '') {
  const facebookUrl = new URL('https://www.facebook.com/sharer/sharer.php');
  facebookUrl.searchParams.set('u', url);
  if (quote) {
    facebookUrl.searchParams.set('quote', quote);
  }
  
  window.open(facebookUrl.toString(), '_blank', 'width=600,height=400');
}

// LINE で共有
export function shareOnLine(text) {
  const lineUrl = new URL('https://social-plugins.line.me/lineit/share');
  lineUrl.searchParams.set('text', text);
  
  window.open(lineUrl.toString(), '_blank', 'width=600,height=400');
}

// Web Share API を使用した共有（モバイル対応）
export async function shareWithWebAPI(data) {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('Web Share API でのシェアに失敗しました:', error);
      return false;
    }
  }
  return false;
}

// クリップボードにコピー
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // フォールバック: 古いブラウザ対応
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    } catch (fallbackError) {
      console.error('クリップボードへのコピーに失敗しました:', fallbackError);
      return false;
    }
  }
}

// 読書記録のURL生成（将来的にサーバーサイドで実装する場合）
export function generateShareUrl(bookId, userId = null) {
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = new URL(baseUrl);
  shareUrl.searchParams.set('book', bookId);
  if (userId) {
    shareUrl.searchParams.set('user', userId);
  }
  return shareUrl.toString();
}

// 読書統計の計算
export function calculateReadingStats(allProgress, favorites, reviews) {
  const completedBooks = Object.values(allProgress).filter(p => p.percentage >= 100).length;
  const totalReadingTime = Object.values(allProgress).reduce((total, p) => total + (p.readingTime || 0), 0);
  const favoriteBooks = favorites.length;
  
  // よく読む著者を計算
  const authorCounts = {};
  Object.values(allProgress).forEach(progress => {
    if (progress.author) {
      authorCounts[progress.author] = (authorCounts[progress.author] || 0) + 1;
    }
  });
  
  const favoriteAuthor = Object.keys(authorCounts).reduce((a, b) => 
    authorCounts[a] > authorCounts[b] ? a : b, null
  );
  
  // 平均評価を計算
  const allReviews = Object.values(reviews).flat();
  const averageRating = allReviews.length > 0 
    ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length 
    : 0;
  
  return {
    completedBooks,
    totalReadingTime,
    favoriteBooks,
    favoriteAuthor,
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: allReviews.length
  };
}

// 共有可能なプラットフォームの検出
export function getAvailableSharePlatforms() {
  const platforms = [];
  
  // Web Share API の対応確認
  if (navigator.share) {
    platforms.push({
      id: 'native',
      name: 'シェア',
      icon: 'Share',
      action: shareWithWebAPI
    });
  }
  
  // 各SNSプラットフォーム
  platforms.push(
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'Twitter',
      action: shareOnTwitter
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'Facebook',
      action: shareOnFacebook
    },
    {
      id: 'line',
      name: 'LINE',
      icon: 'MessageCircle',
      action: shareOnLine
    },
    {
      id: 'copy',
      name: 'コピー',
      icon: 'Copy',
      action: copyToClipboard
    }
  );
  
  return platforms;
}

// 共有データの生成
export function createShareData(type, data) {
  switch (type) {
    case 'book':
      return {
        title: `「${data.book.title}」を読んでいます`,
        text: generateShareText(data.book, data.progress, data.review),
        url: generateShareUrl(data.book.id)
      };
    
    case 'review':
      return {
        title: `「${data.book.title}」のレビュー`,
        text: generateShareText(data.book, null, data.review),
        url: generateShareUrl(data.book.id)
      };
    
    case 'stats':
      return {
        title: '私の読書統計',
        text: generateStatsShareText(data.stats),
        url: window.location.origin + window.location.pathname
      };
    
    default:
      return {
        title: '青空文庫リーダー',
        text: '青空文庫の作品を快適に読めるWebアプリです',
        url: window.location.origin + window.location.pathname
      };
  }
}
