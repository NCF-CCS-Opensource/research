import { SetMetadata } from "@nestjs/common"

export const IS_COORDINATOR_ONLY_KEY = "isCoordinatorOnly"
export const CoordinatorOnly = () => SetMetadata(IS_COORDINATOR_ONLY_KEY, true)
