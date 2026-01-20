import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Book, Loader2, ArrowLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface BookItem {
  id: string;
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
  const [searchResults, setSearchResults] = useState<BookItem[]>([]);
  const [textContent, setTextContent] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [textError, setTextError] = useState<string>('');

  const utils = trpc.useUtils();

  // 本の検索処理
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = searchKeyword.trim();
    
    if (!keyword) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await utils.books.search.fetch({ query: keyword, limit: 50 });
      setSearchResults(results as BookItem[]);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 本の選択処理
  const handleBookSelect = async (book: BookItem) => {
    setSelectedBook(book);
    setTextContent('');
    setTextError('');
    setIsLoadingText(true);

    try {
      const result = await utils.books.getText.fetch({ id: book.id });
      if (result && result.text) {
        setTextContent(result.text);
      } else {
        setTextError('テキストの読み込みに失敗しました');
      }
    } catch (error) {
      console.error('Text loading error:', error);
      setTextError(`テキストの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingText(false);
    }
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
                setTextContent('');
                setTextError('');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              検索に戻る
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* 左側：書籍情報 */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedBook.title}</CardTitle>
                  <CardDescription>{selectedBook.author}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">出版年</p>
                    <p className="font-semibold">{selectedBook.year || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">文字数</p>
                    <p className="font-semibold">{selectedBook.characterCount?.toLocaleString() || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">説明</p>
                    <p className="text-sm mt-2">{selectedBook.description}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右側：テキスト表示 */}
            <div className="md:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{selectedBook.title}</CardTitle>
                </CardHeader>
                <CardContent className="h-96 overflow-y-auto">
                  {isLoadingText ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                  ) : textError ? (
                    <div className="text-red-500">
                      <p>エラーが発生しました</p>
                      <p className="text-sm">{textError}</p>
                    </div>
                  ) : textContent ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {textContent}
                    </div>
                  ) : (
                    <p>テキストを読み込み中...</p>
                  )}
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">青空文庫の作品</h1>
          <p className="text-muted-foreground">作品名や著者名で検索して、快適な読書体験を楽しみましょう</p>
        </div>

        {/* 検索フォーム */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <Input
              placeholder="作品名や著者名で検索..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  検索中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  検索
                </>
              )}
            </Button>
          </div>
        </form>

        {/* 検索結果 */}
        {searchKeyword && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              「{searchKeyword}」の検索結果: {searchResults.length}件
            </p>
          </div>
        )}

        {/* 書籍グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.length > 0 ? (
            searchResults.map((book) => (
              <Card key={book.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                  <CardDescription>{book.author}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Badge variant="outline">{book.year}年</Badge>
                    <Badge variant="outline">{book.characterCount?.toLocaleString()}字</Badge>
                  </div>
                  <p className="text-sm line-clamp-3">{book.description}</p>
                  <Button
                    className="w-full"
                    onClick={() => handleBookSelect(book)}
                  >
                    <Book className="w-4 h-4 mr-2" />
                    読む
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : searchKeyword ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">検索結果がありません</p>
            </div>
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">作品を検索してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
