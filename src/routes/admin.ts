// routes/admin/tenant.ts
import { Router } from "express"
import { checkAuth } from "src/middleware/check-auth"
import {
    getAllTenants,
    getTenantById,
    createTenant,
    updateTenant,
    updateTenantStatus,
    deleteTenant,
    getTenantStats,
    checkSubdomainAvailability,
    getDashboardStats
} from "../controllers/admin/tenant/tenant";

const router = Router()

// All routes require authentication
router.use(checkAuth)

router.get("/dashboard", getDashboardStats);

// Tenant management routes
router.get("/tenants", getAllTenants)
router.get("/tenants/:id", getTenantById)
router.get("/tenants/:id/stats", getTenantStats)
router.get("/check-subdomain", checkSubdomainAvailability)

router.post("/tenants", createTenant)
router.put("/tenants/:id", updateTenant)
router.patch("/tenants/:id/status", updateTenantStatus)
router.delete("/tenants/:id", deleteTenant)

export { router }