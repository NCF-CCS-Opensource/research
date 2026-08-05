export interface MockAuthor {
  id: string
  name: string
  email: string | null
  paperCount?: number
}

export interface MockCategory {
  id: string
  name: string
  researchCount?: number
}

export interface MockKeyword {
  id: string
  name: string
}

export interface MockResearchItem {
  id: string
  title: string
  abstract?: string | null
  publishDate?: string | null
  status?: string
  uploadComplete?: boolean
  viewCount?: number
  downloadCount?: number
  citationExportCount?: number
  createdAt?: string
  updatedAt?: string
  authors?: MockAuthor[]
  categories?: MockCategory[]
  keywords?: MockKeyword[]
}

export const MOCK_CATEGORIES: MockCategory[] = [
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

export const MOCK_AUTHORS: MockAuthor[] = [
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

export const MOCK_KEYWORDS: MockKeyword[] = [
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

export const MOCK_RESEARCHES: MockResearchItem[] = [
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
    authors: [MOCK_AUTHORS[4], MOCK_AUTHORS[0]],
    categories: [MOCK_CATEGORIES[4], MOCK_CATEGORIES[0]],
    keywords: [MOCK_KEYWORDS[0]],
  },
]
