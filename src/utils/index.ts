import axios from "axios"
import { configDotenv } from "dotenv"
import { Request, Response, NextFunction } from "express"
import { httpStatusCode } from "../../lib/constant"
import { errorResponseHandler } from "../../lib/errors/error-response-handler"
import prisma from "../../lib/prisma"
configDotenv()

export const checkValidAdminRole = (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.headers
    if (role !== 'admin') {
        return res.status(httpStatusCode.FORBIDDEN).json({ 
            success: false, 
            message: "Invalid role" 
        })
    }
    return next()
}

interface Payload {
    description?: string;
    order?: string;
    orderColumn?: string;
    searchFields?: string[];
}

export const queryBuilder = (payload: Payload, querySearchKeyInBackend: string[] = ['name']) => {
    let { description = '', order = '', orderColumn = '', searchFields } = payload;
    
    // Use provided search fields or default ones
    const searchKeys = searchFields || querySearchKeyInBackend;
    
    // Build Prisma where clause
    let where: any = {};
    if (description) {
        where.OR = searchKeys.map(key => ({
            [key]: { contains: description, mode: 'insensitive' }
        }));
    }
    
    // Build Prisma orderBy clause
    let orderBy: any = {};
    if (order && orderColumn) {
        orderBy[orderColumn] = order === 'asc' ? 'asc' : 'desc';
    }

    return { where, orderBy };
}

// Helper function for pagination
export const paginationBuilder = (page?: number, limit?: number) => {
    const pageNumber = Math.max(1, page || 1);
    const pageSize = Math.min(100, Math.max(1, limit || 10));
    
    return {
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        page: pageNumber,
        limit: pageSize
    };
}

// Helper for soft delete filtering
export const excludeSoftDeleted = (includeDeleted: boolean = false) => {
    return includeDeleted ? {} : { deletedAt: null };
}

// Helper for date range filtering
export const dateRangeFilter = (startDate?: string, endDate?: string, field: string = 'createdAt') => {
    const filter: any = {};
    
    if (startDate) {
        filter[field] = { gte: new Date(startDate) };
    }
    if (endDate) {
        filter[field] = { ...filter[field], lte: new Date(endDate) };
    }
    
    return filter;
}

// Helper for building Prisma queries with relationships
export const buildPrismaQuery = (params: {
    search?: string;
    searchFields?: string[];
    filters?: Record<string, any>;
    orderBy?: Record<string, string>;
    include?: Record<string, boolean>;
    page?: number;
    limit?: number;
}) => {
    const { search, searchFields = ['name'], filters = {}, orderBy = {}, include = {}, page, limit } = params;
    
    // Build where clause
    let where: any = { ...filters };
    
    if (search) {
        where.OR = searchFields.map(field => ({
            [field]: { contains: search, mode: 'insensitive' }
        }));
    }
    
    // Build orderBy
    const orderByClause: any = {};
    Object.keys(orderBy).forEach(key => {
        orderByClause[key] = orderBy[key] === 'asc' ? 'asc' : 'desc';
    });
    
    // Build pagination
    const pagination = paginationBuilder(page, limit);
    
    return {
        where,
        orderBy: orderByClause,
        include,
        ...pagination
    };
}

// Example usage for user query
export const buildUserQuery = (params: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
}) => {
    const { search, role, status, page, limit } = params;
    
    const filters: any = {};
    if (role) filters.role = role;
    if (status) filters.status = status;
    
    return buildPrismaQuery({
        search,
        searchFields: ['email', 'full_name', 'phone'],
        filters,
        orderBy: { created_at: 'desc' },
        include: {
            memberships: {
                include: {
                    tenant: true
                }
            }
        },
        page,
        limit
    });
}