import { buildSchema, graphql } from 'graphql'
import { prisma } from '../config/prisma'
import { domainEvents } from '../architecture/domain-events'
import { queueSystem } from '../architecture/job-queue'

const schema = buildSchema(`
  type Query {
    health: Health!
    item(id: ID!): Item
    items(limit: Int): [Item!]!
    warehouses: [Warehouse!]!
    locations(warehouseId: ID): [Location!]!
    queueStatus: QueueStatus!
    recentEvents: [DomainEvent!]!
  }

  type Mutation {
    refreshAlerts: QueueResult!
  }

  type Health {
    status: String!
  }

  type Item {
    id: ID!
    name: String!
    sku: String!
    quantity: Int!
    location: String!
    barcodeValue: String!
    qrValue: String!
  }

  type Warehouse {
    id: ID!
    name: String!
    code: String!
  }

  type Location {
    id: ID!
    name: String!
    shelf: String!
    rack: String!
    bin: String!
    qrValue: String!
    barcodeValue: String!
    warehouse: Warehouse!
  }

  type QueueResult {
    queued: Boolean!
    message: String!
  }

  type QueueJob {
    id: ID!
    type: String!
    status: String!
    createdAt: String!
    updatedAt: String!
    error: String
  }

  type QueueStatus {
    pending: Int!
    processing: Int!
    completed: Int!
    failed: Int!
    recent: [QueueJob!]!
  }

  type DomainEvent {
    type: String!
    occurredAt: String!
    payload: String!
  }
`)

type GraphQLContext = { userId?: string }

const mapItem = (item: { id: string; name: string; sku: string; quantity: number; location: string; barcodeValue: string; qrValue: string }) => item

const rootValue = {
  health: () => ({ status: 'ok' }),
  item: async ({ id }: { id: string }) => {
    const item = await prisma.item.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        location: true,
        barcodeValue: true,
        qrValue: true,
      },
    })
    return item ? mapItem(item) : null
  },
  items: async ({ limit }: { limit?: number }) => {
    const rows = await prisma.item.findMany({
      take: limit ?? 25,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        location: true,
        barcodeValue: true,
        qrValue: true,
      },
    })
    return rows.map(mapItem)
  },
  warehouses: () =>
    prisma.warehouse.findMany({
      orderBy: { createdAt: 'desc' },
    }),
  locations: ({ warehouseId }: { warehouseId?: string }) =>
    prisma.storageLocation.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: { warehouse: true },
      orderBy: { createdAt: 'desc' },
    }),
  queueStatus: () => queueSystem.snapshot(),
  recentEvents: () =>
    domainEvents.recent().map((event) => ({
      type: event.type,
      occurredAt: event.occurredAt,
      payload: JSON.stringify(event.payload),
    })),
  refreshAlerts: async () => {
    const result = await queueSystem.enqueue('refresh-all-alerts', {})
    return {
      queued: true,
      message: `Queued ${result.type} job`,
    }
  },
}

export const executeGraphQL = async (query: string, variables?: Record<string, unknown>, context?: GraphQLContext) =>
  graphql({
    schema,
    source: query,
    rootValue,
    variableValues: variables,
    contextValue: context,
  })
