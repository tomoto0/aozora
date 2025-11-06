import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Settings,
  Clock,
  BookOpen,
  Maximize,
  Minimize,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Mic
} from 'lucide-react'

export function ReadingControls({
  isReading,
  readingTime,
  progress,
  estimatedTimeLeft,
  autoScroll,
  autoScrollSpeed,
  onStartReading,
  onStopReading,
  onStartAutoScroll,
  onStopAutoScroll,
  onChangeAutoScrollSpeed,
  onScrollUp,
  onScrollDown,
  onToggleFullscreen,
  isFullscreen = false,
  // 音声読み上げ関連
  speechStatus,
  onStartSpeech,
  onPauseSpeech,
  onResumeSpeech,
  onStopSpeech,
  onSpeechSettingsChange
}) {
  const [showControls, setShowControls] = useState(true)

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatEstimatedTime = (minutes) => {
    if (minutes < 1) return '1分未満'
    if (minutes < 60) return `約${Math.round(minutes)}分`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return `約${hours}時間${remainingMinutes > 0 ? remainingMinutes + '分' : ''}`
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`bg-card border border-border rounded-lg shadow-lg transition-all duration-300 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-80 translate-y-2'
      }`}>
        {/* 進捗バー */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>読書進捗</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* メインコントロール */}
        <div className="flex items-center space-x-2 px-4 pb-3">
          {/* 読書時間表示 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-1 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(readingTime)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>読書時間</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 読書状態表示 */}
          <Badge variant={isReading ? "default" : "secondary"} className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            {isReading ? '読書中' : '一時停止'}
          </Badge>

          {/* 残り時間表示 */}
          {estimatedTimeLeft > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground">
                    残り{formatEstimatedTime(estimatedTimeLeft)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>推定残り読書時間</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* スクロールコントロール */}
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onScrollUp}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>上にスクロール (Ctrl+↑)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onScrollDown}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>下にスクロール (Ctrl+↓)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* 自動スクロールコントロール */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={autoScroll ? "default" : "outline"}
                  size="sm"
                  onClick={autoScroll ? onStopAutoScroll : onStartAutoScroll}
                >
                  {autoScroll ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{autoScroll ? '自動スクロール停止' : '自動スクロール開始'} (Ctrl+Space)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 音声読み上げコントロール */}
          {speechStatus?.isSupported && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={speechStatus.isPlaying ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (speechStatus.isPlaying) {
                        if (speechStatus.isPaused) {
                          onResumeSpeech?.();
                        } else {
                          onPauseSpeech?.();
                        }
                      } else {
                        onStartSpeech?.();
                      }
                    }}
                  >
                    {speechStatus.isPlaying && !speechStatus.isPaused ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {speechStatus.isPlaying
                      ? (speechStatus.isPaused ? '音声読み上げ再開' : '音声読み上げ一時停止')
                      : '音声読み上げ開始'
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* 設定メニュー */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    自動スクロール速度: {autoScrollSpeed}px/秒
                  </label>
                  <Slider
                    value={[autoScrollSpeed]}
                    onValueChange={([value]) => onChangeAutoScrollSpeed(value)}
                    min={10}
                    max={200}
                    step={10}
                    className="mt-2"
                  />
                </div>

                {speechStatus?.isSupported && (
                  <>
                    <div>
                      <label className="text-sm font-medium">
                        読み上げ速度: {speechStatus.settings?.rate?.toFixed(1) || 1.0}
                      </label>
                      <Slider
                        value={[speechStatus.settings?.rate || 1.0]}
                        onValueChange={([value]) => onSpeechSettingsChange?.({ rate: value })}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        音程: {speechStatus.settings?.pitch?.toFixed(1) || 1.0}
                      </label>
                      <Slider
                        value={[speechStatus.settings?.pitch || 1.0]}
                        onValueChange={([value]) => onSpeechSettingsChange?.({ pitch: value })}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        音量: {Math.round((speechStatus.settings?.volume || 1.0) * 100)}%
                      </label>
                      <Slider
                        value={[speechStatus.settings?.volume || 1.0]}
                        onValueChange={([value]) => onSpeechSettingsChange?.({ volume: value })}
                        min={0}
                        max={1}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>
                  </>
                )}

                <div className="text-xs text-muted-foreground">
                  <p>• 自動スクロール</p>
                  <p>  - 遅い (10-50): じっくり読む</p>
                  <p>  - 普通 (50-100): 標準的な読書速度</p>
                  <p>  - 速い (100-200): 速読・流し読み</p>
                  {speechStatus?.isSupported && (
                    <>
                      <p>• 音声読み上げ</p>
                      <p>  - 速度: 0.5倍〜2.0倍</p>
                      <p>  - 音程: 低め〜高め</p>
                    </>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* フルスクリーンボタン */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleFullscreen}
                >
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? 'フルスクリーン終了' : 'フルスクリーン'} (Ctrl+F)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* コントロール表示/非表示 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowControls(!showControls)}
          >
            {showControls ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ReadingProgressIndicator({ progress, isVisible = true }) {
  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-40">
      <Progress value={progress} className="h-1 rounded-none" />
    </div>
  )
}

export function ReadingStats({ stats, isVisible = false }) {
  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
        <h3 className="font-medium mb-3">読書統計</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>読書時間:</span>
            <span>{stats.formattedTime}</span>
          </div>
          <div className="flex justify-between">
            <span>読書速度:</span>
            <span>{stats.wordsPerMinute} 文字/分</span>
          </div>
          <div className="flex justify-between">
            <span>進捗:</span>
            <span>{Math.round((stats.scrollPosition / stats.totalLength) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
