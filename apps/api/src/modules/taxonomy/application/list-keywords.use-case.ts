import { Inject, Injectable } from "@nestjs/common"
import type { TaxonomyItem } from "@repo/contracts"
import { KEYWORD_QUERY, type KeywordQuery } from "./keyword-query.interface"

@Injectable()
export class ListKeywordsUseCase {
  constructor(
    @Inject(KEYWORD_QUERY) private readonly keywordQuery: KeywordQuery
  ) {}

  async execute(): Promise<TaxonomyItem[]> {
    return this.keywordQuery.list()
  }
}
