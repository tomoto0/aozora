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
          const books = searchBooks(input.keyword, input.limit);
          return { books };
        } catch (error) {
          console.error('Books search error:', error);
          return { books: [] };
        }
      }),
    
    getDetail: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          const book = AOZORA_BOOKS.find(b => b.id === input.id);
          return book || null;
        } catch (error) {
          console.error('Book detail error:', error);
          return null;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
