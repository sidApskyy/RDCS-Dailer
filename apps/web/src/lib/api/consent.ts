import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

import { apiClient , getTenantId } from '../api-client';

// Types
export interface Consent {
  id: string;
  tenantId: string;
  leadId: string;
  phoneNumber?: string;
  status: 'granted' | 'revoked' | 'expired' | 'unknown';
  type: 'express' | 'implied' | 'verbal' | 'written' | 'electronic';
  source?: string;
  method?: string;
  evidence?: any;
  jurisdiction?: string;
  scope?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateConsentDto {
  leadId: string;
  phoneNumber?: string;
  type: string;
  source?: string;
  method?: string;
  evidence?: any;
  jurisdiction?: string;
  scope?: string;
  expiresAt?: string;
}

export interface ConsentListParams {
  page?: number;
  limit?: number;
  leadId?: string;
  status?: string;
}

export interface ConsentListResponse {
  data: Consent[];
  total: number;
  page: number;
  limit: number;
}

// Queries
export function useConsents(params?: ConsentListParams, options?: UseQueryOptions<ConsentListResponse>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['consents', params],
    queryFn: async () => {
      const response = await apiClient.get<ConsentListResponse>('/consents', {
        params: { ...params, tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

export function useLeadConsents(leadId: string, options?: UseQueryOptions<Consent[]>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['consents', leadId],
    queryFn: async () => {
      const response = await apiClient.get<Consent[]>(`/consents/lead/${leadId}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!leadId && !!tenantId,
    ...options,
  });
}

export function useCheckConsent(leadId: string, options?: UseQueryOptions<any>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['consent-check', leadId],
    queryFn: async () => {
      const response = await apiClient.get(`/consents/lead/${leadId}/check`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!leadId && !!tenantId,
    ...options,
  });
}

// Mutations
export function useCreateConsent() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (data: CreateConsentDto) => {
      const response = await apiClient.post<Consent>('/consents', { ...data, tenantId });
      return response.data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['consents'] });
      queryClient.invalidateQueries({ queryKey: ['consents', leadId] });
    },
  });
}

export function useRevokeConsent() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ leadId, reason }: { leadId: string; reason?: string }) => {
      const response = await apiClient.post(`/consents/lead/${leadId}/revoke`, { reason, tenantId });
      return response.data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['consents'] });
      queryClient.invalidateQueries({ queryKey: ['consents', leadId] });
    },
  });
}

export function useConsentById(id: string, options?: UseQueryOptions<Consent>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['consent', id],
    queryFn: async () => {
      const response = await apiClient.get<Consent>(`/consents/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!id && !!tenantId,
    ...options,
  });
}

export function useLatestConsent(leadId: string, options?: UseQueryOptions<Consent>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['consent-latest', leadId],
    queryFn: async () => {
      const response = await apiClient.get<Consent>(`/consents/lead/${leadId}/latest`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!leadId && !!tenantId,
    ...options,
  });
}

export function useConsentByPhone(phoneNumber: string, options?: UseQueryOptions<Consent[]>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['consent-phone', phoneNumber],
    queryFn: async () => {
      const response = await apiClient.get<Consent[]>(`/consents/phone/${phoneNumber}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!phoneNumber && !!tenantId,
    ...options,
  });
}
