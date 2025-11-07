import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Book, Search, BookOpen, Sparkles } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ナビゲーションバー */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Book className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-indigo-600">{APP_TITLE}</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <span className="text-sm text-gray-600">{user.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                >
                  ログアウト
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
              >
                ログイン
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="flex-1 container mx-auto px-4 py-12">
        {/* ヒーロー セクション */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            青空文庫リーダー
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            日本の著作権が切れた文学作品を、快適に読むことができます
          </p>
          <Link href="/books">
            <Button size="lg" className="gap-2">
              <Search className="w-5 h-5" />
              作品を探す
            </Button>
          </Link>
        </div>

        {/* 機能紹介 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mb-4">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              豊富な作品
            </h3>
            <p className="text-gray-600">
              青空文庫の数千の作品から、お気に入りの文学作品を探すことができます
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mb-4">
              <Search className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              簡単検索
            </h3>
            <p className="text-gray-600">
              作品名や著者名で簡単に検索でき、すぐに読み始めることができます
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mb-4">
              <Sparkles className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              AI機能
            </h3>
            <p className="text-gray-600">
              Manus LLMを活用したあらすじ生成や、作品の要約機能をご利用いただけます
            </p>
          </div>
        </div>

        {/* CTA セクション */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            今すぐ読み始めましょう
          </h3>
          <p className="text-gray-600 mb-6">
            青空文庫の作品を検索して、快適な読書体験をお楽しみください
          </p>
          <Link href="/books">
            <Button size="lg" className="gap-2">
              <Book className="w-5 h-5" />
              作品を探す
            </Button>
          </Link>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            &copy; 2024 青空文庫リーダー. All rights reserved.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            青空文庫: <a href="https://www.aozora.gr.jp/" className="text-indigo-400 hover:text-indigo-300">https://www.aozora.gr.jp/</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
