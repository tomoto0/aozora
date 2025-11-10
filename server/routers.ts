import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// ダミーデータ（フォールバック用）
const DUMMY_BOOKS = [
  {
    id: 1,
    title: "羅生門",
    author: "芥川龍之介",
    description: "ある日の暮れ方、羅生門の下で雨宿りをしていた下人が、門の上で何かをしている老婆を見つけ、やがて自分の衣を脱ぎ捨てて逃げ去る。人間の本性と生存の本質を問う傑作。",
    year: 1915,
    characterCount: 3000,
    textFileUrl: null
  },
  {
    id: 2,
    title: "蜘蛛の糸",
    author: "芥川龍之介",
    description: "地獄の底で苦しむ男が、釈迦の慈悲により天国への道を示される。しかし、人間の欲望と利己心が、その道を断ち切ってしまう。",
    year: 1918,
    characterCount: 2000,
    textFileUrl: null
  },
  {
    id: 3,
    title: "杜子春",
    author: "芥川龍之介",
    description: "貧乏な青年・杜子春が、道士の力で莫大な財宝を得るが、やがてそれが幻であることに気づく。人生の本質と幸福について考えさせられる作品。",
    year: 1918,
    characterCount: 5000,
    textFileUrl: null
  },
  {
    id: 4,
    title: "地獄変",
    author: "芥川龍之介",
    description: "大殿様の命により、地獄の炎に包まれた牛車を描くことを強要された絵師が、自分の娘を生きたまま火に投じて、その絵を完成させる。",
    year: 1918,
    characterCount: 8000,
    textFileUrl: null
  },
  {
    id: 5,
    title: "河童",
    author: "芥川龍之介",
    description: "精神病院に入院している男が、自分は河童の国を訪れたと主張する。その国での奇想天外な経験を通じて、人間社会を風刺する。",
    year: 1927,
    characterCount: 15000,
    textFileUrl: null
  }
];

// 青空文庫APIからデータを取得する関数
async function fetchAozoraBooks(keyword: string = '', limit: number = 50) {
  try {
    // 青空文庫のAPIエンドポイント
    const apiUrl = 'https://api.aozora.gr.jp/search';
    
    // クエリパラメータを構築
    const params = new URLSearchParams();
    if (keyword) {
      params.append('q', keyword);
    }
    params.append('limit', Math.min(limit, 100).toString());
    
    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AozoraReader/1.0'
      }
    });

    if (!response.ok) {
      console.warn(`Aozora API returned status ${response.status}, using dummy data`);
      return DUMMY_BOOKS;
    }

    const data = await response.json();
    
    // APIレスポンスを標準形式に変換
    if (Array.isArray(data)) {
      return data.slice(0, limit).map((book: any) => ({
        id: book.id || book.ndc_code || Math.random(),
        title: book.title || 'Unknown',
        author: book.author || 'Unknown',
        description: book.description || book.summary || '',
        year: book.release_date ? new Date(book.release_date).getFullYear() : null,
        characterCount: book.character_count || 0,
        textFileUrl: book.text_url || null
      }));
    }
    
    return DUMMY_BOOKS;
  } catch (error) {
    console.error('Failed to fetch from Aozora API:', error);
    // APIエラーの場合はダミーデータを返す
    return DUMMY_BOOKS;
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
    search: publicProcedure
      .input(z.object({
        keyword: z.string().optional().default(''),
        limit: z.number().optional().default(50),
        after: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          // 実際の青空文庫APIからデータを取得
          const books = await fetchAozoraBooks(input.keyword, input.limit);
          return { books };
        } catch (error) {
          console.error('Books search error:', error);
          // エラーの場合はダミーデータを返す
          return { books: DUMMY_BOOKS.slice(0, input.limit) };
        }
      }),
    
    getDetail: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          const books = await fetchAozoraBooks('', 100);
          const book = books.find(b => b.id === input.id);
          return book || null;
        } catch (error) {
          console.error('Book detail error:', error);
          return DUMMY_BOOKS.find(b => b.id === input.id) || null;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
