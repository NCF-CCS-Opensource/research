import type {
  Author,
  Category,
  DashboardData,
  DashboardMetric,
  Keyword,
  PaginatedResponse,
  PdfAccessDashboard,
  ResearchDetail,
  ResearchSummary,
  SearchSuggestions,
} from "@/types/api"

export const MOCK_CATEGORIES: Category[] = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Software Engineering",
    researchCount: 4,
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    name: "Data Science",
    researchCount: 3,
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    name: "Artificial Intelligence & Machine Learning",
    researchCount: 5,
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    name: "Cybersecurity & Information Assurance",
    researchCount: 3,
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    name: "Human-Computer Interaction",
    researchCount: 2,
  },
  {
    id: "10000000-0000-0000-0000-000000000006",
    name: "Internet of Things & Embedded Systems",
    researchCount: 2,
  },
  {
    id: "10000000-0000-0000-0000-000000000007",
    name: "Cloud & Distributed Computing",
    researchCount: 2,
  },
]

export const MOCK_AUTHORS: Author[] = [
  {
    id: "30000000-0000-0000-0000-000000000001",
    name: "Ada Lovelace",
    email: "ada.lovelace@ncf.edu.ph",
    paperCount: 3,
  },
  {
    id: "30000000-0000-0000-0000-000000000002",
    name: "Grace Hopper",
    email: "grace.hopper@ncf.edu.ph",
    paperCount: 3,
  },
  {
    id: "30000000-0000-0000-0000-000000000003",
    name: "Hidden Researcher",
    email: null,
    paperCount: 0,
  },
  {
    id: "30000000-0000-0000-0000-000000000004",
    name: "Alan Turing",
    email: "alan.turing@ncf.edu.ph",
    paperCount: 2,
  },
  {
    id: "30000000-0000-0000-0000-000000000005",
    name: "Margaret Hamilton",
    email: "margaret.hamilton@ncf.edu.ph",
    paperCount: 2,
  },
  {
    id: "30000000-0000-0000-0000-000000000006",
    name: "Claude Shannon",
    email: "claude.shannon@ncf.edu.ph",
    paperCount: 1,
  },
  {
    id: "30000000-0000-0000-0000-000000000007",
    name: "Barbara Liskov",
    email: "barbara.liskov@ncf.edu.ph",
    paperCount: 2,
  },
  {
    id: "30000000-0000-0000-0000-000000000008",
    name: "Radia Perlman",
    email: "radia.perlman@ncf.edu.ph",
    paperCount: 1,
  },
  {
    id: "30000000-0000-0000-0000-000000000009",
    name: "Edsger Dijkstra",
    email: "edsger.dijkstra@ncf.edu.ph",
    paperCount: 1,
  },
  {
    id: "30000000-0000-0000-0000-000000000010",
    name: "Tim Berners-Lee",
    email: "tim.bernerslee@ncf.edu.ph",
    paperCount: 1,
  },
]

export const MOCK_KEYWORDS: Keyword[] = [
  { id: "20000000-0000-0000-0000-000000000001", name: "Accessibility" },
  { id: "20000000-0000-0000-0000-000000000002", name: "Machine Learning" },
  { id: "20000000-0000-0000-0000-000000000003", name: "Deep Learning" },
  { id: "20000000-0000-0000-0000-000000000004", name: "Cybersecurity" },
  { id: "20000000-0000-0000-0000-000000000005", name: "Cloud Architecture" },
  {
    id: "20000000-0000-0000-0000-000000000006",
    name: "Natural Language Processing",
  },
  { id: "20000000-0000-0000-0000-000000000007", name: "Internet of Things" },
  { id: "20000000-0000-0000-0000-000000000008", name: "Computer Vision" },
  { id: "20000000-0000-0000-0000-000000000009", name: "Zero Trust" },
  { id: "20000000-0000-0000-0000-000000000010", name: "Microservices" },
]

export const MOCK_INSTITUTIONS = [
  {
    id: "50000000-0000-0000-0000-000000000001",
    name: "Naga College Foundation",
    institutionId: null,
  },
  {
    id: "50000000-0000-0000-0000-000000000002",
    name: "NCF College of Computer Studies",
    institutionId: null,
  },
]

export const MOCK_PROGRAMS = [
  {
    id: "60000000-0000-0000-0000-000000000001",
    name: "Bachelor of Science in Computer Science",
    institutionId: "50000000-0000-0000-0000-000000000001",
  },
  {
    id: "60000000-0000-0000-0000-000000000002",
    name: "Bachelor of Science in Information Technology",
    institutionId: "50000000-0000-0000-0000-000000000001",
  },
  {
    id: "60000000-0000-0000-0000-000000000003",
    name: "Bachelor of Science in Information Systems",
    institutionId: "50000000-0000-0000-0000-000000000001",
  },
  {
    id: "60000000-0000-0000-0000-000000000004",
    name: "Master in Information Technology",
    institutionId: "50000000-0000-0000-0000-000000000001",
  },
]

export const MOCK_RESEARCHES: ResearchDetail[] = [
  {
    id: "40000000-0000-0000-0000-000000000001",
    title: "Accessible Research Discovery",
    abstract:
      "A public computing archive designed for inclusive discovery, accessible interfaces, and assistive browsing standards across collegiate repositories.",
    publishDate: "2026-01-15",
    status: "approved",
    uploadComplete: true,
    viewCount: 124,
    downloadCount: 42,
    citationExportCount: 18,
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-01-16T10:00:00.000Z",
    uploaderId: "user-1",
    uploader: {
      id: "user-1",
      email: "ada.lovelace@ncf.edu.ph",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "user",
    },
    authors: [MOCK_AUTHORS[0], MOCK_AUTHORS[1]],
    categories: [MOCK_CATEGORIES[0], MOCK_CATEGORIES[4]],
    keywords: [MOCK_KEYWORDS[0], MOCK_KEYWORDS[9]],
  },
  {
    id: "40000000-0000-0000-0000-000000000002",
    title: "Ethical Machine Learning",
    abstract:
      "Practical safeguards, algorithmic fairness, and accountability frameworks for responsible data science and automated decision systems in higher education.",
    publishDate: "2026-02-01",
    status: "approved",
    uploadComplete: true,
    viewCount: 98,
    downloadCount: 31,
    citationExportCount: 14,
    createdAt: "2026-02-01T09:00:00.000Z",
    updatedAt: "2026-02-02T11:00:00.000Z",
    uploaderId: "user-2",
    uploader: {
      id: "user-2",
      email: "grace.hopper@ncf.edu.ph",
      firstName: "Grace",
      lastName: "Hopper",
      role: "user",
    },
    authors: [MOCK_AUTHORS[1], MOCK_AUTHORS[3]],
    categories: [MOCK_CATEGORIES[1], MOCK_CATEGORIES[2]],
    keywords: [MOCK_KEYWORDS[1], MOCK_KEYWORDS[2]],
  },
  {
    id: "40000000-0000-0000-0000-000000000005",
    title: "Zero-Trust Architecture for Campus Networks",
    abstract:
      "Evaluating micro-segmentation, identity-aware proxies, and continuous authentication models across academic institutions and distributed campuses.",
    publishDate: "2026-02-20",
    status: "approved",
    uploadComplete: true,
    viewCount: 76,
    downloadCount: 22,
    citationExportCount: 9,
    createdAt: "2026-02-20T14:30:00.000Z",
    updatedAt: "2026-02-21T09:15:00.000Z",
    uploaderId: "user-3",
    uploader: {
      id: "user-3",
      email: "radia.perlman@ncf.edu.ph",
      firstName: "Radia",
      lastName: "Perlman",
      role: "admin",
    },
    authors: [MOCK_AUTHORS[7], MOCK_AUTHORS[4]],
    categories: [MOCK_CATEGORIES[3], MOCK_CATEGORIES[6]],
    keywords: [MOCK_KEYWORDS[3], MOCK_KEYWORDS[8], MOCK_KEYWORDS[4]],
  },
  {
    id: "40000000-0000-0000-0000-000000000006",
    title: "Automated Defect Detection Using Graph Neural Networks",
    abstract:
      "Static code analysis combined with graph representation learning to identify concurrency hazards and security vulnerabilities in continuous integration pipelines.",
    publishDate: "2026-03-01",
    status: "approved",
    uploadComplete: true,
    viewCount: 154,
    downloadCount: 68,
    citationExportCount: 27,
    createdAt: "2026-03-01T11:00:00.000Z",
    updatedAt: "2026-03-02T13:00:00.000Z",
    uploaderId: "user-4",
    uploader: {
      id: "user-4",
      email: "barbara.liskov@ncf.edu.ph",
      firstName: "Barbara",
      lastName: "Liskov",
      role: "user",
    },
    authors: [MOCK_AUTHORS[6], MOCK_AUTHORS[0]],
    categories: [MOCK_CATEGORIES[0], MOCK_CATEGORIES[2]],
    keywords: [MOCK_KEYWORDS[2], MOCK_KEYWORDS[9]],
  },
  {
    id: "40000000-0000-0000-0000-000000000007",
    title: "Low-Power LoRaWAN Sensor Mesh for Microclimate Monitoring",
    abstract:
      "Design, power optimization, and field evaluation of resilient low-power sensor nodes for environmental monitoring and regional agricultural telemetry.",
    publishDate: "2026-03-10",
    status: "approved",
    uploadComplete: true,
    viewCount: 62,
    downloadCount: 19,
    citationExportCount: 5,
    createdAt: "2026-03-10T16:00:00.000Z",
    updatedAt: "2026-03-11T10:00:00.000Z",
    uploaderId: "user-5",
    uploader: {
      id: "user-5",
      email: "claude.shannon@ncf.edu.ph",
      firstName: "Claude",
      lastName: "Shannon",
      role: "user",
    },
    authors: [MOCK_AUTHORS[5], MOCK_AUTHORS[9]],
    categories: [MOCK_CATEGORIES[5]],
    keywords: [MOCK_KEYWORDS[6], MOCK_KEYWORDS[4]],
  },
  {
    id: "40000000-0000-0000-0000-000000000008",
    title: "Multilingual Low-Resource Sentiment Analysis for Regional Dialects",
    abstract:
      "Transformer-based cross-lingual transfer learning tailored for under-resourced Philippine languages during emergency response and disaster communication.",
    publishDate: "2026-03-18",
    status: "approved",
    uploadComplete: true,
    viewCount: 210,
    downloadCount: 89,
    citationExportCount: 45,
    createdAt: "2026-03-18T10:30:00.000Z",
    updatedAt: "2026-03-19T08:00:00.000Z",
    uploaderId: "user-6",
    uploader: {
      id: "user-6",
      email: "alan.turing@ncf.edu.ph",
      firstName: "Alan",
      lastName: "Turing",
      role: "user",
    },
    authors: [MOCK_AUTHORS[3], MOCK_AUTHORS[1]],
    categories: [MOCK_CATEGORIES[2], MOCK_CATEGORIES[1]],
    keywords: [MOCK_KEYWORDS[5], MOCK_KEYWORDS[1]],
  },
  {
    id: "40000000-0000-0000-0000-000000000009",
    title: "Formal Verification of Distributed Consensus Protocols",
    abstract:
      "Mechanized mathematical proofs and safety invariant checks for fault-tolerant state machine replication over partially synchronous networks.",
    publishDate: "2026-03-25",
    status: "approved",
    uploadComplete: true,
    viewCount: 88,
    downloadCount: 34,
    citationExportCount: 12,
    createdAt: "2026-03-25T13:45:00.000Z",
    updatedAt: "2026-03-26T09:00:00.000Z",
    uploaderId: "user-7",
    uploader: {
      id: "user-7",
      email: "edsger.dijkstra@ncf.edu.ph",
      firstName: "Edsger",
      lastName: "Dijkstra",
      role: "user",
    },
    authors: [MOCK_AUTHORS[8], MOCK_AUTHORS[6]],
    categories: [MOCK_CATEGORIES[6], MOCK_CATEGORIES[0]],
    keywords: [MOCK_KEYWORDS[4], MOCK_KEYWORDS[9]],
  },
  {
    id: "40000000-0000-0000-0000-000000000010",
    title: "Adaptive User Interfaces for Cognitive Accessibility",
    abstract:
      "Context-aware dynamic layout restructuring and readability enhancement for neurodivergent learners in virtual laboratory environments.",
    publishDate: "2026-04-02",
    status: "approved",
    uploadComplete: true,
    viewCount: 115,
    downloadCount: 41,
    citationExportCount: 19,
    createdAt: "2026-04-02T15:20:00.000Z",
    updatedAt: "2026-04-03T11:00:00.000Z",
    uploaderId: "user-8",
    uploader: {
      id: "user-8",
      email: "margaret.hamilton@ncf.edu.ph",
      firstName: "Margaret",
      lastName: "Hamilton",
      role: "user",
    },
    authors: [MOCK_AUTHORS[4], MOCK_AUTHORS[0]],
    categories: [MOCK_CATEGORIES[4], MOCK_CATEGORIES[0]],
    keywords: [MOCK_KEYWORDS[0]],
  },
  {
    id: "40000000-0000-0000-0000-000000000003",
    title: "Pending Private Draft",
    abstract:
      "This pending record must not be discoverable in public searches.",
    publishDate: "2026-02-15",
    status: "pending",
    uploadComplete: true,
    viewCount: 0,
    downloadCount: 0,
    citationExportCount: 0,
    createdAt: "2026-02-15T00:00:00.000Z",
    updatedAt: "2026-02-15T00:00:00.000Z",
    uploaderId: "user-hidden",
    authors: [MOCK_AUTHORS[2]],
    categories: [MOCK_CATEGORIES[1]],
    keywords: [MOCK_KEYWORDS[1]],
  },
  {
    id: "40000000-0000-0000-0000-000000000004",
    title: "Rejected Private Draft",
    abstract:
      "This rejected record must not be discoverable in public searches.",
    publishDate: "2026-03-15",
    status: "rejected",
    rejectionReason:
      "Incomplete literature review and methodology description.",
    uploadComplete: true,
    viewCount: 0,
    downloadCount: 0,
    citationExportCount: 0,
    createdAt: "2026-03-15T00:00:00.000Z",
    updatedAt: "2026-03-15T00:00:00.000Z",
    uploaderId: "user-hidden",
    authors: [MOCK_AUTHORS[2]],
    categories: [MOCK_CATEGORIES[1]],
    keywords: [MOCK_KEYWORDS[1]],
  },
]

export function getMockApprovedResearches(): ResearchDetail[] {
  return MOCK_RESEARCHES.filter((r) => r.status === "approved")
}

export function searchMockResearch(
  query: Record<string, string | number | undefined> = {}
): PaginatedResponse<ResearchSummary> {
  const page = Math.max(1, Number(query.page ?? 1) || 1)
  const limit = Math.max(1, Number(query.limit ?? 10) || 10)
  const statusFilter = query.status ? String(query.status) : "approved"

  let results = MOCK_RESEARCHES.filter((item) => {
    if (statusFilter === "all") return true
    return item.status === statusFilter
  })

  const q = query.q ? String(query.q).trim().toLowerCase() : ""
  if (q) {
    results = results
      .map((item) => {
        let score = 0
        const titleLower = item.title.toLowerCase()
        const abstractLower = (item.abstract ?? "").toLowerCase()
        const authorMatch = item.authors?.some((a) =>
          a.name.toLowerCase().includes(q)
        )
        const categoryMatch = item.categories?.some((c) =>
          c.name.toLowerCase().includes(q)
        )
        const keywordMatch = item.keywords?.some((k) =>
          k.name.toLowerCase().includes(q)
        )

        if (titleLower === q) score += 10
        else if (titleLower.startsWith(q)) score += 6
        else if (titleLower.includes(q)) score += 4

        if (authorMatch) score += 5
        if (categoryMatch) score += 3
        if (keywordMatch) score += 3
        if (abstractLower.includes(q)) score += 2

        return { item, score }
      })
      .filter(({ score }) => score > 0)
      .map(({ item, score }) => ({ ...item, rank: score }))
  }

  if (query.category) {
    const cat = String(query.category).toLowerCase()
    results = results.filter((r) =>
      r.categories?.some(
        (c) => c.id.toLowerCase() === cat || c.name.toLowerCase() === cat
      )
    )
  }

  if (query.keyword) {
    const kw = String(query.keyword).toLowerCase()
    results = results.filter((r) =>
      r.keywords?.some(
        (k) => k.id.toLowerCase() === kw || k.name.toLowerCase() === kw
      )
    )
  }

  if (query.author) {
    const auth = String(query.author).toLowerCase()
    results = results.filter((r) =>
      r.authors?.some(
        (a) =>
          a.id.toLowerCase() === auth ||
          a.name.toLowerCase().includes(auth)
      )
    )
  }

  if (query.dateFrom) {
    const from = String(query.dateFrom)
    results = results.filter((r) => (r.publishDate ?? "") >= from)
  }

  if (query.dateTo) {
    const to = String(query.dateTo)
    results = results.filter((r) => (r.publishDate ?? "") <= to)
  }

  const sort = String(query.sort ?? "relevance")
  results.sort((a, b) => {
    if (sort === "date") {
      const dateA = a.publishDate ?? a.createdAt ?? ""
      const dateB = b.publishDate ?? b.createdAt ?? ""
      return dateB.localeCompare(dateA)
    }
    if (sort === "views") {
      return (b.viewCount ?? 0) - (a.viewCount ?? 0)
    }
    if (sort === "downloads") {
      return (b.downloadCount ?? 0) - (a.downloadCount ?? 0)
    }
    if (sort === "citations") {
      return (b.citationExportCount ?? 0) - (a.citationExportCount ?? 0)
    }
    // relevance default
    if ((b.rank ?? 0) !== (a.rank ?? 0)) {
      return (b.rank ?? 0) - (a.rank ?? 0)
    }
    const dateA = a.publishDate ?? a.createdAt ?? ""
    const dateB = b.publishDate ?? b.createdAt ?? ""
    return dateB.localeCompare(dateA)
  })

  const total = results.length
  const offset = (page - 1) * limit
  const data = results.slice(offset, offset + limit)

  return {
    data,
    meta: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export function getMockRecentResearch(limit = 6): PaginatedResponse<ResearchSummary> {
  return searchMockResearch({ limit, page: 1, sort: "date" })
}

export function getMockResearch(id: string): ResearchDetail | null {
  const item = MOCK_RESEARCHES.find((r) => r.id === id)
  return item ? { ...item } : null
}

export function getMockCategories(): Category[] {
  const approved = getMockApprovedResearches()
  return MOCK_CATEGORIES.map((cat) => {
    const count = approved.filter((r) =>
      r.categories?.some((c) => c.id === cat.id)
    ).length
    return { ...cat, researchCount: count }
  })
}

export function getMockCategory(id: string, page = 1) {
  const limit = 10
  const category = MOCK_CATEGORIES.find((c) => c.id === id)
  if (!category) return null

  const search = searchMockResearch({ category: id, page, limit, sort: "date" })
  return {
    data: {
      ...category,
      researchCount: search.meta.total,
      researches: search.data,
    },
    meta: search.meta,
  }
}

export function getMockAuthors(
  query: Record<string, string | number | undefined> = {}
): PaginatedResponse<Author> {
  const page = Math.max(1, Number(query.page ?? 1) || 1)
  const limit = Math.max(1, Number(query.limit ?? 20) || 20)
  const search = query.search ? String(query.search).toLowerCase() : ""

  const approved = getMockApprovedResearches()
  let authors = MOCK_AUTHORS.map((author) => {
    const paperCount = approved.filter((r) =>
      r.authors?.some((a) => a.id === author.id)
    ).length
    return { ...author, paperCount }
  })

  if (search) {
    authors = authors.filter((a) => a.name.toLowerCase().includes(search))
  }

  authors.sort((a, b) => a.name.localeCompare(b.name))
  const total = authors.length
  const offset = (page - 1) * limit

  return {
    data: authors.slice(offset, offset + limit),
    meta: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export function getMockAuthor(id: string): Author | null {
  const author = MOCK_AUTHORS.find((a) => a.id === id)
  if (!author) return null
  const approved = getMockApprovedResearches()
  const paperCount = approved.filter((r) =>
    r.authors?.some((a) => a.id === author.id)
  ).length
  return { ...author, paperCount }
}

export function getMockAuthorPapers(id: string, page = 1) {
  return searchMockResearch({ author: id, page, limit: 10, sort: "date" })
}

export function getMockKeywords(): Keyword[] {
  return [...MOCK_KEYWORDS]
}

export function getMockSuggestions(q: string): SearchSuggestions {
  const query = q.trim().toLowerCase()
  if (query.length < 2) return { researches: [], authors: [] }

  const researches = searchMockResearch({ q: query, page: 1, limit: 4 })
  const authors = getMockAuthors({ search: query, page: 1, limit: 3 })

  return {
    researches: researches.data.map(({ id, title, rank = 0 }) => ({
      id,
      title,
      similarity: rank,
    })),
    authors: authors.data.map(({ id, name }) => ({ id, name })),
  }
}

export function getMockPdfAccessDashboard(): PdfAccessDashboard {
  return {
    mine: [
      {
        id: "req-1",
        researchId: "40000000-0000-0000-0000-000000000005",
        researchTitle: "Zero-Trust Architecture for Campus Networks",
        ownerName: "Radia Perlman",
        requestNote:
          "Conducting academic thesis review on collegiate zero-trust boundaries.",
        status: "pending",
        createdAt: "2026-03-02T08:30:00.000Z",
      },
    ],
    pending: [
      {
        id: "req-2",
        researchId: "40000000-0000-0000-0000-000000000001",
        researchTitle: "Accessible Research Discovery",
        requesterName: "Grace Hopper",
        requesterInstitution: "Naga College Foundation",
        requesterProgram: "Bachelor of Science in Computer Science",
        requestNote:
          "Referencing UI accessibility metrics for assistive browsing survey.",
        status: "pending",
        createdAt: "2026-03-05T10:00:00.000Z",
      },
    ],
    grants: [
      {
        id: "req-3",
        researchId: "40000000-0000-0000-0000-000000000006",
        researchTitle: "Automated Defect Detection Using Graph Neural Networks",
        requesterName: "Alan Turing",
        requesterInstitution: "Naga College Foundation",
        requesterProgram: "Bachelor of Science in Computer Science",
        status: "approved",
        createdAt: "2026-02-28T09:00:00.000Z",
        grantedAt: "2026-03-01T14:00:00.000Z",
      },
    ],
  }
}

export function getMockNotifications() {
  return [
    {
      id: "notif-1",
      user_id: "user-1",
      research_id: "40000000-0000-0000-0000-000000000001",
      message:
        "Grace Hopper submitted a PDF Access Request for 'Accessible Research Discovery'.",
      read: false,
      created_at: "2026-03-05T10:00:00.000Z",
    },
    {
      id: "notif-2",
      user_id: "user-1",
      research_id: "40000000-0000-0000-0000-000000000006",
      message:
        "Your PDF Access Request for 'Automated Defect Detection Using Graph Neural Networks' was approved.",
      read: true,
      created_at: "2026-03-01T14:00:00.000Z",
    },
  ]
}

export function getMockAuditLogs() {
  return [
    {
      id: "audit-1",
      admin_id: "admin-1",
      research_id: "40000000-0000-0000-0000-000000000006",
      action: "research.approved",
      meta: { title: "Automated Defect Detection Using Graph Neural Networks" },
      created_at: "2026-03-01T11:00:00.000Z",
    },
    {
      id: "audit-2",
      admin_id: "admin-1",
      research_id: "40000000-0000-0000-0000-000000000004",
      action: "research.rejected",
      meta: {
        title: "Rejected Private Draft",
        reason: "Incomplete literature review and methodology description.",
      },
      created_at: "2026-03-15T00:00:00.000Z",
    },
  ]
}

export function getMockDashboard(
  scope: "personal" | "admin" = "personal",
  period: 30 | 90 = 30
): DashboardData {
  const isAdmin = scope === "admin"
  const approvedPapers = getMockApprovedResearches()

  const daysCount = period
  const days: Array<{ date: string } & Record<DashboardMetric, number>> = []
  const today = new Date("2026-04-15T00:00:00.000Z")

  let totalViews = 0
  let totalDownloads = 0
  let totalCitations = 0

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    const views = Math.floor(10 + Math.sin(i * 0.3) * 5 + (i % 5))
    const downloads = Math.floor(3 + (views % 4))
    const citations = Math.floor(1 + (downloads % 3))

    totalViews += views
    totalDownloads += downloads
    totalCitations += citations

    days.push({
      date: dateStr,
      researchViews: views,
      authorizedDownloads: downloads,
      citationExports: citations,
    })
  }

  const prevViews = Math.round(totalViews * 0.85)
  const prevDownloads = Math.round(totalDownloads * 0.8)
  const prevCitations = Math.round(totalCitations * 0.9)

  return {
    scope,
    mode: isAdmin ? "admin" : "owner",
    isAdmin,
    generatedAt: new Date().toISOString(),
    cards: isAdmin
      ? {
          activeAccounts: 48,
          recentRegistrations: 7,
          approvedResearch: approvedPapers.length,
          readyForModeration: 1,
          pdfAccessRequestsLast30Days: 14,
          researchViews: totalViews,
          authorizedDownloads: totalDownloads,
          citationExports: totalCitations,
        }
      : {
          ownedResearch: 3,
          savedResearch: 5,
          pendingPdfRequests: 1,
          grantedResearchPdfs: 2,
          unreadNotifications: 1,
          researchViews: totalViews,
          authorizedDownloads: totalDownloads,
          citationExports: totalCitations,
        },
    docket: isAdmin
      ? [
          {
            id: "docket-1",
            kind: "moderation",
            title: "Pending Private Draft",
            label: "Ready for Moderation",
            detail: "Uploaded by Hidden Researcher · 1 file attached",
            href: "/admin/research",
            createdAt: "2026-02-15T00:00:00.000Z",
          },
        ]
      : [
          {
            id: "docket-2",
            kind: "pdf_request",
            title: "Accessible Research Discovery",
            label: "PDF Access Request",
            detail: "Grace Hopper requested access",
            href: "/dashboard/pdf-requests",
            createdAt: "2026-03-05T10:00:00.000Z",
          },
        ],
    recentActivity: [
      {
        kind: "view",
        title: "Automated Defect Detection Using Graph Neural Networks",
        detail: "15 new Research Views this week",
        occurredAt: "2026-04-14T12:00:00.000Z",
        href: "/research/40000000-0000-0000-0000-000000000006",
      },
      {
        kind: "citation",
        title: "Multilingual Low-Resource Sentiment Analysis for Regional Dialects",
        detail: "BibTeX Citation Export by authenticated researcher",
        occurredAt: "2026-04-13T09:30:00.000Z",
        href: "/research/40000000-0000-0000-0000-000000000008",
      },
    ],
    comparisons: approvedPapers.slice(0, 4).map((paper) => ({
      id: paper.id,
      title: paper.title,
      researchViews: paper.viewCount ?? 0,
      authorizedDownloads: paper.downloadCount ?? 0,
      citationExports: paper.citationExportCount ?? 0,
      pendingRequests: paper.id.endsWith("1") ? 1 : 0,
    })),
    recentAudit: isAdmin
      ? [
          {
            action: "research.approved",
            title: "Automated Defect Detection Using Graph Neural Networks",
            createdAt: "2026-03-01T11:00:00.000Z",
            href: "/admin/audit",
          },
          {
            action: "research.rejected",
            title: "Rejected Private Draft",
            createdAt: "2026-03-15T00:00:00.000Z",
            href: "/admin/audit",
          },
        ]
      : [],
    pulse: {
      period,
      current: {
        researchViews: totalViews,
        authorizedDownloads: totalDownloads,
        citationExports: totalCitations,
      },
      previous: {
        researchViews: prevViews,
        authorizedDownloads: prevDownloads,
        citationExports: prevCitations,
      },
      earliestAvailableDate: "2026-01-01",
      days,
    },
  }
}
