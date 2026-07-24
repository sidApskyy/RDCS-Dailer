import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

import { apiClient , getTenantId } from '../api-client';

// Types
export interface CallingWindow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
}

export interface HolidayCalendar {
  id: string;
  tenantId: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
  timezone: string;
  createdAt: string;
}

export interface CreateCallingWindowDto {
  name: string;
  description?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone?: string;
}

export interface UpdateCallingWindowDto {
  name?: string;
  description?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface CallingWindowListParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface CallingWindowListResponse {
  data: CallingWindow[];
  total: number;
  page: number;
  limit: number;
}

// Queries
export function useCallingWindows(params?: CallingWindowListParams, options?: UseQueryOptions<CallingWindowListResponse>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['calling-windows', params],
    queryFn: async () => {
      const response = await apiClient.get<CallingWindowListResponse>('/calling-windows', {
        params: { ...params, tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

export function useCallingWindow(id: string, options?: UseQueryOptions<CallingWindow>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['calling-window', id],
    queryFn: async () => {
      const response = await apiClient.get<CallingWindow>(`/calling-windows/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!id && !!tenantId,
    ...options,
  });
}

// Holidays endpoint removed - backend does not have a separate holidays endpoint

export function useCheckCurrentCallingWindow(options?: UseQueryOptions<any>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['calling-window-current'],
    queryFn: async () => {
      const response = await apiClient.get('/calling-windows/check/current', {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

export function useCheckNextCallingWindow(options?: UseQueryOptions<any>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['calling-window-next'],
    queryFn: async () => {
      const response = await apiClient.get('/calling-windows/check/next', {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

// Mutations
export function useCreateCallingWindow() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (data: CreateCallingWindowDto) => {
      const response = await apiClient.post<CallingWindow>('/calling-windows', { ...data, tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calling-windows'] });
    },
  });
}

export function useUpdateCallingWindow() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCallingWindowDto }) => {
      const response = await apiClient.patch<CallingWindow>(`/calling-windows/${id}`, { ...data, tenantId });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['calling-windows'] });
      queryClient.invalidateQueries({ queryKey: ['calling-window', id] });
    },
  });
}

export function useDeleteCallingWindow() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<CallingWindow>(`/calling-windows/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calling-windows'] });
    },
  });
}
