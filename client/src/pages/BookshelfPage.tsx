import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Loader2, Trash2, Library, ArrowLeft, BookMarked, Clock, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';

interface BookshelfItem {
  id: number;
  bookId: string;
  title: string;
  author: string;
  textUrl: string | null;
  cardUrl: string | null;
  releaseDate: string | null;
  summary: string | null;
  createdAt: Date;
}

interface ReadingHistoryItem {
  id: number;
  bookId: string;
  title: string;
  author: string;
  textUrl: string | null;
  cardUrl: string | null;
  scrollPosition: number;
  lastReadAt: Date;
}

type TabType = 'bookshelf' | 'history';

export default function BookshelfPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('bookshelf');
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedBookSummary, setSelectedBookSummary] = useState<{ title: string; author: string; summary: string } | null>(null);
  const utils = trpc.useUtils();

  // 本棚の一覧を取得
  const bookshelfQuery = trpc.bookshelf.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // 読書履歴を取得
  const historyQuery = trpc.progress.history.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated }
  );

  // 本棚から削除
  const removeMutation = trpc.bookshelf.remove.useMutation({
    onSuccess: () => {
      toast.success('本棚から削除しました');
      utils.bookshelf.list.invalidate();
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  // 読書履歴を削除
  const deleteProgressMutation = trpc.progress.delete.useMutation({
    onSuccess: () => {
      toast.success('履歴から削除しました');
      utils.progress.history.invalidate();
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  // 作品を読む
  const handleReadBook = (bookId: string, textUrl: string | null) => {
    if (textUrl) {
      // BooksPageに遷移して、該当の本を開く
      // URLパラメータで本の情報を渡す
      setLocation(`/books?read=${encodeURIComponent(bookId)}&textUrl=${encodeURIComponent(textUrl)}`);
    }
  };

  // あらすじを表示
  const handleShowSummary = (book: BookshelfItem) => {
    if (book.summary) {
      setSelectedBookSummary({
        title: book.title,
        author: book.author,
        summary: book.summary,
      });
      setSummaryDialogOpen(true);
    }
  };

  // ローディング中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  // 未ログイン
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <Library className="w-16 h-16 mx-auto text-amber-400 mb-6" />
            <h1 className="text-3xl font-bold text-amber-900 mb-4">本棚</h1>
            <p className="text-amber-700 mb-8">
              本棚機能を使用するにはログインが必要です
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/books">
                <Button variant="outline" className="border-amber-300">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  作品を探す
                </Button>
              </Link>
              <a href={getLoginUrl()}>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  ログイン
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const books = bookshelfQuery.data?.books || [];
  const history = historyQuery.data?.history || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-900 flex items-center gap-3">
              <Library className="w-8 h-8" />
              本棚
            </h1>
            <p className="text-amber-700 mt-2">
              {user?.name || 'ゲスト'}さんの本棚
            </p>
          </div>
          <Link href="/books">
            <Button variant="outline" className="border-amber-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              作品を探す
            </Button>
          </Link>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === 'bookshelf' ? 'default' : 'outline'}
            onClick={() => setActiveTab('bookshelf')}
            className={activeTab === 'bookshelf' 
              ? 'bg-amber-600 hover:bg-amber-700' 
              : 'border-amber-300 hover:bg-amber-100'
            }
          >
            <BookMarked className="w-4 h-4 mr-2" />
            お気に入り ({books.length})
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
            className={activeTab === 'history' 
              ? 'bg-amber-600 hover:bg-amber-700' 
              : 'border-amber-300 hover:bg-amber-100'
            }
          >
            <Clock className="w-4 h-4 mr-2" />
            読書履歴 ({history.length})
          </Button>
        </div>

        {/* 本棚タブ */}
        {activeTab === 'bookshelf' && (
          <>
            {bookshelfQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-20">
                <BookMarked className="w-16 h-16 mx-auto text-amber-300 mb-6" />
                <p className="text-amber-700 text-lg mb-4">
                  本棚に作品がありません
                </p>
                <p className="text-amber-600 mb-8">
                  作品を検索して、お気に入りに追加してみましょう
                </p>
                <Link href="/books">
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    作品を探す
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {books.map((book: BookshelfItem) => (
                  <Card
                    key={book.id}
                    className="hover:shadow-lg transition-shadow border-amber-200 group"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-amber-700 transition-colors">
                        {book.title}
                        {book.summary && (
                          <Sparkles className="w-4 h-4 inline-block ml-2 text-purple-500" />
                        )}
                      </CardTitle>
                      <CardDescription>{book.author}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {book.releaseDate && (
                        <p className="text-sm text-muted-foreground">
                          公開日: {book.releaseDate}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        追加日: {new Date(book.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 group-hover:bg-amber-50 group-hover:border-amber-300"
                          onClick={() => handleReadBook(book.bookId, book.textUrl)}
                          disabled={!book.textUrl}
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          読む
                        </Button>
                        {book.summary && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-purple-200 hover:bg-purple-50 hover:border-purple-300 text-purple-600"
                            onClick={() => handleShowSummary(book)}
                            title="あらすじを見る"
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600"
                          onClick={() => removeMutation.mutate({ bookId: book.bookId })}
                          disabled={removeMutation.isPending}
                        >
                          {removeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* 読書履歴タブ */}
        {activeTab === 'history' && (
          <>
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-20">
                <Clock className="w-16 h-16 mx-auto text-amber-300 mb-6" />
                <p className="text-amber-700 text-lg mb-4">
                  読書履歴がありません
                </p>
                <p className="text-amber-600 mb-8">
                  作品を読むと、ここに履歴が表示されます
                </p>
                <Link href="/books">
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    作品を探す
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {history.map((item: ReadingHistoryItem) => (
                  <Card
                    key={item.id}
                    className="hover:shadow-lg transition-shadow border-amber-200 group"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-amber-700 transition-colors">
                        {item.title}
                      </CardTitle>
                      <CardDescription>{item.author}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-amber-100 rounded-full h-2">
                          <div
                            className="bg-amber-600 h-2 rounded-full"
                            style={{ width: `${item.scrollPosition}%` }}
                          />
                        </div>
                        <span className="text-sm text-amber-700 font-medium">
                          {item.scrollPosition}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        最終閲覧: {new Date(item.lastReadAt).toLocaleDateString('ja-JP')}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 group-hover:bg-amber-50 group-hover:border-amber-300"
                          onClick={() => handleReadBook(item.bookId, item.textUrl)}
                          disabled={!item.textUrl}
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          続きを読む
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600"
                          onClick={() => deleteProgressMutation.mutate({ bookId: item.bookId })}
                          disabled={deleteProgressMutation.isPending}
                        >
                          {deleteProgressMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* あらすじダイアログ */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-white">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-amber-900">
              <Sparkles className="w-5 h-5 text-purple-500" />
              あらすじ
            </DialogTitle>
            {selectedBookSummary && (
              <p className="text-sm text-amber-700">
                {selectedBookSummary.title} - {selectedBookSummary.author}
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {selectedBookSummary && (
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {selectedBookSummary.summary}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 flex justify-end mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setSummaryDialogOpen(false)}
              className="border-amber-300 hover:bg-amber-100"
            >
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
