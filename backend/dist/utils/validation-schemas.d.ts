import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodEmail;
    password: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<{
        ADMIN: "ADMIN";
        USER: "USER";
    }>>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export declare const categorySchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>;
export declare const itemSchema: z.ZodObject<{
    name: z.ZodString;
    sku: z.ZodString;
    categoryId: z.ZodUUID;
    quantity: z.ZodNumber;
    price: z.ZodNumber;
    supplier: z.ZodString;
    location: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    lowStockAt: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const scanSchema: z.ZodObject<{
    qrCode: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=validation-schemas.d.ts.map