// types/admin.ts
export interface CreateTenantPayload {
    name: string;
    subdomain: string;
    treasurerEmail: string;
    bankAccount?: string;
    maxMembers?: number;
    subscriptionTier?: string;
}

export interface UpdateTenantPayload {
    name?: string;
    subdomain?: string;
    treasurerEmail?: string;
    status?: string;
    maxMembers?: number;
    subscriptionTier?: string;
}

export interface TenantQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface TenantResponse {
    id: string;
    name: string;
    subdomain: string;
    status: string;
    createdDate: Date;
    treasurer: string;
    treasurerEmail: string;
    bankAccount?: string;
    members: number;
    totalFunds: number;
    maxMembers?: number;
    subscriptionTier?: string;
}

export interface DashboardStats {
    totalTenants: number;
    totalEvents: number;
    totalContributions: number;
    pendingPayments: number;
    memberships: {
        tenantId: string;
        tenantName: string;
        role: string;
        joinedAt: Date;
    }[];
}