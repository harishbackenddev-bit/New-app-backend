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



// Dashboard
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const response = await getDashboardStatsService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
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
        const response = await getAllTenantsService(req, res)
        return res.status(httpStatusCode.OK).json(response)
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
        const response = await getTenantByIdService(req, res)
        return res.status(httpStatusCode.OK).json(response)
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
        const response = await createTenantService(req, res)
        return res.status(httpStatusCode.CREATED).json(response)
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
        const response = await updateTenantService(req, res)
        return res.status(httpStatusCode.OK).json(response)
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
        const response = await updateTenantStatusService(req, res)
        return res.status(httpStatusCode.OK).json(response)
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
        const response = await deleteTenantService(req, res)
        return res.status(httpStatusCode.OK).json(response)
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
        const response = await getTenantStatsService(req, res)
        return res.status(httpStatusCode.OK).json(response)
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
        const response = await checkSubdomainAvailabilityService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: message || "An error occurred"
        })
    }
}