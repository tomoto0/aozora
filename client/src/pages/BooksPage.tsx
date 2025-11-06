import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Book, Loader2, ArrowLeft, ChevronDown, X } from 'lucide-react';
import { getAozoraBookList, extractTextFromZip, parseAozoraText } from '@/lib/aozora';

interface BookItem {
  id: number;
  title: string;
  author: string;
  description?: string;
  textFileUrl?: string;
  characterCount?: number;
  year?: number;
}

export default function BooksPage() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [bookContent, setBookContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<BookItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hoveredBook, setHoveredBook] = useState<BookItem | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // 初期化時に青空文庫のリストを取得
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const books = await getAozoraBookList();
        setSearchResults(books as BookItem[]);
      } catch (error) {
        console.error('Failed to load books:', error);
      }
    };
    loadBooks();
  }, []);

  // 本の検索処理
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKeyword.trim()) return;

    setIsSearching(true);
    try {
      const books = await getAozoraBookList();
      const filtered = (books as BookItem[]).filter(
        (book) =>
          book.title.includes(searchKeyword) ||
          book.author.includes(searchKeyword)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 本のテキストファイルを取得して表示
  const loadBookContent = async (book: BookItem) => {
    setContentLoading(true);
    try {
      if (book.textFileUrl) {
        // ZIPファイルから抽出
        const content = await extractTextFromZip(book.textFileUrl);
        setBookContent(content);
      } else {
        // サンプルテキストを表示
        const sampleContent = `${book.title}\n著者: ${book.author}\n\nこの作品のテキストはまだ取得できません。`;
        setBookContent(sampleContent);
      }
    } catch (error) {
      console.error('Failed to load book content:', error);
      setBookContent(`エラー: 本の内容を読み込めませんでした。\n\n${book.title}\n著者: ${book.author}`);
    } finally {
      setContentLoading(false);
    }
  };

  const handleBookSelect = (book: BookItem) => {
    setSelectedBook(book);
    loadBookContent(book);
  };

  // カード上でのマウス移動を追跡
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, book: BookItem) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPosition({
      x: rect.right + 10,
      y: rect.top,
    });
    setHoveredBook(book);
  };

  const handleCardMouseLeave = () => {
    setHoveredBook(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 検索ヘッダー */}
      <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="作品名や著者名で検索..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="flex-1"
              disabled={isSearching}
            />
            <Button type="submit" variant="default" disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              検索
            </Button>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {selectedBook && bookContent ? (
          // 本の読書ビュー
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 本の詳細情報 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{selectedBook.title}</CardTitle>
                  <CardDescription>{selectedBook.author}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedBook.year && (
                    <p className="text-sm text-muted-foreground">
                      出版年: {selectedBook.year}
                    </p>
                  )}
                  {selectedBook.characterCount && (
                    <p className="text-sm text-muted-foreground">
                      文字数: {selectedBook.characterCount.toLocaleString()}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedBook(null);
                      setBookContent('');
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    検索に戻る
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 本の内容表示 */}
            <div className="lg:col-span-3">
              <Card className="h-[600px] overflow-y-auto">
                <CardContent className="p-6">
                  {contentLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">本の内容を読み込み中...</p>
                      </div>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words font-serif text-sm leading-relaxed">
                      {bookContent}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // 検索結果ビュー
          <div>
            {isSearching && (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">
                  {searchKeyword ? `「${searchKeyword}」の検索結果` : '青空文庫の作品'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
                  {searchResults.map((book: BookItem) => (
                    <Card
                      key={book.id}
                      className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                      onClick={() => handleBookSelect(book)}
                      onMouseMove={(e) => handleCardMouseMove(e, book)}
                      onMouseLeave={handleCardMouseLeave}
                    >
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-2 group-hover:text-primary">
                          {book.title}
                        </CardTitle>
                        <CardDescription>{book.author}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {book.year && (
                          <Badge variant="secondary" className="text-xs">
                            {book.year}年
                          </Badge>
                        )}
                        {book.characterCount && (
                          <Badge variant="outline" className="text-xs">
                            {book.characterCount.toLocaleString()}字
                          </Badge>
                        )}
                        {book.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {book.description}
                          </p>
                        )}
                        <div className="pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookSelect(book);
                            }}
                          >
                            読む
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* あらすじポップアップ */}
                  {hoveredBook && (
                    <div
                      className="fixed bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl p-4 w-80 z-[100] pointer-events-none"
                      style={{
                        left: `${popupPosition.x}px`,
                        top: `${popupPosition.y}px`,
                        maxHeight: '400px',
                        overflowY: 'auto',
                      }}
                    >
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-bold text-sm line-clamp-2">{hoveredBook.title}</h3>
                          <p className="text-xs text-muted-foreground">{hoveredBook.author}</p>
                        </div>

                        {hoveredBook.description && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              あらすじ
                            </p>
                            <p className="text-xs leading-relaxed text-foreground">
                              {hoveredBook.description}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {hoveredBook.year && (
                            <Badge variant="secondary" className="text-xs">
                              {hoveredBook.year}年
                            </Badge>
                          )}
                          {hoveredBook.characterCount && (
                            <Badge variant="outline" className="text-xs">
                              {hoveredBook.characterCount.toLocaleString()}字
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground italic">
                          クリックして読む
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isSearching && searchResults.length === 0 && searchKeyword && (
              <div className="text-center py-12">
                <Book className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  「{searchKeyword}」に該当する作品が見つかりません
                </p>
              </div>
            )}

            {!isSearching && searchResults.length === 0 && !searchKeyword && (
              <div className="text-center py-12">
                <Book className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  作品名や著者名を入力して検索してください
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

