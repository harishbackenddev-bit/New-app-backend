// controllers/admin/tenant/tenant.ts
import { Request, Response } from "express"
import { httpStatusCode } from "../../../lib/constant"
import { errorParser } from "../../../lib/errors/error-response-handler"
import {
    getAllTenantsService,
    getTenantByIdService,
    createTenantService,
    updateTenantService,
    updateTenantStatusService,
    deleteTenantService,
    getTenantStatsService,
    checkSubdomainAvailabilityService,
    getDashboardStatsService
} from "../../../services/admin/tenant/tenant"

// ============================================
// DASHBOARD CONTROLLER
// ============================================

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const result = await getDashboardStatsService(req)
        
        if (!result.success) {
            return res.status(result.code || httpStatusCode.NOT_FOUND).json({
                success: false,
                message: result.message
            })
        }

        return res.status(httpStatusCode.OK).json({
            success: true,
            message: result.message,
            data: result.data
        })
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: message || "An error occurred" 
        })
    }
}

// ============================================
// TENANT CONTROLLERS
// ============================================

/**
 * Get all tenants
 */
export const getAllTenants = async (req: Request, res: Response) => {
    try {
        const result = await getAllTenantsService(req)
        
        if (!result.success) {
            return res.status(result.code || httpStatusCode.BAD_REQUEST).json({
                success: false,
                message: result.message
            })
        }

        return res.status(httpStatusCode.OK).json({
            success: true,
            message: result.message,
            data: result.data,
            pagination: result.pagination
        })
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: message || "An error occurred"
        })
    }
}

/**
 * Get tenant by ID
 */
export const getTenantById = async (req: Request, res: Response) => {
    try {
        const result = await getTenantByIdService(req.params.id)
        
        if (!result.success) {
            return res.status(result.code || httpStatusCode.NOT_FOUND).json({
                success: false,
                message: result.message
            })
        }

        return res.status(httpStatusCode.OK).json({
            success: true,
            message: result.message,
            data: result.data
        })
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: message || "An error occurred"
        })
    }
}

/**
 * Create new tenant
 */
export const createTenant = async (req: Request, res: Response) => {
    try {
        const result = await createTenantService(req)
        
        if (!result.success) {
            return res.status(result.code || httpStatusCode.BAD_REQUEST).json({
                success: false,
                message: result.message
            })
        }

        return res.status(httpStatusCode.CREATED).json({
            success: true,
            message: result.message,
            data: result.data
        })
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: message || "An error occurred"
        })
    }
}

/**
 * Update tenant
 */
export const updateTenant = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const userId = (req as any).currentUser
        const result = await updateTenantService({ id, userId, body: req.body })
        
        if (!result.success) {
            return res.status(result.code || httpStatusCode.BAD_REQUEST).json({
                success: false,
                message: result.message
            })
        }

        return res.status(httpStatusCode.OK).json({
            success: true,
            message: result.message,
            data: result.data
        })
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: message || "An error occurred"
        })
    }
}

/**
 * Update tenant status
 */
export const updateTenantStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const userId = (req as any).currentUser
        const { status } = req.body
        const result = await updateTenantStatusService({ id, userId, status })
        
        if (!result.success) {
            return res.status(result.code || httpStatusCode.BAD_REQUEST).json({
                success: false,
                message: result.message
            })
        }

        return res.status(httpStatusCode.OK).json({
            success: true,
            message: result.message,
            data: result.data
        })
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: message || "An error occurred"
        })
    }
}

/**
 * Delete tenant
 */
export const deleteTenant = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const userId = (req as any).currentUser
        const result = await deleteTenantService({ id, userId })
        
        if (!result.success) {
            return res.status(result.code || httpStatusCode.BAD_REQUEST).json({
                success: false,
                message: result.message
            })
        }

        return res.status(httpStatusCode.OK).json({
            success: true,
            message: result.message,
            data: result.data
        })
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: message || "An error occurred"
        })
    }
}

/**
 * Get tenant statistics
 */
export const getTenantStats = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const result = await getTenantStatsService(id)
        
        if (!result.success) {
            return res.status(result.code || httpStatusCode.NOT_FOUND).json({
                success: false,
                message: result.message
            })
        }

        return res.status(httpStatusCode.OK).json({
            success: true,
            message: result.message,
            data: result.data
        })
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: message || "An error occurred"
        })
    }
}

/**
 * Check subdomain availability
 */
export const checkSubdomainAvailability = async (req: Request, res: Response) => {
    try {
        const { subdomain, excludeId } = req.query
        const result = await checkSubdomainAvailabilityService({ subdomain: subdomain as string, excludeId: excludeId as string })
        
        if (!result.success) {
            return res.status(result.code || httpStatusCode.BAD_REQUEST).json({
                success: false,
                message: result.message
            })
        }

        return res.status(httpStatusCode.OK).json({
            success: true,
            data: result.data
        })
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: message || "An error occurred"
        })
    }
}