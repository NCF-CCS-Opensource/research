export interface CategoryDto {
  id: string
  name: string
}

export const CATEGORY_QUERY = Symbol("CATEGORY_QUERY")

export interface CategoryQuery {
  list(): Promise<CategoryDto[]>
}
