/**
 * 青空文庫テキストファイルのパーサー
 * 注記や装飾を処理して、読みやすいテキストに変換する
 */

interface ParsedContent {
  title: string;
  author: string;
  body: string;
  chapters: Chapter[];
}

interface Chapter {
  title: string;
  startLine: number;
  endLine: number;
}

/**
 * 青空文庫のテキストファイルをパースする
 */
export function parseAozoraText(rawText: string): ParsedContent {
  const lines = rawText.split('\n');
  
  let title = '';
  let author = '';
  let bodyStartIndex = 0;
  const chapters: Chapter[] = [];
  
  // ヘッダー情報を抽出
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // タイトルを探す（通常は最初の非空行）
    if (!title && line.trim() && !line.startsWith('【')) {
      title = line.trim();
    }
    
    // 著者を探す（【著者名】形式）
    if (line.includes('【著者名】')) {
      author = line.replace('【著者名】', '').trim();
    }
    
    // 本文開始マーカーを探す
    if (line.includes('-----')) {
      bodyStartIndex = i + 1;
      break;
    }
  }
  
  // 本文を抽出
  const bodyLines = lines.slice(bodyStartIndex);
  let body = bodyLines.join('\n');
  
  // 本文終了マーカーを削除
  const endMarkerIndex = body.indexOf('-----');
  if (endMarkerIndex !== -1) {
    body = body.substring(0, endMarkerIndex);
  }
  
  // 注記を処理（【】内のテキストを削除または変換）
  body = processAnnotations(body);
  
  // 章立てを抽出
  const chapterPattern = /^第[一二三四五六七八九十百千万0-9]+[章節]/gm;
  let match;
  let currentLine = 0;
  
  while ((match = chapterPattern.exec(body)) !== null) {
    const linesBefore = body.substring(0, match.index).split('\n').length - 1;
    chapters.push({
      title: match[0],
      startLine: linesBefore,
      endLine: linesBefore,
    });
  }
  
  return {
    title,
    author,
    body: body.trim(),
    chapters,
  };
}

/**
 * 青空文庫の注記を処理する
 */
function processAnnotations(text: string): string {
  // ルビ（振り仮名）を処理：《ルビ》→ ルビ
  text = text.replace(/《([^》]+)》/g, '$1');
  
  // 傍点を処理：［＃傍点］...［＃傍点終わり］
  text = text.replace(/\[＃傍点\](.*?)\[＃傍点終わり\]/g, '$1');
  
  // 注記を削除：【】内のテキスト
  text = text.replace(/【([^】]*)】/g, '');
  
  // 改ページマーカーを削除
  text = text.replace(/\[＃改ページ\]/g, '\n');
  
  // 行中注を処理：（注：...）
  text = text.replace(/（注：([^）]*)）/g, '（$1）');
  
  // 複数の空行を1行に統合
  text = text.replace(/\n\n+/g, '\n\n');
  
  return text;
}

/**
 * テキストをページに分割する
 */
export function paginateText(
  text: string,
  linesPerPage: number = 30
): string[] {
  const lines = text.split('\n');
  const pages: string[] = [];
  
  for (let i = 0; i < lines.length; i += linesPerPage) {
    const page = lines.slice(i, i + linesPerPage).join('\n');
    pages.push(page);
  }
  
  return pages;
}

/**
 * 指定された行番号のページを取得する
 */
export function getPageAtLine(
  text: string,
  lineNumber: number,
  linesPerPage: number = 30
): string {
  const lines = text.split('\n');
  const startLine = Math.max(0, lineNumber - Math.floor(linesPerPage / 2));
  const endLine = Math.min(lines.length, startLine + linesPerPage);
  
  return lines.slice(startLine, endLine).join('\n');
}

/**
 * テキストから指定されたキーワードを検索する
 */
export function searchInText(text: string, keyword: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lines = text.split('\n');
  
  lines.forEach((line, index) => {
    let startIndex = 0;
    while ((startIndex = line.indexOf(keyword, startIndex)) !== -1) {
      results.push({
        lineNumber: index,
        columnNumber: startIndex,
        context: line.substring(
          Math.max(0, startIndex - 20),
          Math.min(line.length, startIndex + keyword.length + 20)
        ),
      });
      startIndex += keyword.length;
    }
  });
  
  return results;
}

interface SearchResult {
  lineNumber: number;
  columnNumber: number;
  context: string;
}

/**
 * テキストの統計情報を取得する
 */
export function getTextStats(text: string) {
  const lines = text.split('\n');
  const characters = text.length;
  const words = text.split(/\s+/).length;
  const paragraphs = text.split(/\n\n+/).length;
  
  return {
    characters,
    words,
    lines: lines.length,
    paragraphs,
    averageLineLength: Math.round(characters / lines.length),
  };
}

