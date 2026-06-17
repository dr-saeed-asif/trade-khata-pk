import { useEffect, useState } from 'react'
import { categoryService } from '@/services/category.service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Category } from '@/types'

export const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const load = () => categoryService.list({ page: 1, pageSize: 500 }).then((res) => setCategories(res.data))
  useEffect(() => {
    void load()
  }, [])

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Categories</h2>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
        <Button
          onClick={async () => {
            await categoryService.create({ name })
            setName('')
            load()
          }}
        >
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center justify-between rounded-md border p-2">
            <div>
              {editing === category.id ? (
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              ) : (
                <p className="font-medium">{category.name}</p>
              )}
              <p className="text-xs text-slate-500">{category.itemsCount} items</p>
            </div>
            <div className="space-x-2">
              {editing === category.id ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await categoryService.update(category.id, { name: editName })
                    setEditing(null)
                    load()
                  }}
                >
                  Save
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(category.id)
                    setEditName(category.name)
                  }}
                >
                  Edit
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!window.confirm('Delete category?')) return
                  await categoryService.delete(category.id)
                  load()
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
