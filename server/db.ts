import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, bookshelf, readingProgress, InsertBookshelf, InsertReadingProgress } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// =====================
// 本棚（お気に入り）機能
// =====================

/** 本棚に作品を追加 */
export async function addToBookshelf(data: InsertBookshelf): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 既に追加されているかチェック
  const existing = await db
    .select()
    .from(bookshelf)
    .where(and(eq(bookshelf.userId, data.userId), eq(bookshelf.bookId, data.bookId)))
    .limit(1);

  if (existing.length > 0) {
    // 既に存在する場合は何もしない
    return;
  }

  await db.insert(bookshelf).values(data);
}

/** 本棚から作品を削除 */
export async function removeFromBookshelf(userId: number, bookId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(bookshelf).where(and(eq(bookshelf.userId, userId), eq(bookshelf.bookId, bookId)));
}

/** ユーザーの本棚を取得 */
export async function getUserBookshelf(userId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(bookshelf)
    .where(eq(bookshelf.userId, userId))
    .orderBy(desc(bookshelf.createdAt));
}

/** 作品が本棚に追加されているかチェック */
export async function isInBookshelf(userId: number, bookId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    return false;
  }

  const result = await db
    .select()
    .from(bookshelf)
    .where(and(eq(bookshelf.userId, userId), eq(bookshelf.bookId, bookId)))
    .limit(1);

  return result.length > 0;
}

// =====================
// 読書進捗機能
// =====================

/** 読書進捗を保存/更新 */
export async function saveReadingProgress(data: InsertReadingProgress): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 既存の進捗をチェック
  const existing = await db
    .select()
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, data.userId), eq(readingProgress.bookId, data.bookId)))
    .limit(1);

  if (existing.length > 0) {
    // 更新
    await db
      .update(readingProgress)
      .set({
        scrollPosition: data.scrollPosition,
        lastReadAt: new Date(),
      })
      .where(and(eq(readingProgress.userId, data.userId), eq(readingProgress.bookId, data.bookId)));
  } else {
    // 新規作成
    await db.insert(readingProgress).values({
      ...data,
      lastReadAt: new Date(),
    });
  }
}

/** ユーザーの読書進捗を取得 */
export async function getReadingProgress(userId: number, bookId: string) {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const result = await db
    .select()
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/** ユーザーの全読書履歴を取得（最近読んだ順） */
export async function getUserReadingHistory(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.userId, userId))
    .orderBy(desc(readingProgress.lastReadAt))
    .limit(limit);
}

/** 読書進捗を削除 */
export async function deleteReadingProgress(userId: number, bookId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(readingProgress).where(and(eq(readingProgress.userId, userId), eq(readingProgress.bookId, bookId)));
}
