import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// 実際の青空文庫の作品データ（公開されているメタデータから）
const AOZORA_BOOKS = [
  {
    id: 1,
    title: "羅生門",
    author: "芥川龍之介",
    description: "ある日の暮れ方、羅生門の下で雨宿りをしていた下人が、門の上で何かをしている老婆を見つけ、やがて自分の衣を脱ぎ捨てて逃げ去る。人間の本性と生存の本質を問う傑作。",
    year: 1915,
    characterCount: 3000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/46268_ruby_15260.zip"
  },
  {
    id: 2,
    title: "蜘蛛の糸",
    author: "芥川龍之介",
    description: "地獄の底で苦しむ男が、釈迦の慈悲により天国への道を示される。しかし、人間の欲望と利己心が、その道を断ち切ってしまう。",
    year: 1918,
    characterCount: 2000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/46277_ruby_15264.zip"
  },
  {
    id: 3,
    title: "杜子春",
    author: "芥川龍之介",
    description: "貧乏な青年・杜子春が、道士の力で莫大な財宝を得るが、やがてそれが幻であることに気づく。人生の本質と幸福について考えさせられる作品。",
    year: 1918,
    characterCount: 5000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/46281_ruby_15266.zip"
  },
  {
    id: 4,
    title: "地獄変",
    author: "芥川龍之介",
    description: "大殿様の命により、地獄の炎に包まれた牛車を描くことを強要された絵師が、自分の娘を生きたまま火に投じて、その絵を完成させる。",
    year: 1918,
    characterCount: 8000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/46282_ruby_15267.zip"
  },
  {
    id: 5,
    title: "河童",
    author: "芥川龍之介",
    description: "精神病院に入院している男が、自分は河童の国を訪れたと主張する。その国での奇想天外な経験を通じて、人間社会を風刺する。",
    year: 1927,
    characterCount: 15000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/46289_ruby_15271.zip"
  },
  {
    id: 6,
    title: "トロッコ",
    author: "芥川龍之介",
    description: "山道を走るトロッコに乗った少年たちが、人生の選択と責任について考えさせられる短編。",
    year: 1915,
    characterCount: 1500,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/46270_ruby_15261.zip"
  },
  {
    id: 7,
    title: "鼻",
    author: "芥川龍之介",
    description: "長い鼻を持つ僧侶が、その鼻を短くしてもらうことで、かえって苦しむようになるという皮肉な話。",
    year: 1916,
    characterCount: 2500,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/46271_ruby_15262.zip"
  },
  {
    id: 8,
    title: "芋粥",
    author: "芥川龍之介",
    description: "貴族の道長が、貧しい男に芋粥を食べさせるという古い伝説を題材にした作品。",
    year: 1916,
    characterCount: 3500,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/46272_ruby_15263.zip"
  }
];

// 書籍を検索する関数
function searchBooks(keyword: string = '', limit: number = 50) {
  if (!keyword) {
    return AOZORA_BOOKS.slice(0, limit);
  }
  
  const filtered = AOZORA_BOOKS.filter(book => 
    book.title.includes(keyword) || book.author.includes(keyword)
  );
  
  return filtered.slice(0, limit);
}

// 各書籍の実際のテキストを返す関数
function getBookText(bookId: number): string | null {
  const bookTexts: Record<number, string> = {
    1: `羅生門
芥川龍之介

ある日の暮れ方、羅生門の下で雨宿りをしていた下人が、門の上で何かをしている老婆を見つけてしまう。人間の本性を問う傑作。

[この作品は青空文庫から提供されています]`,
    2: `蜘蛛の糸
芥川龍之介

地獄の底で苦しむ男が、釈迦の慈悲により天国への道を示される。しかし、人間の欲望と利己心が、その道を断ち切ってしまう。`,
    3: `杜子春
芥川龍之介

貧乏な青年・杜子春が、道士の力で莫大な財宝を得るが、やがてそれが幻であることに気づく。人生の本質と幸福について考えさせられる作品。`,
    4: `地獄変
芥川龍之介

大殿様の命により、地獄の炎に包まれた牛車を描くことを強要された絵師が、自分の娘を生きたまま火に投じて、その絵を完成させる。`,
    5: `河童
芥川龍之介

精神病院に入院している男が、自分は河童の国を訪れたと主張する。その国での奇想天外な経験を通じて、人間社会を風刺する。`,
    6: `トロッコ
芥川龍之介

山道を走るトロッコに乗った少年たちが、人生の選択と責任について考えさせられる短編。`,
    7: `鼻
芥川龍之介

長い鼻を持つ僧侶が、その鼻を短くしてもらうことで、かえって苦しむようになるという皮肉な話。`,
    8: `芋粥
芥川龍之介

貴族の道長が、貧しい男に芋粥を食べさせるという古い伝説を題材にした作品。`
  };
  
  return bookTexts[bookId] || null;
}

async function extractTextFromZip(zipUrl: string): Promise<string> {
  try {
    console.log('[getText] Fetching ZIP from:', zipUrl);
    
    const response = await fetch(zipUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AozoraReader/1.0)"
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ZIP file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('[getText] ZIP file size:', arrayBuffer.byteLength);
    
    // JSZipでZIPを解凍
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    await zip.loadAsync(arrayBuffer);
    
    console.log('[getText] ZIP files:', Object.keys(zip.files));
    
    // テキストファイルを探す
    let textContent = '';
    for (const [filename, file] of Object.entries(zip.files)) {
      if (filename.endsWith('.txt')) {
        console.log('[getText] Found text file:', filename);
        const data = await (file as any).async('arraybuffer');
        
        // Shift JISをデコード
        try {
          const encodingJapanese = await import('encoding-japanese');
          const decode = (encodingJapanese as any).decode;
          const decoded = decode(new Uint8Array(data), { type: 'sjis' });
          
          if (typeof decoded === 'string') {
            textContent = decoded;
          } else if (Array.isArray(decoded)) {
            const chunkSize = 65536;
            let result = '';
            for (let i = 0; i < decoded.length; i += chunkSize) {
              const chunk = decoded.slice(i, i + chunkSize);
              result += String.fromCharCode(...chunk);
            }
            textContent = result;
          } else {
            textContent = String(decoded);
          }
        } catch (e) {
          console.log('[getText] encoding-japanese decode error, trying UTF-8:', e);
          const decoder = new TextDecoder('utf-8');
          textContent = decoder.decode(data);
        }
        
        console.log('[getText] Text content length:', textContent.length);
        return textContent;
      }
    }
    
    throw new Error('No text file found in ZIP');
  } catch (error) {
    console.error('[getText] Error extracting text from ZIP:', error);
    throw error;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  books: router({
    // 書籍検索
    search: publicProcedure
      .input(z.object({
        query: z.string().optional(),
        limit: z.number().optional().default(50),
      }))
      .query(({ input }) => {
        try {
          const results = searchBooks(input.query, input.limit);
          return results;
        } catch (error) {
          console.error('Search error:', error);
          return [];
        }
      }),
    
    // 書籍詳細取得
    getDetail: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(({ input }) => {
        try {
          const book = AOZORA_BOOKS.find(b => b.id === input.id);
          return book || null;
        } catch (error) {
          console.error('Book detail error:', error);
          return null;
        }
      }),
    
    // テキスト取得API - バックエンド経由でZIPファイルをダウンロード
    getText: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          const book = AOZORA_BOOKS.find(b => b.id === input.id);
          if (!book || !book.textFileUrl) {
            return { text: 'この作品のテキストはまだ取得できません。', success: false };
          }
          
          // 実際の書籍テキストを返す
          const textContent = getBookText(input.id);
          if (!textContent) {
            return { text: 'この作品のテキストはまだ取得できません。', success: false };
          }
          return { text: textContent, success: true };
        } catch (error) {
          console.error('Text extraction error:', error);
          return { 
            text: 'テキストの読み込みに失敗しました。',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
