import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

import { apiClient , getTenantId } from '../api-client';

// Types
export interface Lead {
  id: string;
  tenantId: string;
  organizationId?: string;
  leadListId?: string;
  campaignId?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status: 'new' | 'eligible' | 'assigned' | 'in_progress' | 'callback' | 'contacted' | 'not_contacted' | 'dnc' | 'disqualified' | 'converted' | 'exhausted' | 'archived';
  timezone: string;
  customFields?: any;
  assignedTo?: string;
  assignedTeamId?: string;
  assignedAt?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateLeadDto {
  leadListId?: string;
  campaignId?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  timezone?: string;
  customFields?: any;
}

export interface UpdateLeadDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  timezone?: string;
  customFields?: any;
}

export interface LeadListParams {
  page?: number;
  limit?: number;
  status?: string;
  campaignId?: string;
  leadListId?: string;
  assignedTo?: string;
  search?: string;
}

export interface LeadListResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

// Queries
export function useLeads(params?: LeadListParams, options?: UseQueryOptions<LeadListResponse>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const response = await apiClient.get<LeadListResponse>('/leads', {
        params: { ...params, tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

export function useLead(id: string, options?: UseQueryOptions<Lead>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const response = await apiClient.get<Lead>(`/leads/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!id && !!tenantId,
    ...options,
  });
}

// Mutations
export function useCreateLead() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (data: CreateLeadDto) => {
      const response = await apiClient.post<Lead>('/leads', { ...data, tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLeadDto }) => {
      const response = await apiClient.patch<Lead>(`/leads/${id}`, { ...data, tenantId });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<Lead>(`/leads/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.post<Lead>(`/leads/${id}/transition`, { status, tenantId });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
    },
  });
}

// Assign endpoint removed - backend does not have a separate assign endpoint
// Assignment should be handled by the update lead endpoint
