import { Module } from "@nestjs/common"
import { PaperController } from "./paper.controller"
import { PaperUseCases } from "./paper.use-cases"

@Module({ controllers: [PaperController], providers: [PaperUseCases] })
export class PaperModule {}
