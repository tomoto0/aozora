import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx'
import { 
  Share, 
  Twitter, 
  Facebook, 
  MessageCircle, 
  Copy, 
  Check 
} from 'lucide-react'
import { 
  getAvailableSharePlatforms, 
  createShareData, 
  shareOnTwitter, 
  shareOnFacebook, 
  shareOnLine, 
  shareWithWebAPI, 
  copyToClipboard 
} from '@/lib/social.js'

export function ShareDialog({ type, data, trigger, children }) {
  const [open, setOpen] = useState(false)
  const [shareText, setShareText] = useState('')
  const [copied, setCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const shareData = createShareData(type, data)
  const platforms = getAvailableSharePlatforms()

  const handleShare = async (platform) => {
    setIsSharing(true)
    
    try {
      switch (platform.id) {
        case 'native':
          await shareWithWebAPI(shareData)
          break
        case 'twitter':
          shareOnTwitter(shareData.text, shareData.url)
          break
        case 'facebook':
          shareOnFacebook(shareData.url, shareData.text)
          break
        case 'line':
          shareOnLine(shareData.text)
          break
        case 'copy':
          const success = await copyToClipboard(shareData.text)
          if (success) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }
          break
      }
    } catch (error) {
      console.error('共有に失敗しました:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'Twitter':
        return <Twitter className="h-4 w-4" />
      case 'Facebook':
        return <Facebook className="h-4 w-4" />
      case 'MessageCircle':
        return <MessageCircle className="h-4 w-4" />
      case 'Copy':
        return copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />
      case 'Share':
        return <Share className="h-4 w-4" />
      default:
        return <Share className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            共有
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>読書記録を共有</DialogTitle>
          <DialogDescription>
            SNSや他のアプリで読書記録を共有できます
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 共有テキストのプレビュー */}
          <div className="space-y-2">
            <label className="text-sm font-medium">共有内容</label>
            <Textarea
              value={shareData.text}
              onChange={(e) => setShareText(e.target.value)}
              rows={6}
              className="resize-none"
              readOnly
            />
          </div>
          
          {/* 共有プラットフォーム */}
          <div className="space-y-2">
            <label className="text-sm font-medium">共有先を選択</label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((platform) => (
                <Button
                  key={platform.id}
                  variant="outline"
                  onClick={() => handleShare(platform)}
                  disabled={isSharing}
                  className="flex items-center justify-center space-x-2 h-12"
                >
                  {getIcon(platform.icon)}
                  <span>{platform.name}</span>
                </Button>
              ))}
            </div>
          </div>
          
          {/* URL情報 */}
          {shareData.url && (
            <div className="space-y-2">
              <label className="text-sm font-medium">共有URL</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shareData.url}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(shareData.url)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function QuickShareButton({ type, data, variant = "ghost", size = "sm" }) {
  const [isSharing, setIsSharing] = useState(false)
  
  const handleQuickShare = async () => {
    setIsSharing(true)
    
    try {
      const shareData = createShareData(type, data)
      
      // Web Share API が利用可能な場合は優先的に使用
      const success = await shareWithWebAPI(shareData)
      
      if (!success) {
        // フォールバック: Twitter で共有
        shareOnTwitter(shareData.text, shareData.url)
      }
    } catch (error) {
      console.error('クイック共有に失敗しました:', error)
    } finally {
      setIsSharing(false)
    }
  }
  
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleQuickShare}
      disabled={isSharing}
    >
      <Share className="h-4 w-4 mr-2" />
      {isSharing ? '共有中...' : '共有'}
    </Button>
  )
}

export function ShareStats({ stats }) {
  return (
    <ShareDialog
      type="stats"
      data={{ stats }}
      trigger={
        <Button variant="outline" className="w-full">
          <Share className="h-4 w-4 mr-2" />
          読書統計を共有
        </Button>
      }
    />
  )
}

export function ShareBook({ book, progress, review }) {
  return (
    <ShareDialog
      type="book"
      data={{ book, progress, review }}
      trigger={
        <Button variant="outline" size="sm">
          <Share className="h-4 w-4 mr-2" />
          読書記録を共有
        </Button>
      }
    />
  )
}

export function ShareReview({ book, review }) {
  return (
    <ShareDialog
      type="review"
      data={{ book, review }}
      trigger={
        <Button variant="ghost" size="sm">
          <Share className="h-4 w-4 mr-2" />
          レビューを共有
        </Button>
      }
    />
  )
}
