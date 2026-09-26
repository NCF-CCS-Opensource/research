import { InvalidProgramNameError } from "./program.errors"

export interface ProgramProperties {
  id: string
  name: string
}

export class Program {
  private constructor(
    readonly id: string,
    readonly name: string
  ) {}

  static create(props: ProgramProperties): Program {
    if (!props.name || props.name.trim() === "") {
      throw new InvalidProgramNameError()
    }
    return new Program(props.id, props.name.trim())
  }
}
