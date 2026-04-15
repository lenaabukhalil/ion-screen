import { Button } from '@/components/ui/button'

interface TablePaginationProps {
  total: number
  page: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (value: number) => void
  pageSizeOptions?: number[]
}

export function TablePagination({ total, page, perPage, onPageChange, onPerPageChange, pageSizeOptions = [10, 25, 50] }: TablePaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)
  const canPrev = page > 1
  const canNext = page * perPage < total

  return (
    <div className="flex items-center justify-between gap-4 pt-4 text-sm text-muted-foreground">
      <span>Showing {start}-{end} of {total}</span>
      <div className="flex items-center gap-3">
        <select className="h-9 rounded-md border border-input bg-background px-2" value={perPage} onChange={(e) => onPerPageChange(Number(e.target.value))}>
          {pageSizeOptions.map((size) => <option key={size} value={size}>{size} / page</option>)}
        </select>
        <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => onPageChange(page - 1)}>Prev</Button>
        <Button variant="outline" size="sm" disabled={!canNext} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  )
}
