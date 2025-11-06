import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Label } from '@/components/ui/label.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx'
import { Star, MessageSquare, Wand2 } from 'lucide-react'
import { summarizeText } from '@/lib/llm.js'

export function ReviewDialog({ bookId, bookTitle, bookContent, onReviewSubmit, trigger }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)

  const handleSummarize = async () => {
    if (!bookContent || isSummarizing) return

    setIsSummarizing(true)
    try {
      // 最初の5000文字に制限（LLMのトークン制限を考慮）
      const textToSummarize = bookContent.length > 5000 ? bookContent.substring(0, 5000) + '...' : bookContent;
      const summary = await summarizeText(textToSummarize)
      setContent(summary)
      setTitle(bookTitle + " - AI要約")
    } catch (error) {
      console.error('要約エラー:', error)
      alert('AIによる要約に失敗しました。')
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (rating === 0 || !title.trim() || !content.trim()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      await onReviewSubmit({
        rating,
        title: title.trim(),
        content: content.trim()
      })
      
      // フォームをリセット
      setRating(0)
      setTitle('')
      setContent('')
      setOpen(false)
    } catch (error) {
      console.error('レビューの投稿に失敗しました:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRatingClick = (value) => {
    setRating(value)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            レビューを書く
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>レビューを投稿</DialogTitle>
          <DialogDescription>
            「{bookTitle}」の感想をお聞かせください
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rating">評価</Label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRatingClick(value)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-6 w-6 ${
                      value <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 ? `${rating}/5` : '評価を選択してください'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              placeholder="レビューのタイトルを入力..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <div className="text-xs text-muted-foreground text-right">
              {title.length}/100
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">感想・レビュー</Label>
            <Textarea
              id="content"
              placeholder="この作品についての感想をお聞かせください..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              maxLength={1000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {content.length}/1000
            </div>
            {bookContent && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSummarize}
                disabled={isSummarizing || isSubmitting}
                className="w-full"
              >
                {isSummarizing ? (
                  <>
                    <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                    AIが要約中...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    AIに要約を依頼 (本文から)
                  </>
                )}
              </Button>
            )}
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
              disabled={rating === 0 || !title.trim() || !content.trim() || isSubmitting}
            >
              {isSubmitting ? '投稿中...' : '投稿する'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ReviewCard({ review, onEdit, onDelete, canEdit = false }) {
  const renderStars = (rating) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            className={`h-4 w-4 ${
              value <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            {renderStars(review.rating)}
            <span className="text-sm text-muted-foreground">
              {review.rating}/5
            </span>
          </div>
          <h3 className="font-medium">{review.title}</h3>
        </div>
        {canEdit && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(review)}
            >
              編集
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(review.id)}
            >
              削除
            </Button>
          </div>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
        {review.content}
      </p>
      
      <div className="text-xs text-muted-foreground">
        投稿日: {formatDate(review.createdAt)}
        {review.updatedAt !== review.createdAt && (
          <span> (更新: {formatDate(review.updatedAt)})</span>
        )}
      </div>
    </div>
  )
}

export function ReviewList({ reviews, onEdit, onDelete, canEdit = false }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>まだレビューがありません</p>
        <p className="text-sm">最初のレビューを投稿してみませんか？</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
        />
      ))}
    </div>
  )
}

