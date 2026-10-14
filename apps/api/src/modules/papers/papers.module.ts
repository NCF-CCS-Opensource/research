import { Module } from "@nestjs/common"
import { PapersController } from "./papers.controller"
import { PaperUseCases } from "./paper.use-cases"

@Module({ controllers: [PapersController], providers: [PaperUseCases] })
export class PapersModule {}
