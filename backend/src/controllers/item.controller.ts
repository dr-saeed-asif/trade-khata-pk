import type { NextFunction, Request, Response } from 'express'
import { parse } from 'csv-parse/sync'
import XLSX from 'xlsx'
import { itemService } from '../services/item.service'
import { itemCatalogService } from '../services/item-catalog.service'
import { mapImportRecord } from '../utils/import-item'

export const itemController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await itemService.create(req.body, req.user?.userId)
      res.status(201).json(item)
    } catch (error) {
      next(error)
    }
  },
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await itemService.list(req.query as Record<string, string | undefined>)
      res.setHeader('Cache-Control', 'no-store')
      res.json(data)
    } catch (error) {
      next(error)
    }
  },
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await itemService.getById(String(req.params.id)))
    } catch (error) {
      next(error)
    }
  },
  timeline: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await itemService.timeline(String(req.params.id)))
    } catch (error) {
      next(error)
    }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await itemService.update(String(req.params.id), req.body, req.user?.userId))
    } catch (error) {
      next(error)
    }
  },
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id)
      await itemService.delete(id, req.user?.userId)
      res.setHeader('Cache-Control', 'no-store')
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
  import: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'File is required' })
        return
      }

      let records: Array<Record<string, string>> = []
      const fileName = req.file.originalname.toLowerCase()
      if (fileName.endsWith('.csv')) {
        records = parse(req.file.buffer.toString('utf8'), {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }) as Array<Record<string, string>>
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
        const firstSheet = workbook.SheetNames[0]
        records = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]) as Array<Record<string, string>>
      } else {
        res.status(400).json({ message: 'Unsupported file format. Use CSV or Excel.' })
        return
      }

      const rows = records
        .map((record) => mapImportRecord(record as Record<string, unknown>))
        .filter((row) => row.name.trim().length >= 2)

      if (rows.length === 0) {
        res.status(400).json({
          message:
            'No valid rows found. Expected columns like Item Name, Sale Price, Purchase Price (Banu Adam export format).',
        })
        return
      }

      const result = await itemService.createManyFromImport(rows, req.user?.userId)
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  },
  catalog: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const names = await itemCatalogService.listCatalogItemNames()
      res.json({ names })
    } catch (error) {
      next(error)
    }
  },
  syncCatalog: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await itemCatalogService.syncCatalogToDatabase()
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  },
}
