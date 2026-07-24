import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

import { apiClient , getTenantId } from '../api-client';

// Types
export interface Disposition {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: 'positive' | 'negative' | 'neutral' | 'callback' | 'dnc';
  outcome: 'terminal' | 'non_terminal';
  retryBehavior?: string;
  callbackEligible: boolean;
  dncBehavior?: string;
  isActive: boolean;
  description?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateDispositionDto {
  code: string;
  name: string;
  category: string;
  outcome: string;
  retryBehavior?: string;
  callbackEligible?: boolean;
  dncBehavior?: string;
  description?: string;
}

export interface UpdateDispositionDto {
  name?: string;
  category?: string;
  outcome?: string;
  retryBehavior?: string;
  callbackEligible?: boolean;
  dncBehavior?: string;
  description?: string;
  isActive?: boolean;
}

export interface DispositionListParams {
  page?: number;
  limit?: number;
  category?: string;
  isActive?: boolean;
}

export interface DispositionListResponse {
  data: Disposition[];
  total: number;
  page: number;
  limit: number;
}

// Queries
export function useDispositions(params?: DispositionListParams, options?: UseQueryOptions<DispositionListResponse>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['dispositions', params],
    queryFn: async () => {
      const response = await apiClient.get<DispositionListResponse>('/dispositions', {
        params: { ...params, tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

export function useDisposition(id: string, options?: UseQueryOptions<Disposition>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['disposition', id],
    queryFn: async () => {
      const response = await apiClient.get<Disposition>(`/dispositions/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!id && !!tenantId,
    ...options,
  });
}

export function useCampaignDispositions(campaignId: string, options?: UseQueryOptions<Disposition[]>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['dispositions', 'campaign', campaignId],
    queryFn: async () => {
      const response = await apiClient.get<Disposition[]>(`/dispositions/campaign/${campaignId}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!campaignId && !!tenantId,
    ...options,
  });
}

// Mutations
export function useCreateDisposition() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (data: CreateDispositionDto) => {
      const response = await apiClient.post<Disposition>('/dispositions', { ...data, tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
    },
  });
}

export function useUpdateDisposition() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDispositionDto }) => {
      const response = await apiClient.patch<Disposition>(`/dispositions/${id}`, { ...data, tenantId });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
      queryClient.invalidateQueries({ queryKey: ['disposition', id] });
    },
  });
}

export function useDeleteDisposition() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<Disposition>(`/dispositions/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
    },
  });
}

export function useApplyDispositionToLead() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ leadId, dispositionId, phoneNumber, notes }: { leadId: string; dispositionId: string; phoneNumber?: string; notes?: string }) => {
      const response = await apiClient.post(`/dispositions/apply/${leadId}`, { dispositionId, phoneNumber, notes, tenantId });
      return response.data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    },
  });
}

export function useAttachDispositionToCampaign() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ dispositionId, campaignId }: { dispositionId: string; campaignId: string }) => {
      const response = await apiClient.post(`/dispositions/${dispositionId}/attach/${campaignId}`, { tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
    },
  });
}

export function useDetachDispositionFromCampaign() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ dispositionId, campaignId }: { dispositionId: string; campaignId: string }) => {
      const response = await apiClient.delete(`/dispositions/${dispositionId}/detach/${campaignId}`, {
        params: { tenantId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
    },
  });
}

export function useDispositionByCode(code: string, options?: UseQueryOptions<Disposition>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['disposition-code', code],
    queryFn: async () => {
      const response = await apiClient.get<Disposition>(`/dispositions/code/${code}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!code && !!tenantId,
    ...options,
  });
}
