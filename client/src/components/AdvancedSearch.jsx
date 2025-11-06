import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.jsx'
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  User,
  BookOpen,
  Tag
} from 'lucide-react'

export function AdvancedSearchDialog({ books, onSearchResults, trigger }) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    authors: [],
    categories: [],
    genres: [],
    yearRange: [1900, 2024],
    lengths: [],
    hasProgress: null // null, true, false
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  // 利用可能なフィルターオプションを抽出
  const filterOptions = useMemo(() => {
    const authors = [...new Set(books.map(book => book.author))].sort()
    const categories = [...new Set(books.map(book => book.category))].sort()
    const genres = [...new Set(books.map(book => book.genre))].sort()
    const lengths = [...new Set(books.map(book => book.length))].sort()
    
    const years = books.map(book => parseInt(book.publishedYear)).filter(year => !isNaN(year))
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)

    return {
      authors,
      categories,
      genres,
      lengths,
      yearRange: [minYear, maxYear]
    }
  }, [books])

  // 検索とフィルタリングの実行
  const performSearch = () => {
    let results = books

    // テキスト検索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      results = results.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.description.toLowerCase().includes(query) ||
        book.category.toLowerCase().includes(query) ||
        book.genre.toLowerCase().includes(query)
      )
    }

    // 著者フィルター
    if (filters.authors.length > 0) {
      results = results.filter(book => filters.authors.includes(book.author))
    }

    // カテゴリフィルター
    if (filters.categories.length > 0) {
      results = results.filter(book => filters.categories.includes(book.category))
    }

    // ジャンルフィルター
    if (filters.genres.length > 0) {
      results = results.filter(book => filters.genres.includes(book.genre))
    }

    // 年代フィルター
    results = results.filter(book => {
      const year = parseInt(book.publishedYear)
      return year >= filters.yearRange[0] && year <= filters.yearRange[1]
    })

    // 長さフィルター
    if (filters.lengths.length > 0) {
      results = results.filter(book => filters.lengths.includes(book.length))
    }

    onSearchResults(results, { query: searchQuery, filters })
    setOpen(false)
  }

  // フィルターのリセット
  const resetFilters = () => {
    setSearchQuery('')
    setFilters({
      authors: [],
      categories: [],
      genres: [],
      yearRange: filterOptions.yearRange,
      lengths: [],
      hasProgress: null
    })
  }

  // フィルター項目の追加/削除
  const toggleFilter = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            高度な検索
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>高度な検索</DialogTitle>
          <DialogDescription>
            詳細な条件で作品を検索できます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本検索 */}
          <div className="space-y-2">
            <Label htmlFor="search">キーワード検索</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="作品名、著者名、説明文で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 高度なフィルター */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>詳細フィルター</span>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              {/* 著者フィルター */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>著者</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.authors.map(author => (
                    <Badge
                      key={author}
                      variant={filters.authors.includes(author) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter('authors', author)}
                    >
                      {author}
                      {filters.authors.includes(author) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* カテゴリフィルター */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>カテゴリ</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.categories.map(category => (
                    <Badge
                      key={category}
                      variant={filters.categories.includes(category) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter('categories', category)}
                    >
                      {category}
                      {filters.categories.includes(category) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* ジャンルフィルター */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  <span>ジャンル</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.genres.map(genre => (
                    <Badge
                      key={genre}
                      variant={filters.genres.includes(genre) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter('genres', genre)}
                    >
                      {genre}
                      {filters.genres.includes(genre) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 年代フィルター */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>発表年: {filters.yearRange[0]}年 - {filters.yearRange[1]}年</span>
                </Label>
                <Slider
                  value={filters.yearRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, yearRange: value }))}
                  min={filterOptions.yearRange[0]}
                  max={filterOptions.yearRange[1]}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* 長さフィルター */}
              <div className="space-y-2">
                <Label>作品の長さ</Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.lengths.map(length => (
                    <Badge
                      key={length}
                      variant={filters.lengths.includes(length) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter('lengths', length)}
                    >
                      {length}
                      {filters.lengths.includes(length) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* アクションボタン */}
          <div className="flex justify-between space-x-2">
            <Button variant="outline" onClick={resetFilters}>
              リセット
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={performSearch}>
                検索実行
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SearchResultsInfo({ results, searchInfo }) {
  if (!searchInfo) return null

  const hasActiveFilters = 
    searchInfo.query ||
    searchInfo.filters.authors.length > 0 ||
    searchInfo.filters.categories.length > 0 ||
    searchInfo.filters.genres.length > 0 ||
    searchInfo.filters.lengths.length > 0

  if (!hasActiveFilters) return null

  return (
    <div className="mb-4 p-4 bg-muted rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">検索結果: {results.length}件</h3>
      </div>
      
      {searchInfo.query && (
        <div className="mb-2">
          <span className="text-sm text-muted-foreground">キーワード: </span>
          <Badge variant="outline">{searchInfo.query}</Badge>
        </div>
      )}
      
      <div className="space-y-1">
        {searchInfo.filters.authors.length > 0 && (
          <div>
            <span className="text-sm text-muted-foreground">著者: </span>
            {searchInfo.filters.authors.map(author => (
              <Badge key={author} variant="outline" className="mr-1">
                {author}
              </Badge>
            ))}
          </div>
        )}
        
        {searchInfo.filters.categories.length > 0 && (
          <div>
            <span className="text-sm text-muted-foreground">カテゴリ: </span>
            {searchInfo.filters.categories.map(category => (
              <Badge key={category} variant="outline" className="mr-1">
                {category}
              </Badge>
            ))}
          </div>
        )}
        
        {searchInfo.filters.genres.length > 0 && (
          <div>
            <span className="text-sm text-muted-foreground">ジャンル: </span>
            {searchInfo.filters.genres.map(genre => (
              <Badge key={genre} variant="outline" className="mr-1">
                {genre}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
