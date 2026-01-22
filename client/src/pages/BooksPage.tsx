import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, BookOpen, Loader2, ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, Type, Sun, Moon } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface BookItem {
  id: string;
  title: string;
  author: string;
  textUrl: string;
  cardUrl: string;
  releaseDate: string;
}

// フォントサイズの設定
const FONT_SIZES = [
  { label: '小', value: 14 },
  { label: '中', value: 18 },
  { label: '大', value: 22 },
  { label: '特大', value: 26 },
];

// 読書モードの設定
type ReadingMode = 'light' | 'dark';

const READING_MODES = {
  light: {
    label: 'ライト',
    icon: Sun,
    bg: 'bg-white',
    text: 'text-black',
    cardBg: 'bg-white',
    cardBorder: 'border-amber-200',
    headerBg: 'bg-amber-50/95',
    headerBorder: 'border-amber-200',
    pageBg: 'bg-gradient-to-b from-amber-50 to-orange-50',
  },
  dark: {
    label: 'ダーク',
    icon: Moon,
    bg: 'bg-gray-900',
    text: 'text-gray-100',
    cardBg: 'bg-gray-800',
    cardBorder: 'border-gray-700',
    headerBg: 'bg-gray-900/95',
    headerBorder: 'border-gray-700',
    pageBg: 'bg-gray-950',
  },
};

export default function BooksPage() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [fontSize, setFontSize] = useState(18); // デフォルトは「中」サイズ
  const [readingMode, setReadingMode] = useState<ReadingMode>('light'); // デフォルトはライトモード
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

  // フォントサイズを増減する関数
  const increaseFontSize = () => {
    const currentIndex = FONT_SIZES.findIndex(s => s.value === fontSize);
    if (currentIndex < FONT_SIZES.length - 1) {
      setFontSize(FONT_SIZES[currentIndex + 1].value);
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = FONT_SIZES.findIndex(s => s.value === fontSize);
    if (currentIndex > 0) {
      setFontSize(FONT_SIZES[currentIndex - 1].value);
    }
  };

  // 現在のフォントサイズラベルを取得
  const getCurrentFontSizeLabel = () => {
    const size = FONT_SIZES.find(s => s.value === fontSize);
    return size?.label || '中';
  };

  // 読書モードを切り替える関数
  const toggleReadingMode = () => {
    setReadingMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  // 現在のモード設定を取得
  const mode = READING_MODES[readingMode];
  const ModeIcon = mode.icon;

  // 書籍詳細ビュー
  if (selectedBook) {
    return (
      <div className={`min-h-screen ${mode.pageBg}`}>
        <div className={`sticky top-0 z-50 ${mode.headerBg} backdrop-blur border-b ${mode.headerBorder}`}>
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setSelectedBook(null)}
              className={readingMode === 'dark' 
                ? "border-gray-600 hover:bg-gray-700 text-gray-200" 
                : "border-amber-300 hover:bg-amber-100"
              }
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              検索に戻る
            </Button>

            <div className="flex items-center gap-3">
              {/* ライト/ダークモード切り替えボタン */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleReadingMode}
                className={`flex items-center gap-2 ${
                  readingMode === 'dark'
                    ? "border-gray-600 hover:bg-gray-700 text-gray-200"
                    : "border-amber-300 hover:bg-amber-100"
                }`}
              >
                <ModeIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{mode.label}</span>
              </Button>

              {/* フォントサイズ調整コントロール */}
              <div className={`flex items-center gap-2 rounded-full px-3 py-1 border shadow-sm ${
                readingMode === 'dark'
                  ? "bg-gray-800 border-gray-600"
                  : "bg-white border-amber-200"
              }`}>
                <Type className={`w-4 h-4 ${readingMode === 'dark' ? "text-gray-400" : "text-amber-600"}`} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={decreaseFontSize}
                  disabled={fontSize === FONT_SIZES[0].value}
                  className={`h-8 w-8 p-0 ${
                    readingMode === 'dark' ? "hover:bg-gray-700" : "hover:bg-amber-100"
                  }`}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className={`text-sm font-medium min-w-[3rem] text-center ${
                  readingMode === 'dark' ? "text-gray-200" : "text-amber-800"
                }`}>
                  {getCurrentFontSizeLabel()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={increaseFontSize}
                  disabled={fontSize === FONT_SIZES[FONT_SIZES.length - 1].value}
                  className={`h-8 w-8 p-0 ${
                    readingMode === 'dark' ? "hover:bg-gray-700" : "hover:bg-amber-100"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 左側：書籍情報 */}
            <div className="lg:col-span-1">
              <Card className={`sticky top-24 ${mode.cardBorder} ${mode.cardBg}`}>
                <CardHeader>
                  <CardTitle className={`text-xl ${readingMode === 'dark' ? "text-gray-100" : "text-amber-900"}`}>
                    {selectedBook.title}
                  </CardTitle>
                  <CardDescription className={readingMode === 'dark' ? "text-gray-400" : "text-amber-700"}>
                    {selectedBook.author}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className={`text-sm ${readingMode === 'dark' ? "text-gray-500" : "text-muted-foreground"}`}>公開日</p>
                    <p className={`font-semibold ${readingMode === 'dark' ? "text-gray-200" : ""}`}>
                      {selectedBook.releaseDate || '不明'}
                    </p>
                  </div>
                  {textQuery.data && (
                    <div>
                      <p className={`text-sm ${readingMode === 'dark' ? "text-gray-500" : "text-muted-foreground"}`}>文字数</p>
                      <p className={`font-semibold ${readingMode === 'dark' ? "text-gray-200" : ""}`}>
                        {textQuery.data.charCount.toLocaleString()}字
                      </p>
                    </div>
                  )}
                  {selectedBook.cardUrl && (
                    <a
                      href={selectedBook.cardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm hover:underline block mt-4 ${
                        readingMode === 'dark' ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      青空文庫で見る →
                    </a>
                  )}

                  {/* フォントサイズ調整（サイドバー版） */}
                  <div className={`pt-4 border-t ${readingMode === 'dark' ? "border-gray-700" : "border-amber-200"}`}>
                    <p className={`text-sm mb-2 ${readingMode === 'dark' ? "text-gray-500" : "text-muted-foreground"}`}>
                      文字サイズ
                    </p>
                    <div className="flex gap-1">
                      {FONT_SIZES.map((size) => (
                        <Button
                          key={size.value}
                          variant={fontSize === size.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFontSize(size.value)}
                          className={`flex-1 text-xs ${
                            fontSize === size.value 
                              ? readingMode === 'dark'
                                ? "bg-gray-600 hover:bg-gray-500"
                                : "bg-amber-600 hover:bg-amber-700"
                              : readingMode === 'dark'
                                ? "border-gray-600 hover:bg-gray-700 text-gray-300"
                                : "border-amber-300 hover:bg-amber-100"
                          }`}
                        >
                          {size.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 読書モード切り替え（サイドバー版） */}
                  <div className={`pt-4 border-t ${readingMode === 'dark' ? "border-gray-700" : "border-amber-200"}`}>
                    <p className={`text-sm mb-2 ${readingMode === 'dark' ? "text-gray-500" : "text-muted-foreground"}`}>
                      表示モード
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant={readingMode === 'light' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReadingMode('light')}
                        className={`flex-1 text-xs ${
                          readingMode === 'light'
                            ? "bg-amber-600 hover:bg-amber-700"
                            : "border-gray-600 hover:bg-gray-700 text-gray-300"
                        }`}
                      >
                        <Sun className="w-3 h-3 mr-1" />
                        ライト
                      </Button>
                      <Button
                        variant={readingMode === 'dark' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReadingMode('dark')}
                        className={`flex-1 text-xs ${
                          readingMode === 'dark'
                            ? "bg-gray-600 hover:bg-gray-500"
                            : "border-amber-300 hover:bg-amber-100"
                        }`}
                      >
                        <Moon className="w-3 h-3 mr-1" />
                        ダーク
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右側：テキスト表示 */}
            <div className="lg:col-span-3">
              <Card className={`${mode.cardBorder} ${mode.cardBg}`}>
                <CardContent className="p-8">
                  {textQuery.isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className={`w-8 h-8 animate-spin ${readingMode === 'dark' ? "text-gray-400" : "text-amber-600"}`} />
                      <span className={`ml-3 ${readingMode === 'dark' ? "text-gray-400" : "text-muted-foreground"}`}>
                        テキストを読み込み中...
                      </span>
                    </div>
                  ) : textQuery.error ? (
                    <div className="text-center py-20 text-red-500">
                      <p>テキストの読み込みに失敗しました</p>
                      <p className="text-sm mt-2">{textQuery.error.message}</p>
                    </div>
                  ) : textQuery.data ? (
                    <div 
                      className="prose max-w-none"
                      style={{
                        fontFamily: "'Noto Serif JP', 'Yu Mincho', serif",
                        fontSize: `${fontSize}px`,
                        lineHeight: "2",
                        whiteSpace: "pre-wrap",
                        color: readingMode === 'dark' ? "#e5e7eb" : "#000000",
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
