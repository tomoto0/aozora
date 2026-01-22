import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as iconv from "iconv-lite";
import AdmZip from "adm-zip";
import {
  addToBookshelf,
  removeFromBookshelf,
  getUserBookshelf,
  isInBookshelf,
  saveSummaryToBookshelf,
  getSummaryFromBookshelf,
  saveReadingProgress,
  getReadingProgress,
  getUserReadingHistory,
  deleteReadingProgress,
} from "./db";
import { invokeLLM } from "./_core/llm";

// 青空文庫の書籍データを格納する型
interface AozoraBook {
  id: string;
  title: string;
  titleYomi: string;
  author: string;
  authorYomi: string;
  textUrl: string;
  cardUrl: string;
  releaseDate: string;
}

// CSVデータをキャッシュする変数
let cachedBooks: AozoraBook[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

// CSVファイルのパス
const CSV_DIR = "/tmp/aozora_data";
const CSV_FILE = path.join(CSV_DIR, "list_person_all_extended_utf8.csv");
const ZIP_URL = "https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip";

// fetch APIを使用してファイルをダウンロードする関数
async function downloadFile(url: string): Promise<Buffer> {
  console.log("[Aozora] Downloading file from:", url);
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// CSVファイルをダウンロードして解凍する関数
async function downloadAndExtractCSV(): Promise<void> {
  try {
    // ディレクトリを作成
    if (!fs.existsSync(CSV_DIR)) {
      fs.mkdirSync(CSV_DIR, { recursive: true });
    }

    // ZIPファイルをダウンロード
    console.log("[Aozora] Downloading CSV ZIP from:", ZIP_URL);
    const zipBuffer = await downloadFile(ZIP_URL);
    
    // ZIPファイルを解凍
    console.log("[Aozora] Extracting CSV ZIP...");
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(CSV_DIR, true);
    
    console.log("[Aozora] CSV downloaded and extracted successfully");
  } catch (error) {
    console.error("[Aozora] Failed to download CSV:", error);
    throw error;
  }
}

// CSVの1行をパースする関数（ダブルクォートを考慮）
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたダブルクォート
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  
  return fields;
}

// CSVファイルを解析する関数
function parseCSV(content: string): AozoraBook[] {
  const lines = content.split("\n");
  const books: AozoraBook[] = [];
  const seen = new Set<string>();

  console.log("[Aozora] Parsing CSV, total lines:", lines.length);

  // ヘッダー行をスキップ
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const fields = parseCSVLine(line);

      // CSVフィールドインデックス（0-indexed）:
      // 0: 作品ID, 1: 作品名, 2: 作品名読み
      // 11: 公開日, 13: 図書カードURL
      // 15: 姓, 16: 名, 17: 姓読み, 18: 名読み
      // 45: テキストファイルURL
      const bookId = fields[0]?.replace(/"/g, "").trim();
      const title = fields[1]?.replace(/"/g, "").trim();
      const titleYomi = fields[2]?.replace(/"/g, "").trim() || "";
      const releaseDate = fields[11]?.replace(/"/g, "").trim() || "";
      const cardUrl = fields[13]?.replace(/"/g, "").trim() || "";
      const lastName = fields[15]?.replace(/"/g, "").trim() || "";
      const firstName = fields[16]?.replace(/"/g, "").trim() || "";
      const lastNameYomi = fields[17]?.replace(/"/g, "").trim() || "";
      const firstNameYomi = fields[18]?.replace(/"/g, "").trim() || "";
      const textUrl = fields[45]?.replace(/"/g, "").trim() || "";

      // 必須フィールドの検証
      if (!bookId || !title) {
        continue;
      }

      // テキストURLがない場合はスキップ
      if (!textUrl || !textUrl.startsWith("http")) {
        continue;
      }

      // 重複チェック（同じ作品IDは1回だけ追加）
      if (seen.has(bookId)) {
        continue;
      }

      seen.add(bookId);
      books.push({
        id: bookId,
        title: title,
        titleYomi: titleYomi,
        author: `${lastName}${firstName}`.trim() || "不明",
        authorYomi: `${lastNameYomi}${firstNameYomi}`.trim() || "",
        textUrl: textUrl,
        cardUrl: cardUrl,
        releaseDate: releaseDate,
      });
    } catch (e) {
      // パースエラーは無視して続行
      continue;
    }
  }

  console.log("[Aozora] Parsed books count:", books.length);
  return books;
}

// 青空文庫のデータを取得する関数
async function getAozoraBooks(): Promise<AozoraBook[]> {
  const now = Date.now();

  // キャッシュが有効な場合はキャッシュを返す
  if (cachedBooks && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log("[Aozora] Returning cached books:", cachedBooks.length);
    return cachedBooks;
  }

  // CSVファイルが存在しない場合はダウンロード
  if (!fs.existsSync(CSV_FILE)) {
    console.log("[Aozora] CSV file not found, downloading...");
    await downloadAndExtractCSV();
  }

  // CSVファイルを読み込む
  console.log("[Aozora] Reading CSV file:", CSV_FILE);
  const content = fs.readFileSync(CSV_FILE, "utf-8");
  cachedBooks = parseCSV(content);
  cacheTimestamp = now;

  console.log(`[Aozora] Loaded ${cachedBooks.length} books from CSV`);
  return cachedBooks;
}

// ZIPファイルからテキストを抽出する関数
async function extractTextFromZip(zipUrl: string): Promise<string> {
  try {
    // ZIPファイルをダウンロード
    console.log("[Aozora] Downloading ZIP from:", zipUrl);
    const zipBuffer = await downloadFile(zipUrl);
    
    // ファイルサイズを確認
    if (zipBuffer.length < 100) {
      throw new Error(`Downloaded file is too small: ${zipBuffer.length} bytes`);
    }
    
    // ZIPファイルを解凍
    console.log("[Aozora] Extracting ZIP...");
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    
    // テキストファイルを探す
    const txtEntry = zipEntries.find(entry => entry.entryName.endsWith(".txt"));
    
    if (!txtEntry) {
      throw new Error("No text file found in ZIP");
    }
    
    // テキストファイルを読み込む（バイナリとして）
    const buffer = txtEntry.getData();
    
    // Shift-JISからUTF-8に変換
    const text = iconv.decode(buffer, "Shift_JIS");
    
    console.log("[Aozora] Text extracted successfully, length:", text.length);
    return text;
    
  } catch (error) {
    console.error("[Aozora] extractTextFromZip error:", error);
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

  // 青空文庫の書籍検索・取得ルーター
  books: router({
    // 書籍検索
    search: publicProcedure
      .input(z.object({
        query: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const { query, limit, offset } = input;
        
        try {
          console.log("[Aozora] Search request:", { query, limit, offset });
          const allBooks = await getAozoraBooks();
          console.log("[Aozora] Total books available:", allBooks.length);
          
          let filteredBooks = allBooks;
          
          // 検索クエリがある場合はフィルタリング
          if (query && query.trim()) {
            const searchTerm = query.toLowerCase().trim();
            filteredBooks = allBooks.filter(book => 
              book.title.toLowerCase().includes(searchTerm) ||
              book.titleYomi.toLowerCase().includes(searchTerm) ||
              book.author.toLowerCase().includes(searchTerm) ||
              book.authorYomi.toLowerCase().includes(searchTerm)
            );
            console.log("[Aozora] Filtered books count:", filteredBooks.length);
          }
          
          // ページネーション
          const paginatedBooks = filteredBooks.slice(offset, offset + limit);
          
          return {
            books: paginatedBooks.map(book => ({
              id: book.id,
              title: book.title,
              author: book.author,
              textUrl: book.textUrl,
              cardUrl: book.cardUrl,
              releaseDate: book.releaseDate,
            })),
            total: filteredBooks.length,
            hasMore: offset + limit < filteredBooks.length,
          };
        } catch (error) {
          console.error("[Aozora] Search error:", error);
          throw new Error(`Failed to search books: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }),

    // 書籍テキスト取得
    getText: publicProcedure
      .input(z.object({
        id: z.string(),
        textUrl: z.string(),
      }))
      .query(async ({ input }) => {
        const { id, textUrl } = input;
        
        try {
          console.log(`[Aozora] Getting text for book ${id} from ${textUrl}`);
          
          if (!textUrl) {
            throw new Error("No text URL provided");
          }
          
          const text = await extractTextFromZip(textUrl);
          
          return {
            id,
            text,
            charCount: text.length,
          };
        } catch (error) {
          console.error("[Aozora] getText error:", error);
          throw new Error(`Failed to get book text: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }),

    // あらすじ生成（AI機能）
    generateSummary: publicProcedure
      .input(z.object({
        id: z.string(),
        title: z.string(),
        author: z.string(),
        text: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { id, title, author, text } = input;
        
        try {
          console.log(`[Aozora] Generating summary for book ${id}: ${title}`);
          
          // テキストが長すぎる場合は切り詰める（LLMのトークン制限を考慮）
          const maxTextLength = 15000;
          const truncatedText = text.length > maxTextLength 
            ? text.substring(0, maxTextLength) + "\n\n（以下省略）"
            : text;
          
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `あなたは日本文学の専門家です。与えられた作品の内容を読み、簡潔で魅力的なあらすじを日本語で生成してください。

ルール:
- あらすじは300～500文字程度でまとめてください
- 物語の主要なテーマやメッセージを含めてください
- ネタバレは避け、読者の興味を引くように書いてください
- 文学的な表現を使い、作品の雰囲気を伝えてください
- プレーンテキストで出力してください（マークダウン記法や特殊記号は使用しない）
- 段落を分けて読みやすくしてください`
              },
              {
                role: "user",
                content: `以下の作品のあらすじをプレーンテキストで生成してください。マークダウン記法（**や*など）は使用しないでください。\n\nタイトル: ${title}\n著者: ${author}\n\n本文:\n${truncatedText}`
              }
            ],
          });
          
          const summary = response.choices[0]?.message?.content;
          
          if (!summary || typeof summary !== "string") {
            throw new Error("あらすじの生成に失敗しました");
          }
          
          console.log(`[Aozora] Summary generated successfully for book ${id}`);
          
          return {
            id,
            title,
            author,
            summary: summary.trim(),
          };
        } catch (error) {
          console.error("[Aozora] generateSummary error:", error);
          throw new Error(`あらすじの生成に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }),

    // 人気作品を取得（初期表示用）
    popular: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(12),
      }))
      .query(async ({ input }) => {
        const { limit } = input;
        
        try {
          console.log("[Aozora] Getting popular books, limit:", limit);
          const allBooks = await getAozoraBooks();
          
          // 有名な著者の作品を優先的に表示
          const famousAuthors = [
            "芥川龍之介", "夏目漱石", "太宰治", "宮沢賢治", "森鷗外",
            "川端康成", "三島由紀夫", "谷崎潤一郎", "志賀直哉", "島崎藤村",
            "樋口一葉", "与謝野晶子", "正岡子規", "石川啄木", "中島敦",
            "坂口安吾", "織田作之助", "梶井基次郎", "堀辰雄", "横光利一"
          ];
          
          const popularBooks: AozoraBook[] = [];
          const seen = new Set<string>();
          
          // 有名著者の作品を追加
          for (const author of famousAuthors) {
            const authorBooks = allBooks.filter(b => b.author === author);
            for (const book of authorBooks) {
              if (!seen.has(book.id) && popularBooks.length < limit) {
                seen.add(book.id);
                popularBooks.push(book);
              }
            }
            if (popularBooks.length >= limit) break;
          }
          
          // 足りない場合は残りを追加
          if (popularBooks.length < limit) {
            for (const book of allBooks) {
              if (!seen.has(book.id) && popularBooks.length < limit) {
                seen.add(book.id);
                popularBooks.push(book);
              }
            }
          }
          
          console.log("[Aozora] Returning popular books:", popularBooks.length);
          
          return {
            books: popularBooks.map(book => ({
              id: book.id,
              title: book.title,
              author: book.author,
              textUrl: book.textUrl,
              cardUrl: book.cardUrl,
              releaseDate: book.releaseDate,
            })),
          };
        } catch (error) {
          console.error("[Aozora] popular error:", error);
          throw new Error(`Failed to get popular books: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }),
  }),

  // 本棚（お気に入り）ルーター
  bookshelf: router({
    // 本棚に追加
    add: protectedProcedure
      .input(z.object({
        bookId: z.string(),
        title: z.string(),
        author: z.string(),
        textUrl: z.string().optional(),
        cardUrl: z.string().optional(),
        releaseDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await addToBookshelf({
          userId: ctx.user.id,
          bookId: input.bookId,
          title: input.title,
          author: input.author,
          textUrl: input.textUrl || null,
          cardUrl: input.cardUrl || null,
          releaseDate: input.releaseDate || null,
        });
        return { success: true };
      }),

    // 本棚から削除
    remove: protectedProcedure
      .input(z.object({
        bookId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await removeFromBookshelf(ctx.user.id, input.bookId);
        return { success: true };
      }),

    // 本棚の一覧を取得
    list: protectedProcedure.query(async ({ ctx }) => {
      const books = await getUserBookshelf(ctx.user.id);
      return { books };
    }),

    // 作品が本棚に追加されているかチェック
    isAdded: protectedProcedure
      .input(z.object({
        bookId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const isAdded = await isInBookshelf(ctx.user.id, input.bookId);
        return { isAdded };
      }),

    // あらすじを本棚に保存
    saveSummary: protectedProcedure
      .input(z.object({
        bookId: z.string(),
        summary: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const success = await saveSummaryToBookshelf(ctx.user.id, input.bookId, input.summary);
        if (!success) {
          throw new Error("この作品は本棚に追加されていません。先に本棚に追加してください。");
        }
        return { success: true };
      }),

    // 本棚のあらすじを取得
    getSummary: protectedProcedure
      .input(z.object({
        bookId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const summary = await getSummaryFromBookshelf(ctx.user.id, input.bookId);
        return { summary };
      }),
  }),

  // 読書進捗ルーター
  progress: router({
    // 読書進捗を保存
    save: protectedProcedure
      .input(z.object({
        bookId: z.string(),
        title: z.string(),
        author: z.string(),
        textUrl: z.string().optional(),
        cardUrl: z.string().optional(),
        scrollPosition: z.number().min(0).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        await saveReadingProgress({
          userId: ctx.user.id,
          bookId: input.bookId,
          title: input.title,
          author: input.author,
          textUrl: input.textUrl || null,
          cardUrl: input.cardUrl || null,
          scrollPosition: input.scrollPosition,
        });
        return { success: true };
      }),

    // 特定の作品の読書進捗を取得
    get: protectedProcedure
      .input(z.object({
        bookId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const progress = await getReadingProgress(ctx.user.id, input.bookId);
        return { progress };
      }),

    // 読書履歴を取得
    history: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(20),
      }))
      .query(async ({ ctx, input }) => {
        const history = await getUserReadingHistory(ctx.user.id, input.limit);
        return { history };
      }),

    // 読書進捗を削除
    delete: protectedProcedure
      .input(z.object({
        bookId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await deleteReadingProgress(ctx.user.id, input.bookId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
