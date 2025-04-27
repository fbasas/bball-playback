/**
 * Interface for sort parameters
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Utility functions for sorting data
 */
export class SortUtils {
  /**
   * Default sort direction
   */
  public static readonly DEFAULT_DIRECTION: 'asc' | 'desc' = 'asc';

  /**
   * Parses sort parameters from query string
   * @param sortField The sort field name
   * @param sortDirection The sort direction
   * @param defaultField Default field to sort by
   * @param allowedFields Array of allowed field names
   * @returns Validated sort parameters
   */
  public static parseSortParams(
    sortField?: string | null,
    sortDirection?: string | null,
    defaultField?: string,
    allowedFields?: string[]
  ): SortParams {
    // Default sort field
    let field = defaultField || 'id';
    
    // Validate sort field if allowed fields are provided
    if (sortField && (!allowedFields || allowedFields.includes(sortField))) {
      field = sortField;
    }

    // Validate sort direction
    let direction: 'asc' | 'desc' = this.DEFAULT_DIRECTION;
    if (sortDirection && ['asc', 'desc'].includes(sortDirection.toLowerCase())) {
      direction = sortDirection.toLowerCase() as 'asc' | 'desc';
    }

    return { field, direction };
  }

  /**
   * Sorts an array of objects based on sort parameters
   * @param items The array to sort
   * @param sort The sort parameters
   * @returns Sorted array
   */
  public static sortArray<T>(items: T[], sort: SortParams): T[] {
    const { field, direction } = sort;

    return [...items].sort((a, b) => {
      const aValue = (a as any)[field];
      const bValue = (b as any)[field];

      // Handle null or undefined values
      if (aValue === undefined || aValue === null) {
        return direction === 'asc' ? -1 : 1;
      }
      if (bValue === undefined || bValue === null) {
        return direction === 'asc' ? 1 : -1;
      }

      // Compare based on value type
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        return direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Default comparison for other types
      return direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }

  /**
   * Builds SQL ORDER BY clause from sort parameters
   * @param sort The sort parameters
   * @param tablePrefix Optional table prefix for column names
   * @returns SQL ORDER BY clause
   */
  public static buildSqlOrderByClause(
    sort: SortParams,
    tablePrefix?: string
  ): string {
    const { field, direction } = sort;
    const columnName = tablePrefix ? `${tablePrefix}.${field}` : field;
    return `${columnName} ${direction.toUpperCase()}`;
  }

  /**
   * Validates sort field against allowed fields
   * @param field The field to validate
   * @param allowedFields Array of allowed field names
   * @param defaultField Default field to use if validation fails
   * @returns Validated field name
   */
  public static validateSortField(
    field: string,
    allowedFields: string[],
    defaultField: string = 'id'
  ): string {
    return allowedFields.includes(field) ? field : defaultField;
  }
}