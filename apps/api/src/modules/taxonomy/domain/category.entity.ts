export interface CategoryProperties {
  id: string
  name: string
}

export class Category {
  private constructor(
    readonly id: string,
    readonly name: string
  ) {}

  static create(props: CategoryProperties): Category {
    if (!props.name || props.name.trim() === "") {
      throw new Error("Category name cannot be empty")
    }
    return new Category(props.id, props.name.trim())
  }
}
