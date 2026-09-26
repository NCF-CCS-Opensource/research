import { z } from "zod"

export const programSchema = z.object({
  id: z.string().uuid({ message: "Invalid Program ID" }),
  name: z.string().min(1, { message: "Program name is required" }),
})

export type Program = z.infer<typeof programSchema>

export const listProgramsContract = {
  method: "GET" as const,
  path: "/taxonomy/list-programs" as const,
  response: z.array(programSchema),
}

export type ListProgramsResponse = z.infer<typeof listProgramsContract.response>
