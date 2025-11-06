/**
 * 青空文庫のテキストデータを処理するユーティリティ
 */

// ZORAPI のベースURL
const ZORAPI_BASE_URL = "https://api.bungomail.com/v0";

// 青空文庫の注記記号を処理する関数
export function parseAozoraText(text: string): string {
  if (!text) return "";
  
  let processedText = text;
  
  // ヘッダー情報を除去（作品本文の開始まで）
  const bodyStart = processedText.indexOf("-------------------------------------------------------");
  if (bodyStart !== -1) {
    const secondDivider = processedText.indexOf("-------------------------------------------------------", bodyStart + 1);
    if (secondDivider !== -1) {
      processedText = processedText.substring(secondDivider + 55);
    }
  }
  
  // フッター情報を除去（作品本文の終了から）
  const footerStart = processedText.lastIndexOf("底本：");
  if (footerStart !== -1) {
    processedText = processedText.substring(0, footerStart);
  }
  
  // 青空文庫の注記を処理
  processedText = processedText
    // ルビの処理 ｜漢字《かんじ》 → <ruby>漢字<rt>かんじ</rt></ruby>
    .replace(/｜([^《]+)《([^》]+)》/g, 
      "<ruby>$1<rt>$2</rt></ruby>"
    )
    // 簡単なルビの処理 漢字《かんじ》 → <ruby>漢字<rt>かんじ</rt></ruby>
    .replace(/([一-龯]+)《([^》]+)》/g, 
      "<ruby>$1<rt>$2</rt></ruby>"
    )
    // 傍点の処理 ［＃「文字」に傍点］
    .replace(/［＃「([^」]+)」に傍点］/g, 
      "<em class=\"emphasis-dots\">$1</em>"
    )
    // 太字の処理 ［＃「文字」は太字］
    .replace(/［＃「([^」]+)」は太字］/g, 
      "<strong>$1</strong>"
    )
    // 改ページ ［＃改ページ］
    .replace(/［＃改ページ］/g, 
      "<div class=\"page-break\"></div>"
    )
    // 字下げ ［＃ここから○字下げ］...［＃ここで字下げ終わり］
    .replace(/［＃ここから(\d+)字下げ］([\s\S]*?)［＃ここで字下げ終わり］/g, 
      "<div class=\"indent-$1\">$2</div>"
    )
    // 見出し ［＃「([^」]+)」は大見出し］
    .replace(/［＃「([^」]+)」は大見出し］/g, 
      "<h1 class=\"chapter-title\">$1</h1>"
    )
    .replace(/［＃「([^」]+)」は中見出し］/g, 
      "<h2 class=\"section-title\">$1</h2>"
    )
    .replace(/［＃「([^」]+)」は小見出し］/g, 
      "<h3 class=\"subsection-title\">$1</h3>"
    )
    // その他の注記を除去
    .replace(/［＃[^］]*］/g, 
      ""
    )
    // 連続する空行を整理
    .replace(/\n\s*\n\s*\n/g, 
      "\n\n"
    )
    // 行頭の全角スペースを段落インデントに変換
    .replace(/^　+/gm, (match) => 
      `<span class="indent-${match.length}"></span>`
    )
    // 改行をHTMLの改行に変換
    .replace(/\n/g, 
      "<br>"
    );
  
  return processedText.trim();
}

// 青空文庫のZIPファイルからテキストを抽出する関数
export async function extractTextFromZip(zipUrl: string): Promise<string> {
  try {
    // ZIPファイルをダウンロード
    const response = await fetch(zipUrl, {
      headers: {
        "Accept": "application/zip, application/octet-stream, */*",
        "User-Agent": "Mozilla/5.0 (compatible; AozoraReader/1.0)"
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ZIP file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // JSZipでZIPを解凍（動的インポート）
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    await zip.loadAsync(arrayBuffer);
    
    // テキストファイルを探す
    let textContent = '';
    for (const [filename, file] of Object.entries(zip.files)) {
      if (filename.endsWith('.txt')) {
        const data = await file.async('arraybuffer');
        
        // Shift JISをデコード（動的インポート）
        try {
          const encodingJapanese = await import('encoding-japanese');
          const decode = (encodingJapanese as any).decode;
          textContent = decode(new Uint8Array(data), { type: 'sjis' });
        } catch {
          // encoding-japaneseが利用できない場合は、UTF-8として処理
          const decoder = new TextDecoder('utf-8');
          textContent = decoder.decode(data);
        }
        
        // テキストをパース
        return parseAozoraText(textContent);
      }
    }
    
    throw new Error('No text file found in ZIP');
  } catch (error) {
    console.error('Error extracting text from ZIP:', error);
    throw error;
  }
}

// 青空文庫のHTMLページからテキストを取得する関数
export async function fetchAozoraTextFromHTML(bookUrl: string): Promise<string> {
  try {
    const response = await fetch(bookUrl);
    const html = await response.text();
    
    // HTMLから本文を抽出（簡易版）
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 青空文庫のHTMLから本文を抽出
    const mainContent = doc.querySelector('div.main_text');
    if (mainContent) {
      return mainContent.textContent || '';
    }
    
    throw new Error('Could not extract text from HTML');
  } catch (error) {
    console.error('Error fetching text from HTML:', error);
    throw error;
  }
}

interface AozoraBook {
  id: number;
  title: string;
  author: string;
  year?: number;
  characterCount?: number;
  description?: string;
}

// ZORAPI からリアルタイムで作品リストを取得する関数
export async function getAozoraBookList(keyword = '', limit = 50): Promise<AozoraBook[]> {
  try {
    // キャッシュから取得（5分以内）
    const cacheKey = 'aozora_books_cache';
    const cacheTime = 'aozora_books_cache_time';
    const now = Date.now();
    const cached = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTime);
    
    if (cached && cachedTime && (now - parseInt(cachedTime)) < 5 * 60 * 1000) {
      const books = JSON.parse(cached) as AozoraBook[];
      if (keyword) {
        return books.filter((b: AozoraBook) => 
          b.title.includes(keyword) || b.author.includes(keyword)
        );
      }
      return books.slice(0, limit);
    }
    
    // ZORAAPIから取得
    const url = `${ZORAPI_BASE_URL}/books?limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AozoraReader/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch books: ${response.statusText}`);
    }
    
    const data = await response.json();
    const books = (data.books || []) as AozoraBook[];
    
    // キャッシュに保存
    localStorage.setItem(cacheKey, JSON.stringify(books));
    localStorage.setItem(cacheTime, now.toString());
    
    // キーワードでフィルタリング
    if (keyword) {
      return books.filter((b: AozoraBook) => 
        b.title.includes(keyword) || b.author.includes(keyword)
      );
    }
    
    return books;
  } catch (error) {
    console.error('Error fetching books from ZORAPI:', error);
    
    // エラー時はサンプルデータを返す
    return [
      {
        id: 1,
        title: "羅生門",
        author: "芥川龍之介",
        year: 1915,
        characterCount: 3000,
        description: "ある日の暮れ方、羅生門の下に一人の下人がいた..."
      },
      {
        id: 2,
        title: "蜘蛛の糸",
        author: "芥川龍之介",
        year: 1918,
        characterCount: 2000,
        description: "お釈迦様は極楽の蓮池のふちを、独りでぶらぶら..."
      },
      {
        id: 3,
        title: "吾輩は猫である",
        author: "夏目漱石",
        year: 1905,
        characterCount: 150000,
        description: "吾輩は猫である。名前はまだ無い..."
      }
    ];
  }
}
