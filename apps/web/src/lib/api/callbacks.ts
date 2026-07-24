import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

import { apiClient , getTenantId } from '../api-client';

// Types
export interface Callback {
  id: string;
  tenantId: string;
  leadId: string;
  campaignId?: string;
  phoneNumber?: string;
  scheduledFor: string;
  scheduledBy: string;
  assignedTo?: string;
  assignedTeamId?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'missed';
  priority: number;
  completedAt?: string;
  createdAt: string;
}

export interface CreateCallbackDto {
  leadId: string;
  campaignId?: string;
  phoneNumber?: string;
  scheduledFor: string;
  assignedTo?: string;
  assignedTeamId?: string;
  notes?: string;
  priority?: number;
}

export interface UpdateCallbackDto {
  scheduledFor?: string;
  assignedTo?: string;
  assignedTeamId?: string;
  notes?: string;
  priority?: number;
}

export interface CallbackListParams {
  page?: number;
  limit?: number;
  status?: string;
  leadId?: string;
  campaignId?: string;
  assignedTo?: string;
}

export interface CallbackListResponse {
  data: Callback[];
  total: number;
  page: number;
  limit: number;
}

// Queries
export function useCallbacks(params?: CallbackListParams, options?: UseQueryOptions<CallbackListResponse>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['callbacks', params],
    queryFn: async () => {
      const response = await apiClient.get<CallbackListResponse>('/callbacks', {
        params: { ...params, tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

export function useCallback(id: string, options?: UseQueryOptions<Callback>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['callback', id],
    queryFn: async () => {
      const response = await apiClient.get<Callback>(`/callbacks/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!id && !!tenantId,
    ...options,
  });
}

export function useDueCallbacks(options?: UseQueryOptions<Callback[]>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['callbacks', 'due'],
    queryFn: async () => {
      const response = await apiClient.get<Callback[]>('/callbacks/due', {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

// Mutations
export function useCreateCallback() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (data: CreateCallbackDto) => {
      const response = await apiClient.post<Callback>('/callbacks', { ...data, tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
    },
  });
}

export function useUpdateCallback() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCallbackDto }) => {
      const response = await apiClient.patch<Callback>(`/callbacks/${id}`, { ...data, tenantId });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
      queryClient.invalidateQueries({ queryKey: ['callback', id] });
    },
  });
}

export function useCompleteCallback() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<Callback>(`/callbacks/${id}/complete`, { tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
    },
  });
}

export function useCancelCallback() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<Callback>(`/callbacks/${id}/cancel`, { tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
    },
  });
}
