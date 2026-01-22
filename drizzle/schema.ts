import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 本棚テーブル - ユーザーがお気に入りに追加した作品を保存
 */
export const bookshelf = mysqlTable("bookshelf", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** 青空文庫の作品ID（作品番号_人物ID形式） */
  bookId: varchar("bookId", { length: 64 }).notNull(),
  /** 作品タイトル */
  title: varchar("title", { length: 512 }).notNull(),
  /** 著者名 */
  author: varchar("author", { length: 256 }).notNull(),
  /** テキストファイルURL */
  textUrl: text("textUrl"),
  /** 作品カードURL */
  cardUrl: text("cardUrl"),
  /** 公開日 */
  releaseDate: varchar("releaseDate", { length: 32 }),
  /** AI生成あらすじ */
  summary: text("summary"),
  /** あらすじ保存日時 */
  summaryCreatedAt: timestamp("summaryCreatedAt"),
  /** 追加日時 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Bookshelf = typeof bookshelf.$inferSelect;
export type InsertBookshelf = typeof bookshelf.$inferInsert;

/**
 * 読書進捗テーブル - ユーザーの読書位置を保存
 */
export const readingProgress = mysqlTable("reading_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** 青空文庫の作品ID */
  bookId: varchar("bookId", { length: 64 }).notNull(),
  /** 作品タイトル（表示用） */
  title: varchar("title", { length: 512 }).notNull(),
  /** 著者名（表示用） */
  author: varchar("author", { length: 256 }).notNull(),
  /** テキストファイルURL */
  textUrl: text("textUrl"),
  /** 作品カードURL */
  cardUrl: text("cardUrl"),
  /** スクロール位置（パーセント） */
  scrollPosition: int("scrollPosition").default(0).notNull(),
  /** 最後に読んだ日時 */
  lastReadAt: timestamp("lastReadAt").defaultNow().notNull(),
  /** 作成日時 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新日時 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReadingProgress = typeof readingProgress.$inferSelect;
export type InsertReadingProgress = typeof readingProgress.$inferInsert;
