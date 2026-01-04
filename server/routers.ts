import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";

// 書籍データベース
const books = [
  {
    id: 1,
    title: "羅生門",
    author: "芥川龍之介",
    description: "ある日の暮れ方、羅生門の下で雨宿りをしていた下人が、門の上で何かをしている老婆を見つけ、やがて自分の衣を脱ぎ捨てて逃げ去る。人間の本性と生存の本質を問う傑作。",
    year: 1915,
    characterCount: 3000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/127_ruby_150.zip"
  },
  {
    id: 2,
    title: "蜘蛛の糸",
    author: "芥川龍之介",
    description: "地獄の底で苦しむ男が、釈迦の慈悲により天国への道を示される。しかし、人間の欲望と利己心が、その道を断ち切ってしまう。",
    year: 1918,
    characterCount: 2000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/128_ruby_150.zip"
  },
  {
    id: 3,
    title: "杜子春",
    author: "芥川龍之介",
    description: "貧乏な青年・杜子春が、道士の力で莫大な財宝を得るが、やがてそれが幻であることに気づく。人生の本質と幸福について考えさせられる作品。",
    year: 1918,
    characterCount: 5000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/129_ruby_150.zip"
  },
  {
    id: 4,
    title: "地獄変",
    author: "芥川龍之介",
    description: "大殿様の命により、地獄の炎に包まれた牛車を描くことを強要された絵師が、自分の娘を生きたまま火に投じて、その絵を完成させる。",
    year: 1918,
    characterCount: 8000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/130_ruby_150.zip"
  },
  {
    id: 5,
    title: "河童",
    author: "芥川龍之介",
    description: "精神病院に入院している男が、自分は河童の国を訪れたと主張する。その国での奇想天外な経験を通じて、人間社会を風刺する。",
    year: 1927,
    characterCount: 15000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/131_ruby_150.zip"
  },
  {
    id: 6,
    title: "トロッコ",
    author: "芥川龍之介",
    description: "山道を走るトロッコに乗った少年たちが、人生の選択と責任について考えさせられる短編。",
    year: 1915,
    characterCount: 1500,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/132_ruby_150.zip"
  },
  {
    id: 7,
    title: "鼻",
    author: "芥川龍之介",
    description: "長い鼻を持つ僧侶が、その鼻を短くしてもらうことで、かえって苦しむようになるという皮肉な話。",
    year: 1916,
    characterCount: 2500,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/133_ruby_150.zip"
  },
  {
    id: 8,
    title: "芋粥",
    author: "芥川龍之介",
    description: "貴族の道長が、貧しい男に芋粥を食べさせるという古い伝説を題材にした作品。",
    year: 1916,
    characterCount: 3500,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/134_ruby_150.zip"
  }
];

// 書籍を検索する関数
function searchBooks(query: string): typeof books {
  if (!query.trim()) {
    return books;
  }
  
  const lowerQuery = query.toLowerCase();
  return books.filter(book =>
    book.title.toLowerCase().includes(lowerQuery) ||
    book.author.toLowerCase().includes(lowerQuery)
  );
}

// 実際のZIPファイルをダウンロードして解凍する関数
async function extractTextFromZip(zipUrl: string): Promise<string> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[getText] Fetching ZIP from: ${zipUrl} (attempt ${attempt}/${maxRetries})`);
      
      const response = await fetch(zipUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Referer": "https://www.aozora.gr.jp/"
        }
      });
      
      if (!response.ok) {
        const errorMsg = `HTTP ${response.status} ${response.statusText}`;
        console.warn(`[getText] Failed to fetch ZIP: ${errorMsg}`);
        lastError = new Error(`Failed to fetch ZIP file: ${errorMsg}`);
        
        // 401, 403, 404は再試行しない
        if ([401, 403, 404].includes(response.status)) {
          throw lastError;
        }
        
        // その他のエラーは再試行
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw lastError;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('[getText] ZIP file size:', arrayBuffer.byteLength);
      
      // JSZipでZIPを解凍
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      await zip.loadAsync(arrayBuffer);
      
      console.log('[getText] ZIP files:', Object.keys(zip.files));
      
      // テキストファイルを探す（.txtファイルを優先）
      let textContent = '';
      let foundFile = false;
      
      for (const [filename, file] of Object.entries(zip.files)) {
        if (filename.endsWith('.txt')) {
          console.log('[getText] Found text file:', filename);
          const data = await (file as any).async('arraybuffer');
          
          // Shift JISをUTF-8にデコード
          try {
            const EncodingJapanese = (await import('encoding-japanese')).default;
            const uint8Array = new Uint8Array(data);
            
            // encoding-japaneseで文字コード判定
            const detectedEncoding = EncodingJapanese.detect(uint8Array);
            console.log('[getText] Detected encoding:', detectedEncoding);
            
            // Shift-JISとして明示的にデコード
            const decoded = EncodingJapanese.convert(uint8Array, {
              to: 'UNICODE',
              from: 'SJIS'
            });
            
            if (Array.isArray(decoded)) {
              textContent = String.fromCharCode(...decoded);
            } else {
              textContent = String(decoded);
            }
            console.log('[getText] Successfully decoded with encoding-japanese');
          } catch (e) {
            console.log('[getText] encoding-japanese decode error:', e);
            // フォールバック：UTF-8として解釈
            const decoder = new TextDecoder('utf-8');
            textContent = decoder.decode(data);
          }
          
          foundFile = true;
          console.log('[getText] Text content length:', textContent.length);
          break;
        }
      }
      
      if (!foundFile) {
        throw new Error('No text file found in ZIP');
      }
      
      return textContent;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[getText] Error extracting text from ZIP (attempt ${attempt}/${maxRetries}):`, lastError);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw lastError;
    }
  }
  
  throw lastError || new Error('Failed to extract text from ZIP after retries');
}

// 書籍のテキストを取得する関数
async function getBookText(id: number): Promise<{ text: string }> {
  const book = books.find(b => b.id === id);
  if (!book) {
    throw new Error('Book not found');
  }
  
  try {
    const text = await extractTextFromZip(book.textFileUrl);
    return { text };
  } catch (error) {
    console.error('[getBookText] Error:', error);
    throw new Error(`Failed to get book text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const appRouter = router({
  books: router({
    search: publicProcedure
      .input(z.object({ query: z.string().optional(), limit: z.number().optional() }))
      .query(({ input }) => {
        const results = searchBooks(input.query || '');
        return results.slice(0, input.limit || 50);
      }),
    getText: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getBookText(input.id);
      }),
  }),

  system: router({
    notifyOwner: protectedProcedure
      .input(z.object({ title: z.string(), content: z.string() }))
      .mutation(async ({ input }) => {
        const success = await notifyOwner(input);
        return { success };
      }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const { COOKIE_NAME } = require("@shared/const");
      const { getSessionCookieOptions } = require("./_core/cookies");
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
