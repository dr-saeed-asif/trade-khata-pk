import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListEmptyMessage, ListRow } from '@/components/ui/list-row'
import type { Category } from '@/types'

interface CategoryTableProps {
  categories: Category[]
  canManage: boolean
  editLabel: string
  deleteLabel: string
  itemsLabel: string
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export const CategoryTable = ({
  categories,
  canManage,
  editLabel,
  deleteLabel,
  itemsLabel,
  onEdit,
  onDelete,
}: CategoryTableProps) => (
  <div className="space-y-3">
    {categories.length === 0 ? (
      <ListEmptyMessage>No categories found.</ListEmptyMessage>
    ) : null}
    {categories.map((category) => (
      <ListRow key={category.id}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">{category.name}</p>
            <p className="text-xs font-medium text-slate-400">
              {category.itemsCount} {itemsLabel}
            </p>
          </div>
          {canManage ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => onEdit(category)}>
                <Pencil className="h-3.5 w-3.5" />
                {editLabel}
              </Button>
              <Button variant="destructive" className="gap-1.5" onClick={() => onDelete(category)}>
                <Trash2 className="h-3.5 w-3.5" />
                {deleteLabel}
              </Button>
            </div>
          ) : null}
        </div>
      </ListRow>
    ))}
  </div>
)
