import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import * as iconv from "iconv-lite";

const execAsync = promisify(exec);

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

// CSVファイルをダウンロードして解凍する関数
async function downloadAndExtractCSV(): Promise<void> {
  try {
    // ディレクトリを作成
    if (!fs.existsSync(CSV_DIR)) {
      fs.mkdirSync(CSV_DIR, { recursive: true });
    }

    const zipPath = path.join(CSV_DIR, "aozora_list.zip");
    
    // ZIPファイルをダウンロード
    console.log("[Aozora] Downloading CSV from:", ZIP_URL);
    await execAsync(`curl -s "${ZIP_URL}" -o "${zipPath}"`);
    
    // 解凍
    console.log("[Aozora] Extracting CSV...");
    await execAsync(`cd "${CSV_DIR}" && unzip -o "${zipPath}"`);
    
    console.log("[Aozora] CSV downloaded and extracted successfully");
  } catch (error) {
    console.error("[Aozora] Failed to download CSV:", error);
    throw error;
  }
}

// CSVファイルを解析する関数
function parseCSV(content: string): AozoraBook[] {
  const lines = content.split("\n");
  const books: AozoraBook[] = [];
  const seen = new Set<string>();

  // ヘッダー行をスキップ
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSVパース（ダブルクォートを考慮）
    const fields: string[] = [];
    let field = "";
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(field);
        field = "";
      } else {
        field += char;
      }
    }
    fields.push(field);

    // 必要なフィールドを抽出
    // 0: 作品ID, 1: 作品名, 2: 作品名読み, 15: 姓, 16: 名, 17: 姓読み, 18: 名読み
    // 43: テキストファイルURL, 13: 図書カードURL, 11: 公開日
    const bookId = fields[0]?.replace(/"/g, "");
    const title = fields[1]?.replace(/"/g, "");
    const titleYomi = fields[2]?.replace(/"/g, "");
    const lastName = fields[15]?.replace(/"/g, "") || "";
    const firstName = fields[16]?.replace(/"/g, "") || "";
    const lastNameYomi = fields[17]?.replace(/"/g, "") || "";
    const firstNameYomi = fields[18]?.replace(/"/g, "") || "";
    const textUrl = fields[45]?.replace(/"/g, "") || "";
    const cardUrl = fields[13]?.replace(/"/g, "") || "";
    const releaseDate = fields[11]?.replace(/"/g, "") || "";

    // 重複チェック（同じ作品IDは1回だけ追加）
    if (bookId && title && textUrl && !seen.has(bookId)) {
      seen.add(bookId);
      books.push({
        id: bookId,
        title: title,
        titleYomi: titleYomi || "",
        author: `${lastName}${firstName}`.trim() || "不明",
        authorYomi: `${lastNameYomi}${firstNameYomi}`.trim() || "",
        textUrl: textUrl,
        cardUrl: cardUrl,
        releaseDate: releaseDate,
      });
    }
  }

  return books;
}

// 青空文庫のデータを取得する関数
async function getAozoraBooks(): Promise<AozoraBook[]> {
  const now = Date.now();

  // キャッシュが有効な場合はキャッシュを返す
  if (cachedBooks && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedBooks;
  }

  // CSVファイルが存在しない場合はダウンロード
  if (!fs.existsSync(CSV_FILE)) {
    await downloadAndExtractCSV();
  }

  // CSVファイルを読み込む
  const content = fs.readFileSync(CSV_FILE, "utf-8");
  cachedBooks = parseCSV(content);
  cacheTimestamp = now;

  console.log(`[Aozora] Loaded ${cachedBooks.length} books from CSV`);
  return cachedBooks;
}

// ZIPファイルからテキストを抽出する関数
async function extractTextFromZip(zipUrl: string): Promise<string> {
  const tempDir = `/tmp/aozora_${Date.now()}`;
  
  try {
    // 一時ディレクトリを作成
    fs.mkdirSync(tempDir, { recursive: true });
    
    const zipPath = path.join(tempDir, "book.zip");
    
    // ZIPファイルをダウンロード
    console.log("[Aozora] Downloading ZIP from:", zipUrl);
    const { stderr } = await execAsync(
      `curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${zipUrl}" -o "${zipPath}"`,
      { timeout: 30000 }
    );
    
    if (stderr) {
      console.error("[Aozora] curl stderr:", stderr);
    }
    
    // ファイルサイズを確認
    const stats = fs.statSync(zipPath);
    if (stats.size < 100) {
      throw new Error(`Downloaded file is too small: ${stats.size} bytes`);
    }
    
    // ZIPファイルを解凍
    console.log("[Aozora] Extracting ZIP...");
    await execAsync(`cd "${tempDir}" && unzip -o "${zipPath}"`, { timeout: 10000 });
    
    // テキストファイルを探す
    const files = fs.readdirSync(tempDir);
    const txtFile = files.find(f => f.endsWith(".txt"));
    
    if (!txtFile) {
      throw new Error("No text file found in ZIP");
    }
    
    // テキストファイルを読み込む（バイナリとして）
    const txtPath = path.join(tempDir, txtFile);
    const buffer = fs.readFileSync(txtPath);
    
    // Shift-JISからUTF-8に変換
    const text = iconv.decode(buffer, "Shift_JIS");
    
    console.log("[Aozora] Text extracted successfully, length:", text.length);
    return text;
    
  } finally {
    // 一時ディレクトリを削除
    try {
      await execAsync(`rm -rf "${tempDir}"`);
    } catch (e) {
      console.error("[Aozora] Failed to cleanup temp dir:", e);
    }
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
          const allBooks = await getAozoraBooks();
          
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
          throw new Error("Failed to search books");
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

    // 人気作品を取得（初期表示用）
    popular: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(12),
      }))
      .query(async ({ input }) => {
        const { limit } = input;
        
        try {
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
          throw new Error("Failed to get popular books");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
