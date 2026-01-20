import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import * as Encoding from "encoding-japanese";
import { execSync } from "child_process";
import iconv from "iconv-lite";

// 青空文庫の書籍データ（実際のZIPファイルURL付き）
const BOOKS_DATABASE = [
  {
    id: "000879",
    title: "羅生門",
    author: "芥川龍之介",
    description: "京都羅生門の下で、老婆が死人の髪を抜いている場面に出くわした下人。",
    year: 1915,
    characterCount: 8000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/127_ruby_150.zip"
  },
  {
    id: "000879-2",
    title: "蜘蛛の糸",
    author: "芥川龍之介",
    description: "地獄の底で苦しむ犍陀多が、天上の蜘蛛の糸を見つけた。",
    year: 1918,
    characterCount: 5000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/128_ruby_150.zip"
  },
  {
    id: "000879-3",
    title: "杜子春",
    author: "芥川龍之介",
    description: "唐の時代、貧乏な杜子春が仙人に会い、不思議な体験をする。",
    year: 1920,
    characterCount: 12000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/129_ruby_150.zip"
  },
  {
    id: "000879-4",
    title: "地獄変",
    author: "芥川龍之介",
    description: "平安時代の絵師が、地獄の炎の中で娘を焼く場面を描く。",
    year: 1918,
    characterCount: 15000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/130_ruby_150.zip"
  },
  {
    id: "000879-5",
    title: "河童",
    author: "芥川龍之介",
    description: "河童の国へ迷い込んだ男の冒険と、その国の文化について。",
    year: 1927,
    characterCount: 20000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/131_ruby_150.zip"
  },
  {
    id: "000879-6",
    title: "トロッコ",
    author: "芥川龍之介",
    description: "少年が鉱山のトロッコに乗る冒険をする短編。",
    year: 1922,
    characterCount: 4000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/132_ruby_150.zip"
  },
  {
    id: "000879-7",
    title: "鼻",
    author: "芥川龍之介",
    description: "長い鼻を持つ和尚が、その鼻をめぐる悲喜劇。",
    year: 1916,
    characterCount: 6000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/133_ruby_150.zip"
  },
  {
    id: "000879-8",
    title: "芋粥",
    author: "芥川龍之介",
    description: "貴族の男が、夢の中で芋粥を食べる不思議な話。",
    year: 1916,
    characterCount: 7000,
    textFileUrl: "https://www.aozora.gr.jp/cards/000879/files/134_ruby_150.zip"
  }
];

// 書籍検索関数
function searchBooks(query: string): typeof BOOKS_DATABASE {
  const lowerQuery = query.toLowerCase();
  return BOOKS_DATABASE.filter(book =>
    book.title.toLowerCase().includes(lowerQuery) ||
    book.author.toLowerCase().includes(lowerQuery) ||
    book.description.toLowerCase().includes(lowerQuery)
  );
}

// ファイルをダウンロードする関数
function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    
    const request = protocol.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // リダイレクト対応
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      response.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      response.on("error", reject);
    });

    request.on("error", reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error("Download timeout"));
    });
  });
}

// ZIPファイルからテキストを抽出する関数（簡易版）
async function extractTextFromZip(zipUrl: string): Promise<string> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[extractTextFromZip] Downloading ZIP from: ${zipUrl} (attempt ${attempt}/${maxRetries})`);

      // ZIPファイルをダウンロード
      const zipBuffer = await downloadFile(zipUrl);
      console.log(`[extractTextFromZip] Downloaded ${zipBuffer.length} bytes`);

      // 一時ファイルに保存
      const tempZipPath = path.join("/tmp", `book_${Date.now()}_${Math.random()}.zip`);
      fs.writeFileSync(tempZipPath, zipBuffer);
      console.log(`[extractTextFromZip] Saved to: ${tempZipPath}`);

      // unzip コマンドで解凍
      const tempDir = path.join("/tmp", `book_${Date.now()}_${Math.random()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        execSync(`unzip -q "${tempZipPath}" -d "${tempDir}"`, { stdio: "pipe" });
      } catch (e) {
        console.error("[extractTextFromZip] unzip failed:", e);
        throw new Error("Failed to unzip file");
      }

      // テキストファイルを探す
      const files = fs.readdirSync(tempDir);
      let textContent = "";
      let foundFile = false;

      for (const file of files) {
        if (file.endsWith(".txt")) {
          console.log(`[extractTextFromZip] Found text file: ${file}`);
          foundFile = true;
          
          const filePath = path.join(tempDir, file);
          const buffer = fs.readFileSync(filePath);
          
          // Shift-JIS をUTF-8に変換
          try {
            // iconv-liteを使用してShift-JISをUTF-8に変換
            textContent = iconv.decode(buffer, "shift_jis");
            console.log(`[extractTextFromZip] Successfully decoded from Shift-JIS`);
            console.log(`[extractTextFromZip] Text content length: ${textContent.length}`);
          } catch (decodeError) {
            console.error(`[extractTextFromZip] Decode error:`, decodeError);
            // フォールバック: UTF-8として解釈
            textContent = buffer.toString("utf-8");
          }
          
          break;
        }
      }

      // クリーンアップ
      try {
        execSync(`rm -rf "${tempDir}" "${tempZipPath}"`, { stdio: "pipe" });
      } catch (e) {
        // 無視
      }

      if (!foundFile) {
        throw new Error("No text file found in ZIP");
      }

      if (!textContent) {
        throw new Error("Failed to extract text content");
      }

      return textContent;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[extractTextFromZip] Error (attempt ${attempt}/${maxRetries}):`, lastError);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
    }
  }

  throw lastError || new Error("Failed to extract text from ZIP after retries");
}

// 書籍のテキストを取得する関数
async function getBookText(bookId: string): Promise<{ text: string }> {
  try {
    const book = BOOKS_DATABASE.find(b => b.id === bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    console.log(`[getBookText] Fetching text for book: ${book.title}`);
    const text = await extractTextFromZip(book.textFileUrl);
    return { text };
  } catch (error) {
    console.error("[getBookText] Error:", error);
    throw new Error(`Failed to get book text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const appRouter = router({
  books: router({
    search: publicProcedure
      .input(z.object({ query: z.string().optional(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        if (!input.query || input.query.trim() === "") {
          return [];
        }
        const results = searchBooks(input.query);
        return results;
      }),
    getText: publicProcedure
      .input(z.object({ id: z.string() }))
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
