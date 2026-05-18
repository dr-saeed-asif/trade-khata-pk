"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeGraphQL = void 0;
const graphql_1 = require("graphql");
const prisma_1 = require("../config/prisma");
const domain_events_1 = require("../architecture/domain-events");
const job_queue_1 = require("../architecture/job-queue");
const schema = (0, graphql_1.buildSchema)(`
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
`);
const mapItem = (item) => item;
const rootValue = {
    health: () => ({ status: 'ok' }),
    item: async ({ id }) => {
        const item = await prisma_1.prisma.item.findUnique({
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
        });
        return item ? mapItem(item) : null;
    },
    items: async ({ limit }) => {
        const rows = await prisma_1.prisma.item.findMany({
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
        });
        return rows.map(mapItem);
    },
    warehouses: () => prisma_1.prisma.warehouse.findMany({
        orderBy: { createdAt: 'desc' },
    }),
    locations: ({ warehouseId }) => prisma_1.prisma.storageLocation.findMany({
        where: warehouseId ? { warehouseId } : undefined,
        include: { warehouse: true },
        orderBy: { createdAt: 'desc' },
    }),
    queueStatus: () => job_queue_1.queueSystem.snapshot(),
    recentEvents: () => domain_events_1.domainEvents.recent().map((event) => ({
        type: event.type,
        occurredAt: event.occurredAt,
        payload: JSON.stringify(event.payload),
    })),
    refreshAlerts: async () => {
        const result = await job_queue_1.queueSystem.enqueue('refresh-all-alerts', {});
        return {
            queued: true,
            message: `Queued ${result.type} job`,
        };
    },
};
const executeGraphQL = async (query, variables, context) => (0, graphql_1.graphql)({
    schema,
    source: query,
    rootValue,
    variableValues: variables,
    contextValue: context,
});
exports.executeGraphQL = executeGraphQL;
