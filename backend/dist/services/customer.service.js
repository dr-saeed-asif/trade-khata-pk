"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerService = void 0;
const prisma_1 = require("../config/prisma");
const api_error_1 = require("../utils/api-error");
exports.customerService = {
    list: async (query) => {
        const search = query.search?.trim();
        const where = search
            ? {
                OR: [
                    { name: { contains: search } },
                    { phone: { contains: search } },
                    { address: { contains: search } },
                ],
            }
            : {};
        return prisma_1.prisma.customer.findMany({ where, orderBy: { name: 'asc' }, take: 200 });
    },
    getById: async (id) => {
        const customer = await prisma_1.prisma.customer.findUnique({ where: { id } });
        if (!customer)
            throw new api_error_1.ApiError(404, 'Customer not found');
        return customer;
    },
    create: async (payload) => {
        if (!payload.name.trim())
            throw new api_error_1.ApiError(400, 'Customer name is required');
        return prisma_1.prisma.customer.create({
            data: {
                name: payload.name.trim(),
                phone: payload.phone?.trim(),
                address: payload.address?.trim(),
                customerType: payload.customerType ?? 'RETAIL',
                cnicOrTaxNo: payload.cnicOrTaxNo?.trim(),
            },
        });
    },
    update: async (id, payload) => {
        await exports.customerService.getById(id);
        return prisma_1.prisma.customer.update({
            where: { id },
            data: {
                name: payload.name?.trim(),
                phone: payload.phone?.trim(),
                address: payload.address?.trim(),
                customerType: payload.customerType,
                cnicOrTaxNo: payload.cnicOrTaxNo?.trim(),
            },
        });
    },
    delete: async (id) => {
        const count = await prisma_1.prisma.invoice.count({ where: { customerId: id } });
        if (count > 0)
            throw new api_error_1.ApiError(409, 'Cannot delete customer with invoices');
        await prisma_1.prisma.customer.delete({ where: { id } });
    },
};
