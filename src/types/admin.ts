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
  sortOrder?: "asc" | "desc";
}