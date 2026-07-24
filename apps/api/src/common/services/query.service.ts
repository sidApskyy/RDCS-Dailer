import { Injectable } from '@nestjs/common';

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: string | number | boolean | string[] | number[];
}

export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  filters?: QueryFilter[];
  sort?: QuerySort[];
  skip?: number;
  take?: number;
  search?: string;
  searchFields?: string[];
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class QueryService {
  buildWhereClause(filters: QueryFilter[], search?: string, searchFields?: string[]): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        this.applyFilter(where, filter);
      });
    }

    if (search && searchFields && searchFields.length > 0) {
      where.OR = searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }

    return where;
  }

  private applyFilter(where: Record<string, unknown>, filter: QueryFilter): void {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'eq':
        where[field] = value;
        break;
      case 'ne':
        where[field] = { not: value };
        break;
      case 'gt':
        where[field] = { gt: value };
        break;
      case 'gte':
        where[field] = { gte: value };
        break;
      case 'lt':
        where[field] = { lt: value };
        break;
      case 'lte':
        where[field] = { lte: value };
        break;
      case 'in':
        where[field] = { in: value };
        break;
      case 'nin':
        where[field] = { not: { in: value } };
        break;
      case 'contains':
        where[field] = { contains: value, mode: 'insensitive' };
        break;
      case 'startsWith':
        where[field] = { startsWith: value, mode: 'insensitive' };
        break;
      case 'endsWith':
        where[field] = { endsWith: value, mode: 'insensitive' };
        break;
    }
  }

  buildOrderByClause(sort: QuerySort[]): Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[] {
    if (!sort || sort.length === 0) {
      return { createdAt: 'desc' };
    }

    return sort.map((s) => ({ [s.field]: s.direction }));
  }

  calculatePagination(total: number, skip: number, take: number): {
    page: number;
    pageSize: number;
    totalPages: number;
  } {
    const page = Math.floor(skip / take) + 1;
    const pageSize = take;
    const totalPages = Math.ceil(total / take);

    return { page, pageSize, totalPages };
  }

  parseQueryParams(params: Record<string, unknown>): QueryOptions {
    const options: QueryOptions = {
      skip: typeof params.skip === 'string' ? parseInt(params.skip) : 0,
      take: typeof params.take === 'string' ? Math.min(parseInt(params.take), 100) : 50,
    };

    if (typeof params.search === 'string') {
      options.search = params.search;
    }

    if (params.searchFields) {
      options.searchFields = Array.isArray(params.searchFields) ? params.searchFields as string[] : (params.searchFields as string).split(',');
    }

    if (params.sort) {
      const sortFields = Array.isArray(params.sort) ? params.sort as string[] : (params.sort as string).split(',');
      options.sort = sortFields.map((field: string) => {
        const direction = field.startsWith('-') ? 'desc' : 'asc';
        const fieldName = field.startsWith('-') ? field.substring(1) : field;
        return { field: fieldName, direction };
      });
    }

    if (params.filters) {
      try {
        options.filters = typeof params.filters === 'string' ? JSON.parse(params.filters) : params.filters as QueryFilter[];
      } catch (e) {
        console.error('Invalid filters JSON:', e);
      }
    }

    return options;
  }

  async executePaginatedQuery<T>(
    model: { findMany: (args: unknown) => Promise<T[]>; count: (args: unknown) => Promise<number> },
    options: QueryOptions,
    additionalWhere?: Record<string, unknown>,
    additionalInclude?: Record<string, unknown>,
  ): Promise<QueryResult<T>> {
    const where = {
      ...this.buildWhereClause(options.filters || [], options.search, options.searchFields),
      ...additionalWhere,
    };

    const orderBy = this.buildOrderByClause(options.sort || []);

    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy,
        skip: options.skip,
        take: options.take,
        include: additionalInclude,
      }),
      model.count({ where }),
    ]);

    const pagination = this.calculatePagination(total, options.skip || 0, options.take || 50);

    return {
      data,
      total,
      ...pagination,
    };
  }
}
