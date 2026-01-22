import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, BookOpen, Loader2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface BookItem {
  id: string;
  title: string;
  author: string;
  textUrl: string;
  cardUrl: string;
  releaseDate: string;
}

export default function BooksPage() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // 検索クエリのデバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 人気作品を取得（初期表示用）
  const popularQuery = trpc.books.popular.useQuery(
    { limit: 12 },
    { enabled: !debouncedKeyword }
  );

  // 検索結果を取得
  const searchQuery = trpc.books.search.useQuery(
    { 
      query: debouncedKeyword, 
      limit: ITEMS_PER_PAGE,
      offset: currentPage * ITEMS_PER_PAGE
    },
    { enabled: !!debouncedKeyword }
  );

  // テキスト取得
  const textQuery = trpc.books.getText.useQuery(
    { id: selectedBook?.id || "", textUrl: selectedBook?.textUrl || "" },
    { enabled: !!selectedBook }
  );

  // 表示するデータを決定
  const displayData = debouncedKeyword ? searchQuery.data : popularQuery.data;
  const books = displayData?.books || [];
  const total = debouncedKeyword ? (searchQuery.data?.total || 0) : books.length;
  const hasMore = debouncedKeyword ? (searchQuery.data?.hasMore || false) : false;
  const isLoading = debouncedKeyword ? searchQuery.isLoading : popularQuery.isLoading;

  // 書籍詳細ビュー
  if (selectedBook) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="sticky top-0 z-50 bg-amber-50/95 backdrop-blur border-b border-amber-200">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="outline"
              onClick={() => setSelectedBook(null)}
              className="border-amber-300 hover:bg-amber-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              検索に戻る
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 左側：書籍情報 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-xl text-amber-900">{selectedBook.title}</CardTitle>
                  <CardDescription className="text-amber-700">{selectedBook.author}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">公開日</p>
                    <p className="font-semibold">{selectedBook.releaseDate || '不明'}</p>
                  </div>
                  {textQuery.data && (
                    <div>
                      <p className="text-sm text-muted-foreground">文字数</p>
                      <p className="font-semibold">{textQuery.data.charCount.toLocaleString()}字</p>
                    </div>
                  )}
                  {selectedBook.cardUrl && (
                    <a
                      href={selectedBook.cardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline block mt-4"
                    >
                      青空文庫で見る →
                    </a>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 右側：テキスト表示 */}
            <div className="lg:col-span-3">
              <Card className="border-amber-200">
                <CardContent className="p-8">
                  {textQuery.isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                      <span className="ml-3 text-muted-foreground">テキストを読み込み中...</span>
                    </div>
                  ) : textQuery.error ? (
                    <div className="text-center py-20 text-red-500">
                      <p>テキストの読み込みに失敗しました</p>
                      <p className="text-sm mt-2">{textQuery.error.message}</p>
                    </div>
                  ) : textQuery.data ? (
                    <div 
                      className="prose prose-lg max-w-none text-amber-950"
                      style={{
                        fontFamily: "'Noto Serif JP', 'Yu Mincho', serif",
                        lineHeight: "2",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {textQuery.data.text}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 書籍検索ビュー
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-amber-900 mb-4">
            青空文庫リーダー
          </h1>
          <p className="text-amber-700 text-lg">
            {total > 0 ? `${total.toLocaleString()}件の作品から検索` : "日本の名作を無料で読もう"}
          </p>
        </div>

        {/* 検索バー */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600 w-5 h-5" />
            <Input
              type="text"
              placeholder="作品名や著者名で検索..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg rounded-full border-amber-200 focus:border-amber-400 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* ローディング */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            <span className="ml-3 text-muted-foreground">検索中...</span>
          </div>
        )}

        {/* 検索結果 */}
        {!isLoading && books.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <Card
                  key={book.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group border-amber-200"
                  onClick={() => setSelectedBook(book)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg group-hover:text-amber-700 transition-colors line-clamp-2">
                      {book.title}
                    </CardTitle>
                    <CardDescription>{book.author}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-amber-50 group-hover:border-amber-300"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      読む
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ページネーション */}
            {debouncedKeyword && total > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="border-amber-300"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  前へ
                </Button>
                <span className="text-muted-foreground">
                  {currentPage + 1} / {Math.ceil(total / ITEMS_PER_PAGE)} ページ
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!hasMore}
                  className="border-amber-300"
                >
                  次へ
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* 検索結果なし */}
        {!isLoading && debouncedKeyword && books.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              「{debouncedKeyword}」に一致する作品が見つかりませんでした
            </p>
          </div>
        )}

        {/* 初期表示（人気作品なし） */}
        {!isLoading && !debouncedKeyword && books.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              作品を検索してください
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
