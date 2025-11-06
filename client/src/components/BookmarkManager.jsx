import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx'
import { 
  Bookmark, 
  BookmarkPlus, 
  Edit, 
  Trash2, 
  MapPin,
  Clock,
  Quote
} from 'lucide-react'
import { BookmarkManager } from '@/lib/storage.js'

export function BookmarkDialog({ bookId, currentPosition, selectedText, onBookmarkAdded, trigger }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!bookId || currentPosition === undefined) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const bookmark = BookmarkManager.addBookmark(bookId, {
        position: currentPosition,
        text: selectedText || '',
        note: note.trim()
      })
      
      onBookmarkAdded?.(bookmark)
      setNote('')
      setOpen(false)
    } catch (error) {
      console.error('ブックマークの追加に失敗しました:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <BookmarkPlus className="h-4 w-4 mr-2" />
            ブックマーク追加
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>ブックマークを追加</DialogTitle>
          <DialogDescription>
            現在の読書位置にブックマークを追加します
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedText && (
            <div className="space-y-2">
              <Label>選択されたテキスト</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                <Quote className="h-4 w-4 inline mr-2" />
                {selectedText.length > 100 ? `${selectedText.substring(0, 100)}...` : selectedText}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">メモ（任意）</Label>
            <Textarea
              id="note"
              placeholder="このブックマークについてのメモを入力..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {note.length}/500
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '追加中...' : 'ブックマーク追加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BookmarkCard({ bookmark, onEdit, onDelete, onJump }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text, maxLength = 80) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          {bookmark.text && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded italic">
              <Quote className="h-3 w-3 inline mr-1" />
              {truncateText(bookmark.text)}
            </div>
          )}
          
          {bookmark.note && (
            <p className="text-sm">{bookmark.note}</p>
          )}
          
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatDate(bookmark.createdAt)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3" />
              <span>位置: {bookmark.position}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onJump(bookmark)}
            title="この位置にジャンプ"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(bookmark)}
            title="編集"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(bookmark.id)}
            title="削除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function BookmarkList({ bookmarks, onEdit, onDelete, onJump }) {
  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>まだブックマークがありません</p>
        <p className="text-sm">読書中に気になる箇所をブックマークしてみませんか？</p>
      </div>
    )
  }

  // 作成日時で降順ソート（新しいものが上）
  const sortedBookmarks = [...bookmarks].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  )

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {sortedBookmarks.map((bookmark) => (
          <BookmarkCard
            key={bookmark.id}
            bookmark={bookmark}
            onEdit={onEdit}
            onDelete={onDelete}
            onJump={onJump}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

export function BookmarkPanel({ bookId, onJumpToBookmark }) {
  const [bookmarks, setBookmarks] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (bookId) {
      const loadBookmarks = () => {
        const bookmarkList = BookmarkManager.getBookmarks(bookId)
        setBookmarks(bookmarkList)
      }
      
      loadBookmarks()
      
      // ブックマーク変更を監視（他のタブでの変更も反映）
      const handleStorageChange = (e) => {
        if (e.key === 'aozora_reader_bookmarks') {
          loadBookmarks()
        }
      }
      
      window.addEventListener('storage', handleStorageChange)
      return () => window.removeEventListener('storage', handleStorageChange)
    }
  }, [bookId])

  const handleBookmarkAdded = (bookmark) => {
    setBookmarks(prev => [bookmark, ...prev])
  }

  const handleEdit = (bookmark) => {
    // 編集機能は今回は簡略化
    console.log('Edit bookmark:', bookmark)
  }

  const handleDelete = (bookmarkId) => {
    try {
      BookmarkManager.removeBookmark(bookId, bookmarkId)
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId))
    } catch (error) {
      console.error('ブックマークの削除に失敗しました:', error)
    }
  }

  const handleJump = (bookmark) => {
    onJumpToBookmark?.(bookmark)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bookmark className="h-4 w-4 mr-2" />
          ブックマーク
          {bookmarks.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
              {bookmarks.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">ブックマーク</h3>
            <Badge variant="outline">{bookmarks.length}件</Badge>
          </div>
          
          <BookmarkList
            bookmarks={bookmarks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onJump={handleJump}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
