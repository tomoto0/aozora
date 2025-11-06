import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

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
        keyword: z.string().optional(),
        limit: z.number().optional().default(10),
        after: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          const params = new URLSearchParams();
          if (input.keyword) params.append('作品名', input.keyword);
          params.append('limit', input.limit.toString());
          if (input.after) params.append('after', input.after);
          
          const response = await fetch(`https://api.bungomail.com/v0/books?${params}`);
          if (!response.ok) throw new Error(`API error: ${response.statusText}`);
          return await response.json();
        } catch (error) {
          console.error('Books search error:', error);
          throw error;
        }
      }),
    
    getDetail: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          const response = await fetch(`https://api.bungomail.com/v0/books/${input.id}`);
          if (!response.ok) throw new Error(`API error: ${response.statusText}`);
          return await response.json();
        } catch (error) {
          console.error('Book detail error:', error);
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

