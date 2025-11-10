import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Book, Loader2, ArrowLeft } from 'lucide-react';
import { extractTextFromZip } from '@/lib/aozora';

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

  // tRPCで初期書籍リストを取得
  const booksQuery = trpc.books.search.useQuery({ keyword: '', limit: 50 });

  // 初期化時に青空文庫のリストを取得
  useEffect(() => {
    if (booksQuery.data) {
      const books = (booksQuery.data as any).books || [];
      setSearchResults(books as BookItem[]);
    }
  }, [booksQuery.data]);

  // 本の検索処理
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKeyword.trim()) {
      // キーワードが空の場合は全書籍を表示
      const result = await (trpc.books.search as any).query({ 
        keyword: '', 
        limit: 50 
      });
      const books = (result as any).books || [];
      setSearchResults(books as BookItem[]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await (trpc.books.search as any).query({ 
        keyword: searchKeyword, 
        limit: 50 
      });
      const books = (result as any).books || [];
      setSearchResults(books as BookItem[]);
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
        const content = await extractTextFromZip(book.textFileUrl);
        setBookContent(content);
      } else {
        setBookContent('この作品のテキストはまだ取得できません。');
      }
    } catch (error) {
      console.error('Failed to load book content:', error);
      setBookContent('テキストの読み込みに失敗しました。');
    } finally {
      setContentLoading(false);
    }
  };

  // 本の選択処理
  const handleBookSelect = async (book: BookItem) => {
    setSelectedBook(book);
    await loadBookContent(book);
  };

  if (selectedBook) {
    // 本の読書ビュー
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBook(null);
                setBookContent('');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              検索に戻る
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 本の詳細情報 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-3">{selectedBook.title}</CardTitle>
                  <CardDescription className="mt-2">{selectedBook.author}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedBook.year && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">出版年</p>
                      <p className="text-sm">{selectedBook.year}</p>
                    </div>
                  )}
                  {selectedBook.characterCount && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">文字数</p>
                      <p className="text-sm">{selectedBook.characterCount.toLocaleString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 本の内容表示 */}
            <div className="lg:col-span-3">
              <Card className="min-h-[600px]">
                <CardContent className="p-6 h-[600px] overflow-y-auto">
                  {contentLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">本の内容を読み込み中...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words font-serif text-sm leading-relaxed">
                      {bookContent}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 検索結果ビュー
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
              disabled={isSearching || booksQuery.isLoading}
            />
            <Button type="submit" variant="default" disabled={isSearching || booksQuery.isLoading}>
              {isSearching || booksQuery.isLoading ? (
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
        {booksQuery.isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {!booksQuery.isLoading && searchResults.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              {searchKeyword ? `「${searchKeyword}」の検索結果` : '青空文庫の作品'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((book: BookItem) => (
                <Card
                  key={book.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full"
                  onClick={() => handleBookSelect(book)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base line-clamp-2">{book.title}</CardTitle>
                    <CardDescription className="line-clamp-1">{book.author}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col pb-3">
                    <div className="flex-1">
                      {book.year && (
                        <Badge variant="secondary" className="text-xs mr-2 mb-2">
                          {book.year}年
                        </Badge>
                      )}
                      {book.characterCount && (
                        <Badge variant="outline" className="text-xs mb-2">
                          {book.characterCount.toLocaleString()}字
                        </Badge>
                      )}
                      {book.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
                          {book.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookSelect(book);
                      }}
                    >
                      読む
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!booksQuery.isLoading && searchResults.length === 0 && searchKeyword && (
          <div className="text-center py-12">
            <Book className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">
              「{searchKeyword}」に該当する作品が見つかりません
            </p>
          </div>
        )}

        {!booksQuery.isLoading && searchResults.length === 0 && !searchKeyword && (
          <div className="text-center py-12">
            <Book className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">
              作品を読み込み中です...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
