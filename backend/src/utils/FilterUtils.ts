/**
 * Interface for filter parameters
 */
export interface FilterParams {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Utility functions for filtering data
 */
export class FilterUtils {
  /**
   * Filters an array of objects based on filter parameters
   * @param items The array to filter
   * @param filters The filter parameters
   * @returns Filtered array
   */
  public static filterArray<T>(items: T[], filters: FilterParams): T[] {
    if (!filters || Object.keys(filters).length === 0) {
      return items;
    }

    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        // Skip undefined or null filter values
        if (value === undefined || value === null) {
          return true;
        }

        const itemValue = (item as any)[key];

        // Handle different value types
        if (typeof value === 'string') {
          // Case-insensitive string comparison
          return typeof itemValue === 'string' && 
                 itemValue.toLowerCase().includes(value.toLowerCase());
        } else if (typeof value === 'number') {
          return itemValue === value;
        } else if (typeof value === 'boolean') {
          return itemValue === value;
        }

        return false;
      });
    });
  }

  /**
   * Builds SQL WHERE clauses from filter parameters
   * @param filters The filter parameters
   * @param tablePrefix Optional table prefix for column names
   * @returns Object with SQL where clauses and parameter values
   */
  public static buildSqlWhereClauses(
    filters: FilterParams,
    tablePrefix?: string
  ): { whereClauses: string[]; params: any[] } {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (!filters || Object.keys(filters).length === 0) {
      return { whereClauses, params };
    }

    Object.entries(filters).forEach(([key, value]) => {
      // Skip undefined or null filter values
      if (value === undefined || value === null) {
        return;
      }

      const columnName = tablePrefix ? `${tablePrefix}.${key}` : key;

      if (typeof value === 'string') {
        // Use LIKE for string values
        whereClauses.push(`${columnName} LIKE ?`);
        params.push(`%${value}%`);
      } else {
        // Use equality for other value types
        whereClauses.push(`${columnName} = ?`);
        params.push(value);
      }
    });

    return { whereClauses, params };
  }

  /**
   * Validates filter parameters against allowed fields
   * @param filters The filter parameters
   * @param allowedFields Array of allowed field names
   * @returns Validated filter parameters (invalid fields removed)
   */
  public static validateFilters(
    filters: FilterParams,
    allowedFields: string[]
  ): FilterParams {
    const validatedFilters: FilterParams = {};

    if (!filters) {
      return validatedFilters;
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        validatedFilters[key] = value;
      }
    });

    return validatedFilters;
  }
}