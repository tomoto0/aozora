import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, BookOpen, Loader2, ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, Type, Sun, Moon, Heart, Library, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Link, useLocation, useSearch } from 'wouter';
import { toast } from 'sonner';

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
  const { isAuthenticated } = useAuth();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [readingMode, setReadingMode] = useState<ReadingMode>('light');
  const [initialScrollRestored, setInitialScrollRestored] = useState(false);
  const ITEMS_PER_PAGE = 20;
  
  const textContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // URLパラメータから本を開く
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const readBookId = params.get('read');
    const textUrl = params.get('textUrl');
    
    if (readBookId && textUrl) {
      // URLパラメータから本の情報を復元
      setSelectedBook({
        id: readBookId,
        title: '',
        author: '',
        textUrl: decodeURIComponent(textUrl),
        cardUrl: '',
        releaseDate: '',
      });
      // URLパラメータをクリア
      setLocation('/books', { replace: true });
    }
  }, [searchParams, setLocation]);

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

  // 本棚に追加されているかチェック
  const isInBookshelfQuery = trpc.bookshelf.isAdded.useQuery(
    { bookId: selectedBook?.id || "" },
    { enabled: !!selectedBook && isAuthenticated }
  );

  // 読書進捗を取得
  const progressQuery = trpc.progress.get.useQuery(
    { bookId: selectedBook?.id || "" },
    { enabled: !!selectedBook && isAuthenticated }
  );

  // 本棚に追加
  const addToBookshelfMutation = trpc.bookshelf.add.useMutation({
    onSuccess: () => {
      toast.success('本棚に追加しました');
      utils.bookshelf.isAdded.invalidate({ bookId: selectedBook?.id || "" });
      utils.bookshelf.list.invalidate();
    },
    onError: (error) => {
      toast.error(`追加に失敗しました: ${error.message}`);
    },
  });

  // 本棚から削除
  const removeFromBookshelfMutation = trpc.bookshelf.remove.useMutation({
    onSuccess: () => {
      toast.success('本棚から削除しました');
      utils.bookshelf.isAdded.invalidate({ bookId: selectedBook?.id || "" });
      utils.bookshelf.list.invalidate();
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  // 読書進捗を保存
  const saveProgressMutation = trpc.progress.save.useMutation({
    onError: (error) => {
      console.error('Failed to save progress:', error);
    },
  });

  // スクロール位置を保存する関数
  const saveScrollPosition = useCallback(() => {
    if (!selectedBook || !isAuthenticated || !textContainerRef.current) return;
    
    const container = textContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const scrollPercent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
    
    saveProgressMutation.mutate({
      bookId: selectedBook.id,
      title: selectedBook.title || textQuery.data?.id || '',
      author: selectedBook.author || '',
      textUrl: selectedBook.textUrl,
      cardUrl: selectedBook.cardUrl,
      scrollPosition: scrollPercent,
    });
  }, [selectedBook, isAuthenticated, saveProgressMutation, textQuery.data]);

  // スクロールイベントでデバウンスして保存
  useEffect(() => {
    if (!selectedBook || !isAuthenticated || !textContainerRef.current) return;
    
    const container = textContainerRef.current;
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(saveScrollPosition, 1000); // 1秒後に保存
    };
    
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [selectedBook, isAuthenticated, saveScrollPosition]);

  // テキスト読み込み完了後に読書進捗を復元
  useEffect(() => {
    const progress = progressQuery.data?.progress;
    if (
      textQuery.data &&
      progress &&
      textContainerRef.current &&
      !initialScrollRestored
    ) {
      const container = textContainerRef.current;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const targetScroll = (progress.scrollPosition / 100) * scrollHeight;
      
      // 少し遅延を入れてスクロール
      setTimeout(() => {
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
        setInitialScrollRestored(true);
        if (progress.scrollPosition > 0) {
          toast.info(`前回の続き（${progress.scrollPosition}%）から再開します`);
        }
      }, 100);
    }
  }, [textQuery.data, progressQuery.data, initialScrollRestored]);

  // 本を閉じる時に進捗をリセット
  useEffect(() => {
    if (!selectedBook) {
      setInitialScrollRestored(false);
    }
  }, [selectedBook]);

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

  // 本棚に追加/削除
  const handleToggleBookshelf = () => {
    if (!selectedBook || !isAuthenticated) return;
    
    if (isInBookshelfQuery.data?.isAdded) {
      removeFromBookshelfMutation.mutate({ bookId: selectedBook.id });
    } else {
      addToBookshelfMutation.mutate({
        bookId: selectedBook.id,
        title: selectedBook.title,
        author: selectedBook.author,
        textUrl: selectedBook.textUrl,
        cardUrl: selectedBook.cardUrl,
        releaseDate: selectedBook.releaseDate,
      });
    }
  };

  // 現在のモード設定を取得
  const mode = READING_MODES[readingMode];
  const ModeIcon = mode.icon;
  const isInBookshelf = isInBookshelfQuery.data?.isAdded || false;

  // 書籍詳細ビュー
  if (selectedBook) {
    return (
      <div className={`min-h-screen ${mode.pageBg}`}>
        <div className={`sticky top-0 z-50 ${mode.headerBg} backdrop-blur border-b ${mode.headerBorder}`}>
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                saveScrollPosition(); // 閉じる前に保存
                setSelectedBook(null);
              }}
              className={readingMode === 'dark' 
                ? "border-gray-600 hover:bg-gray-700 text-gray-200" 
                : "border-amber-300 hover:bg-amber-100"
              }
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              検索に戻る
            </Button>

            <div className="flex items-center gap-3">
              {/* 本棚ボタン */}
              {isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleBookshelf}
                  disabled={addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending}
                  className={`flex items-center gap-2 ${
                    isInBookshelf
                      ? readingMode === 'dark'
                        ? "bg-red-900/50 border-red-700 text-red-300 hover:bg-red-800/50"
                        : "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
                      : readingMode === 'dark'
                        ? "border-gray-600 hover:bg-gray-700 text-gray-200"
                        : "border-amber-300 hover:bg-amber-100"
                  }`}
                >
                  {addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart className={`w-4 h-4 ${isInBookshelf ? "fill-current" : ""}`} />
                  )}
                  <span className="hidden sm:inline">
                    {isInBookshelf ? "本棚から削除" : "本棚に追加"}
                  </span>
                </Button>
              )}

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
                    {selectedBook.title || textQuery.data?.id || '読み込み中...'}
                  </CardTitle>
                  <CardDescription className={readingMode === 'dark' ? "text-gray-400" : "text-amber-700"}>
                    {selectedBook.author || ''}
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

                  {/* 本棚に追加ボタン（サイドバー版） */}
                  {isAuthenticated && (
                    <div className={`pt-4 border-t ${readingMode === 'dark' ? "border-gray-700" : "border-amber-200"}`}>
                      <Button
                        variant={isInBookshelf ? "default" : "outline"}
                        className={`w-full ${
                          isInBookshelf
                            ? readingMode === 'dark'
                              ? "bg-red-900/50 hover:bg-red-800/50 text-red-300"
                              : "bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
                            : readingMode === 'dark'
                              ? "border-gray-600 hover:bg-gray-700 text-gray-300"
                              : "border-amber-300 hover:bg-amber-100"
                        }`}
                        onClick={handleToggleBookshelf}
                        disabled={addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending}
                      >
                        {addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Heart className={`w-4 h-4 mr-2 ${isInBookshelf ? "fill-current" : ""}`} />
                        )}
                        {isInBookshelf ? "本棚から削除" : "本棚に追加"}
                      </Button>
                    </div>
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
                <CardContent 
                  ref={textContainerRef}
                  className="p-8 max-h-[80vh] overflow-y-auto"
                >
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
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-amber-900 mb-4">
              青空文庫リーダー
            </h1>
            <p className="text-amber-700 text-lg">
              {total > 0 ? `${total.toLocaleString()}件の作品から検索` : "日本の名作を無料で読もう"}
            </p>
          </div>
          {isAuthenticated && (
            <Link href="/bookshelf">
              <Button variant="outline" className="border-amber-300 hover:bg-amber-100">
                <Library className="w-4 h-4 mr-2" />
                本棚
              </Button>
            </Link>
          )}
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
                <BookCard 
                  key={book.id} 
                  book={book} 
                  onSelect={setSelectedBook}
                  isAuthenticated={isAuthenticated}
                />
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

// 書籍カードコンポーネント
function BookCard({ 
  book, 
  onSelect,
  isAuthenticated
}: { 
  book: BookItem; 
  onSelect: (book: BookItem) => void;
  isAuthenticated: boolean;
}) {
  const utils = trpc.useUtils();
  
  // 本棚に追加されているかチェック
  const isInBookshelfQuery = trpc.bookshelf.isAdded.useQuery(
    { bookId: book.id },
    { enabled: isAuthenticated }
  );

  // 本棚に追加
  const addToBookshelfMutation = trpc.bookshelf.add.useMutation({
    onSuccess: () => {
      toast.success('本棚に追加しました');
      utils.bookshelf.isAdded.invalidate({ bookId: book.id });
      utils.bookshelf.list.invalidate();
    },
    onError: (error) => {
      toast.error(`追加に失敗しました: ${error.message}`);
    },
  });

  // 本棚から削除
  const removeFromBookshelfMutation = trpc.bookshelf.remove.useMutation({
    onSuccess: () => {
      toast.success('本棚から削除しました');
      utils.bookshelf.isAdded.invalidate({ bookId: book.id });
      utils.bookshelf.list.invalidate();
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  const isInBookshelf = isInBookshelfQuery.data?.isAdded || false;
  const isPending = addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending;

  const handleToggleBookshelf = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInBookshelf) {
      removeFromBookshelfMutation.mutate({ bookId: book.id });
    } else {
      addToBookshelfMutation.mutate({
        bookId: book.id,
        title: book.title,
        author: book.author,
        textUrl: book.textUrl,
        cardUrl: book.cardUrl,
        releaseDate: book.releaseDate,
      });
    }
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer group border-amber-200 relative"
      onClick={() => onSelect(book)}
    >
      {/* 本棚追加チェックマーク */}
      {isAuthenticated && (
        <button
          onClick={handleToggleBookshelf}
          disabled={isPending}
          className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isInBookshelf
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600"
          }`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isInBookshelf ? (
            <Check className="w-4 h-4" />
          ) : (
            <Heart className="w-4 h-4" />
          )}
        </button>
      )}
      
      <CardHeader>
        <CardTitle className="text-lg group-hover:text-amber-700 transition-colors line-clamp-2 pr-8">
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
  );
}
