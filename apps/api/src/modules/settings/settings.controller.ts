import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from "@nestjs/common"
import {
  createProgramContract,
  getCurrentDepositNoticeContract,
  getSettingsContract,
  listDepositNoticesContract,
  publishDepositNoticeContract,
  updateProgramContract,
  updateSettingsContract,
} from "@repo/contracts"
import type { UpdateSettingsRequest } from "@repo/contracts"
import { CoordinatorOnly } from "../../common/decorators/coordinator-only.decorator"
import {
  CurrentIdentity,
  type RequestIdentity,
} from "../../common/decorators/current-identity.decorator"
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe"
import { SettingsService } from "./settings.service"

@Controller()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @CoordinatorOnly()
  @Get(getSettingsContract.path)
  getSettings() {
    return this.service.getSettings()
  }

  @CoordinatorOnly()
  @Patch(updateSettingsContract.path)
  updateSettings(
    @CurrentIdentity() identity: RequestIdentity,
    @Body(new ZodValidationPipe(updateSettingsContract.request))
    body: UpdateSettingsRequest
  ) {
    if (identity.state !== "active")
      throw new UnauthorizedException("Authentication required")
    return this.service.updateSettings(identity.profileId, body)
  }

  @Get(getCurrentDepositNoticeContract.path)
  currentNotice(@CurrentIdentity() identity: RequestIdentity) {
    if (identity.state !== "active")
      throw new UnauthorizedException("Active account required")
    return this.service.currentDepositNotice()
  }

  @CoordinatorOnly()
  @Get(listDepositNoticesContract.path)
  listNotices() {
    return this.service.listDepositNotices()
  }

  @CoordinatorOnly()
  @Post(publishDepositNoticeContract.path)
  publishNotice(
    @CurrentIdentity() identity: RequestIdentity,
    @Body(new ZodValidationPipe(publishDepositNoticeContract.request))
    body: { text: string }
  ) {
    if (identity.state !== "active")
      throw new UnauthorizedException("Authentication required")
    return this.service.publishDepositNotice(identity.profileId, body.text)
  }

  @CoordinatorOnly()
  @Post(createProgramContract.path)
  createProgram(
    @CurrentIdentity() identity: RequestIdentity,
    @Body(new ZodValidationPipe(createProgramContract.request))
    body: { name: string }
  ) {
    if (identity.state !== "active")
      throw new UnauthorizedException("Authentication required")
    return this.service.createProgram(identity.profileId, body.name)
  }

  @CoordinatorOnly()
  @Patch(updateProgramContract.path)
  updateProgram(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("programId") id: string,
    @Body(new ZodValidationPipe(updateProgramContract.request))
    body: { name: string; active: boolean }
  ) {
    if (identity.state !== "active")
      throw new UnauthorizedException("Authentication required")
    return this.service.updateProgram(
      identity.profileId,
      id,
      body.name,
      body.active
    )
  }
}
