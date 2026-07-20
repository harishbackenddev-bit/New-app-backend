import axios from "axios"
import { configDotenv } from "dotenv"
import { Request, Response, NextFunction } from "express"
import { httpStatusCode } from "../lib/constant"
import { errorResponseHandler } from "../lib/errors/error-response-handler"
import prisma from "../lib/prisma"
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
    
    const searchKeys = searchFields || querySearchKeyInBackend;
    
    let where: any = {};
    if (description) {
        where.OR = searchKeys.map(key => ({
            [key]: { contains: description, mode: 'insensitive' }
        }));
    }
    
    let orderBy: any = {};
    if (order && orderColumn) {
        orderBy[orderColumn] = order === 'asc' ? 'asc' : 'desc';
    }

    return { where, orderBy };
}

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

export const excludeSoftDeleted = (includeDeleted: boolean = false) => {
    return includeDeleted ? {} : { deletedAt: null };
}

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

// Fix: Change include type to 'any' to allow nested includes
export const buildPrismaQuery = (params: {
    search?: string;
    searchFields?: string[];
    filters?: Record<string, any>;
    orderBy?: Record<string, string>;
    include?: any;  // Changed from Record<string, boolean> to any
    page?: number;
    limit?: number;
}) => {
    const { search, searchFields = ['name'], filters = {}, orderBy = {}, include = {}, page, limit } = params;
    
    let where: any = { ...filters };
    
    if (search) {
        where.OR = searchFields.map(field => ({
            [field]: { contains: search, mode: 'insensitive' }
        }));
    }
    
    const orderByClause: any = {};
    Object.keys(orderBy).forEach(key => {
        orderByClause[key] = orderBy[key] === 'asc' ? 'asc' : 'desc';
    });
    
    const pagination = paginationBuilder(page, limit);
    
    return {
        where,
        orderBy: orderByClause,
        include,
        ...pagination
    };
}

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
