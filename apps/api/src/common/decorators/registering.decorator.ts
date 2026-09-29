import { SetMetadata } from "@nestjs/common"

export const IS_REGISTERING_KEY = "isRegistering"
export const Registering = () => SetMetadata(IS_REGISTERING_KEY, true)
