import { Injectable } from '@nestjs/common';

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
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
  buildWhereClause(filters: QueryFilter[], search?: string, searchFields?: string[]): any {
    const where: any = {};

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

  private applyFilter(where: any, filter: QueryFilter): void {
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

  buildOrderByClause(sort: QuerySort[]): any {
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

  parseQueryParams(params: any): QueryOptions {
    const options: QueryOptions = {
      skip: params.skip ? parseInt(params.skip) : 0,
      take: params.take ? Math.min(parseInt(params.take), 100) : 50,
    };

    if (params.search) {
      options.search = params.search;
    }

    if (params.searchFields) {
      options.searchFields = Array.isArray(params.searchFields) ? params.searchFields : params.searchFields.split(',');
    }

    if (params.sort) {
      const sortFields = Array.isArray(params.sort) ? params.sort : params.sort.split(',');
      options.sort = sortFields.map((field: string) => {
        const direction = field.startsWith('-') ? 'desc' : 'asc';
        const fieldName = field.startsWith('-') ? field.substring(1) : field;
        return { field: fieldName, direction };
      });
    }

    if (params.filters) {
      try {
        options.filters = typeof params.filters === 'string' ? JSON.parse(params.filters) : params.filters;
      } catch (e) {
        console.error('Invalid filters JSON:', e);
      }
    }

    return options;
  }

  async executePaginatedQuery<T>(
    model: any,
    options: QueryOptions,
    additionalWhere?: any,
    additionalInclude?: any,
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
