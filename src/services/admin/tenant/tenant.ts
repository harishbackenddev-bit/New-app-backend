// services/admin/tenant/tenant.ts
import { Request, Response } from "express"
import prisma from "../../../lib/prisma"
import { errorResponseHandler } from "../../../lib/errors/error-response-handler"
import { httpStatusCode } from "../../../lib/constant"
import { generateAuthToken, hashPassword, comparePassword, generateNumericOTP } from "../../../utils/auth-utils"
import { sendPasswordResetEmail } from "../../../utils/mails/mail"
import { CreateTenantPayload, UpdateTenantPayload ,TenantQueryParams} from "../../../types/admin"


// ============================================
// TENANT SERVICES
// ============================================

/**
 * Get all tenants with pagination and filters
 */
export const getAllTenantsService = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = req.query as TenantQueryParams

        const skip = (Number(page) - 1) * Number(limit)
        const take = Number(limit)

        // Build where clause
        let where: any = {}

        if (status !== 'all') {
            where.status = status
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { subdomain: { contains: search, mode: 'insensitive' } },
                {
                    memberships: {
                        some: {
                            user: {
                                email: { contains: search, mode: 'insensitive' }
                            }
                        }
                    }
                }
            ]
        }

        // Get total count
        const total = await prisma.tenant.count({ where })

        // Get tenants with related data
        const tenants = await prisma.tenant.findMany({
            where,
            skip,
            take,
            orderBy: {
                [sortBy]: sortOrder
            },
            include: {
                memberships: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                email: true,
                                full_name: true
                            }
                        }
                    },
                    where: {
                        role: 'treasurer'
                    },
                    take: 1
                },
                _count: {
                    select: {
                        memberships: true,
                        contributions: true,
                        payouts: true
                    }
                }
            }
        })

        // Format tenant data
        const formattedTenants = tenants.map(tenant => {
            const treasurer = tenant.memberships[0]?.user
            const totalFunds = tenant.contributions?.reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0

            return {
                id: tenant.tenant_id,
                name: tenant.name,
                subdomain: tenant.subdomain,
                status: tenant.status,
                createdDate: tenant.created_at,
                treasurer: treasurer?.full_name || 'Not Assigned',
                treasurerEmail: treasurer?.email || 'Not Assigned',
                bankAccount: tenant.bank_account_ref || 'Not Set',
                members: tenant._count?.memberships || 0,
                totalFunds: totalFunds,
                maxMembers: 100,
                subscriptionTier: 'basic'
            }
        })

        return {
            success: true,
            message: "Tenants fetched successfully",
            data: formattedTenants,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        }

    } catch (error: any) {
        console.error("Get all tenants error:", error)
        return errorResponseHandler(
            error.message || "Failed to fetch tenants",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Get tenant by ID
 */
export const getTenantByIdService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const userId = (req as any).currentUser

        const tenant = await prisma.tenant.findUnique({
            where: { tenant_id: id },
            include: {
                memberships: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                email: true,
                                full_name: true,
                                phone: true
                            }
                        }
                    }
                },
                fundraising_events: {
                    include: {
                        event_members: {
                            include: {
                                membership: {
                                    include: {
                                        user: {
                                            select: {
                                                full_name: true,
                                                email: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                contributions: {
                    include: {
                        event_member: {
                            include: {
                                membership: {
                                    include: {
                                        user: {
                                            select: {
                                                full_name: true,
                                                email: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                payouts: {
                    include: {
                        beneficiary: true,
                        membership: {
                            include: {
                                user: {
                                    select: {
                                        full_name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                },
                notifications: true,
                audit_logs: {
                    orderBy: {
                        created_at: 'desc'
                    },
                    take: 10
                }
            }
        })

        if (!tenant) {
            return errorResponseHandler(
                "Tenant not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Calculate total funds from contributions
        const totalFunds = tenant.contributions.reduce((sum, c) => sum + Number(c.amount), 0)

        const formattedTenant = {
            ...tenant,
            totalFunds,
            memberCount: tenant.memberships.length,
            eventCount: tenant.fundraising_events.length,
            contributionCount: tenant.contributions.length,
            payoutCount: tenant.payouts.length
        }

        return {
            success: true,
            message: "Tenant fetched successfully",
            data: formattedTenant
        }

    } catch (error: any) {
        console.error("Get tenant by id error:", error)
        return errorResponseHandler(
            error.message || "Failed to fetch tenant",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Create new tenant
 */
export const createTenantService = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser
        const {
            name,
            subdomain,
            treasurerEmail,
            bankAccount,
            maxMembers = 100,
            subscriptionTier = 'basic'
        }: CreateTenantPayload = req.body

        // Check if subdomain is available
        const existingTenant = await prisma.tenant.findUnique({
            where: { subdomain: subdomain.toLowerCase() }
        })

        if (existingTenant) {
            return errorResponseHandler(
                "Subdomain already taken. Please choose another.",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        // Check if treasurer email exists
        let treasurerUser = await prisma.user.findUnique({
            where: { email: treasurerEmail }
        })

        // Create tenant with transaction
        const result = await prisma.$transaction(async (prisma) => {
            // Create tenant
            const tenant = await prisma.tenant.create({
                data: {
                    name,
                    subdomain: subdomain.toLowerCase(),
                    bank_account_ref: bankAccount,
                    status: 'pending',
                    created_at: new Date()
                }
            })

            // If treasurer doesn't exist, create user
            if (!treasurerUser) {
                const tempPassword = generateNumericOTP(8)
                const hashedPassword = await hashPassword(tempPassword)

                treasurerUser = await prisma.user.create({
                    data: {
                        email: treasurerEmail,
                        full_name: 'Treasurer',
                        password_hash: hashedPassword,
                        created_at: new Date()
                    }
                })

                // TODO: Send welcome email with temporary password
            }

            // Create membership for treasurer
            await prisma.membership.create({
                data: {
                    tenant_id: tenant.tenant_id,
                    user_id: treasurerUser.user_id,
                    role: 'treasurer',
                    status: 'active',
                    joined_at: new Date()
                }
            })

            // Create audit log
            await prisma.auditLog.create({
                data: {
                    tenant_id: tenant.tenant_id,
                    user_id: userId,
                    action: 'TENANT_CREATED',
                    entity_type: 'tenant',
                    entity_id: tenant.tenant_id,
                    details: {
                        name,
                        subdomain,
                        treasurerEmail,
                        maxMembers,
                        subscriptionTier
                    },
                    created_at: new Date()
                }
            })

            return tenant
        })

        return {
            success: true,
            message: "Tenant created successfully",
            data: result
        }

    } catch (error: any) {
        console.error("Create tenant error:", error)
        return errorResponseHandler(
            error.message || "Failed to create tenant",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Update tenant
 */
export const updateTenantService = async (req: Request, res: Response) => {
    console.log("req.body",req.body)
    try {
        const { id } = req.params
        const userId = (req as any).currentUser
        const {
            name,
            subdomain,
            treasurerEmail,
            status,
            maxMembers,
            subscriptionTier
        }: UpdateTenantPayload = req.body

        // Check if tenant exists
        const existingTenant = await prisma.tenant.findUnique({
            where: { tenant_id: id }
        })

        if (!existingTenant) {
            return errorResponseHandler(
                "Tenant not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Check if subdomain is available (if changing)
        if (subdomain && subdomain !== existingTenant.subdomain) {
            const subdomainExists = await prisma.tenant.findFirst({
                where: {
                    subdomain: subdomain.toLowerCase(),
                    tenant_id: { not: id }
                }
            })

            if (subdomainExists) {
                return errorResponseHandler(
                    "Subdomain already taken. Please choose another.",
                    httpStatusCode.BAD_REQUEST,
                    res
                )
            }
        }

        // Update tenant with transaction
        const result = await prisma.$transaction(async (prisma) => {
            // Update tenant
            const tenant = await prisma.tenant.update({
                where: { tenant_id: id },
                data: {
                    name: name || existingTenant.name,
                    subdomain: subdomain ? subdomain.toLowerCase() : existingTenant.subdomain,
                    status: status || existingTenant.status
                    
                }
            })

            // Update treasurer if email changed
            if (treasurerEmail) {
                // Find current treasurer
                const currentTreasurer = await prisma.membership.findFirst({
                    where: {
                        tenant_id: id,
                        role: 'treasurer'
                    },
                    include: {
                        user: true
                    }
                })

                if (currentTreasurer?.user?.email !== treasurerEmail) {
                    // Check if new treasurer exists
                    let newTreasurer = await prisma.user.findUnique({
                        where: { email: treasurerEmail }
                    })

                    if (!newTreasurer) {
                        const tempPassword = generateNumericOTP(8)
                        const hashedPassword = await hashPassword(tempPassword)

                        newTreasurer = await prisma.user.create({
                            data: {
                                email: treasurerEmail,
                                full_name: 'Treasurer',
                                password_hash: hashedPassword,
                                created_at: new Date()
                            }
                        })

                        // TODO: Send welcome email with temporary password
                    }

                    // Update membership
                    if (currentTreasurer) {
                        await prisma.membership.update({
                            where: { membership_id: currentTreasurer.membership_id },
                            data: {
                                user_id: newTreasurer.user_id,
                                status: 'active'
                            }
                        })
                    } else {
                        // Create new membership if none exists
                        await prisma.membership.create({
                            data: {
                                tenant_id: id,
                                user_id: newTreasurer.user_id,
                                role: 'treasurer',
                                status: 'active',
                                joined_at: new Date()
                            }
                        })
                    }
                }
            }

            // Create audit log
            await prisma.auditLog.create({
                data: {
                    tenant_id: id,
                    user_id: userId,
                    action: 'TENANT_UPDATED',
                    entity_type: 'tenant',
                    entity_id: id,
                    details: {
                        name,
                        subdomain,
                        status,
                        maxMembers,
                        subscriptionTier
                    },
                    created_at: new Date()
                }
            })

            return tenant
        })

        return {
            success: true,
            message: "Tenant updated successfully",
            data: result
        }

    } catch (error: any) {
        console.error("Update tenant error:", error)
        return errorResponseHandler(
            error.message || "Failed to update tenant",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Update tenant status
 */
export const updateTenantStatusService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { status } = req.body
        const userId = (req as any).currentUser

        if (!['active', 'pending', 'suspended', 'inactive'].includes(status)) {
            return errorResponseHandler(
                "Invalid status value",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        const tenant = await prisma.tenant.update({
            where: { tenant_id: id },
            data: {
                status
                
            }
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                tenant_id: id,
                user_id: userId,
                action: 'TENANT_STATUS_UPDATED',
                entity_type: 'tenant',
                entity_id: id,
                details: { status },
                created_at: new Date()
            }
        })

        return {
            success: true,
            message: `Tenant status updated to ${status}`,
            data: tenant
        }

    } catch (error: any) {
        console.error("Update tenant status error:", error)
        return errorResponseHandler(
            error.message || "Failed to update tenant status",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Delete tenant (force delete - removes all related data)
 */
export const deleteTenantService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const userId = (req as any).currentUser

        // Check if tenant exists
        const tenant = await prisma.tenant.findUnique({
            where: { tenant_id: id }
        })

        if (!tenant) {
            return errorResponseHandler(
                "Tenant not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Create audit log BEFORE deleting the tenant
        // Use a transaction to ensure everything is atomic
        await prisma.$transaction(async (prisma) => {
            // 1. Create audit log first (before tenant is deleted)
            await prisma.auditLog.create({
                data: {
                    tenant_id: id,
                    user_id: userId,
                    action: 'TENANT_DELETED',
                    entity_type: 'tenant',
                    entity_id: id,
                    details: {
                        name: tenant.name,
                        subdomain: tenant.subdomain,
                        deletedAt: new Date().toISOString()
                    },
                    created_at: new Date()
                }
            })

            // 2. Delete all related data
            // Delete contributions (child of event_members)
            await prisma.contribution.deleteMany({
                where: { tenant_id: id }
            })
            
            // Delete event members (child of fundraising_events)
            await prisma.eventMember.deleteMany({
                where: {
                    event: {
                        tenant_id: id
                    }
                }
            })
            
            // Delete fundraising events
            await prisma.fundraisingEvent.deleteMany({
                where: { tenant_id: id }
            })
            
            // Delete payouts
            await prisma.payout.deleteMany({
                where: { tenant_id: id }
            })
            
            // Delete beneficiaries
            await prisma.beneficiary.deleteMany({
                where: { tenant_id: id }
            })
            
            // Delete notifications
            await prisma.notification.deleteMany({
                where: { tenant_id: id }
            })
            
            // Delete audit logs (if any other audit logs exist)
            await prisma.auditLog.deleteMany({
                where: { tenant_id: id }
            })
            
            // Delete memberships
            await prisma.membership.deleteMany({
                where: { tenant_id: id }
            })
            
            // Finally delete the tenant
            await prisma.tenant.delete({
                where: { tenant_id: id }
            })
        })

        return {
            success: true,
            message: `Tenant "${tenant.name}" deleted successfully along with all associated data`,
            data: {
                id: tenant.tenant_id,
                name: tenant.name,
                subdomain: tenant.subdomain
            }
        }

    } catch (error: any) {
        console.error("Delete tenant error:", error)
        return errorResponseHandler(
            error.message || "Failed to delete tenant",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Get tenant statistics
 */
export const getTenantStatsService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const stats = await prisma.$transaction(async (prisma) => {
            // Get tenant
            const tenant = await prisma.tenant.findUnique({
                where: { tenant_id: id }
            })

            if (!tenant) {
                throw new Error('Tenant not found')
            }

            // Get member count
            const memberCount = await prisma.membership.count({
                where: { tenant_id: id }
            })

            // Get contribution stats
            const contributionStats = await prisma.contribution.aggregate({
                where: { tenant_id: id },
                _sum: {
                    amount: true
                },
                _count: {
                    contribution_id: true
                }
            })

            // Get payout stats
            const payoutStats = await prisma.payout.aggregate({
                where: { tenant_id: id },
                _sum: {
                    amount: true
                },
                _count: {
                    payout_id: true
                }
            })

            // Get event stats
            const eventStats = await prisma.fundraisingEvent.aggregate({
                where: { tenant_id: id },
                _count: {
                    event_id: true
                }
            })

            return {
                tenantName: tenant.name,
                memberCount,
                totalContributions: contributionStats._sum.amount || 0,
                totalPayouts: payoutStats._sum.amount || 0,
                contributionCount: contributionStats._count.contribution_id || 0,
                payoutCount: payoutStats._count.payout_id || 0,
                eventCount: eventStats._count.event_id || 0,
                balance: (contributionStats._sum.amount || 0) - (payoutStats._sum.amount || 0)
            }
        })

        return {
            success: true,
            message: "Tenant statistics fetched successfully",
            data: stats
        }

    } catch (error: any) {
        console.error("Get tenant stats error:", error)
        return errorResponseHandler(
            error.message || "Failed to fetch tenant statistics",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Check subdomain availability
 */
export const checkSubdomainAvailabilityService = async (req: Request, res: Response) => {
    try {
        const { subdomain, excludeId } = req.query

        if (!subdomain) {
            return errorResponseHandler(
                "Subdomain parameter is required",
                httpStatusCode.BAD_REQUEST,
                res
            )
        }

        const where: any = {
            subdomain: (subdomain as string).toLowerCase()
        }

        if (excludeId) {
            where.tenant_id = { not: excludeId as string }
        }

        const existing = await prisma.tenant.findFirst({ where })

        return {
            success: true,
            data: {
                available: !existing,
                subdomain: (subdomain as string).toLowerCase()
            }
        }

    } catch (error: any) {
        console.error("Check subdomain error:", error)
        return errorResponseHandler(
            error.message || "Failed to check subdomain availability",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}

/**
 * Get Dashboard Stats Service
 */
export const getDashboardStatsService = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser

        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            include: {
                memberships: {
                    include: {
                        tenant: true,
                        event_members: {
                            include: {
                                event: true,
                                contributions: true
                            }
                        }
                    }
                }
            }
        })

        if (!user) {
            return errorResponseHandler(
                "User not found",
                httpStatusCode.NOT_FOUND,
                res
            )
        }

        // Calculate stats
        const totalEvents = user.memberships.reduce((acc, membership) => {
            return acc + membership.event_members.length
        }, 0)

        const totalContributions = user.memberships.reduce((acc, membership) => {
            return acc + membership.event_members.reduce((sum, em) => {
                return sum + em.contributions.reduce((s, c) => s + Number(c.amount), 0)
            }, 0)
        }, 0)

        const pendingPayments = user.memberships.reduce((acc, membership) => {
            return acc + membership.event_members.filter(em => em.status === 'pending').length
        }, 0)

        const stats = {
            totalTenants: user.memberships.length,
            totalEvents,
            totalContributions,
            pendingPayments,
            memberships: user.memberships.map(m => ({
                tenantId: m.tenant_id,
                tenantName: m.tenant.name,
                role: m.role,
                joinedAt: m.joined_at
            }))
        }

        return {
            success: true,
            message: "Dashboard stats fetched successfully",
            data: stats
        }
    } catch (error: any) {
        console.error("Dashboard stats error:", error)
        return errorResponseHandler(
            error.message || "Failed to fetch dashboard stats",
            httpStatusCode.INTERNAL_SERVER_ERROR,
            res
        )
    }
}