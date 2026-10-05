# Product Requirements Document: CCS Research Repository

**Working product name:** CCS Research Hub  
**Organization:** College of Computer Studies (CCS)  
**Document version:** 1.0  
**Prepared:** October 5, 2026  
**Status:** Implementation-ready draft; proposed institutional policies require stakeholder approval  
**Primary stakeholders:** Students, instructors, and the dean  
**Audience:** Product owner, college stakeholders, developers, testers, and AI coding agents

> **Core product rule:** Users may discover published research, read its abstract, and generate citations without receiving the full PDF. Reading a full paper requires an explicit authorization decision enforced by the NestJS backend. Publication approval and reader-access approval are separate workflows.

## 1. Confirmed Requirements and Proposed Defaults

### 1.1 Requirements supplied by the product owner

| ID | Confirmed requirement |
| --- | --- |
| CR-01 | Build a web application for the College of Computer Studies. |
| CR-02 | Store and organize students' research projects and papers. |
| CR-03 | Allow students to discover papers, read permitted information, and use papers as citation sources. |
| CR-04 | Restrict full-file access and provide a request-and-approval process for reading the complete paper. |
| CR-05 | Support students, instructors, and the dean as stakeholders. |
| CR-06 | Use NestJS for the backend, with Clean Architecture, clean-code practices, and one use case per HTTP request. |
| CR-07 | Use Next.js for the frontend, Resend for email, Cloudflare R2 for PDF object storage, and PostgreSQL for the database. |

Use explicit action-based endpoints, such as `/v1/api/papers/create` and `/v1/api/access-requests/approve/:requestId`, consistently throughout the implementation.

### 1.2 Proposed defaults, not confirmed college policy

The following decisions make the specification implementable without silently inventing institutional rules. Build with these defaults unless the product owner changes them before implementation. They are not representations of an existing college policy.

| Topic | Proposed MVP default |
| --- | --- |
| Catalog audience | Public visitors can see published metadata, abstracts, and citations. Only verified, active college accounts can request full-text access. |
| Account admission | Students self-register using an allowlisted institutional email domain. Instructors and deans are invited by an existing dean. No external-reader accounts in MVP. |
| Identity fallback | If institutional email is unavailable, disable self-registration and use dean-issued invitations for students as well. Do not treat arbitrary email verification as proof of college membership. |
| Paper ownership | One student account manages each submission. Additional named authors receive attribution, not automatic account permissions. |
| Review authority | A dean assigns the supervising instructor. The instructor reviews and endorses; a dean gives final publication approval. |
| Full-text approval | The assigned instructor or a dean may approve an eligible reader's request. These are alternative approvers, not two required approvals. |
| Faculty access | Instructors have direct management access only to assigned papers. For unrelated papers, they request reader access like students. |
| Dean responsibilities | The dean manages accounts, assignments, catalog configuration, publication, withdrawals, access escalations, and audits. No separate administrator role is required in MVP. |
| Reader access duration | Seven days by default, configurable by the approver from one to thirty days. The clock starts at approval. |
| Pending request lifetime | Fourteen calendar days. After that, a new request is required. |
| Access scope | One reader, one published paper version, one time period; never unrestricted access to the whole repository. |
| Reading experience | In-browser PDF viewer. No dedicated download button in MVP. This is an interface policy, not a promise that copying is impossible. |
| File limit | PDF only; maximum 25 MiB, measured in actual received bytes. |
| Publication changes | Published metadata and files are immutable. Corrections require a new version and a new review cycle. |
| Replacement versions | Publishing a replacement revokes grants and cancels pending requests for the old version. Readers request access to the replacement. |
| Deployment | Same public origin for Next.js and `/v1/api/*`, with the latter routed directly to NestJS. Run an API process and a worker process from the backend codebase. |
| ORM and migrations | Prisma is the proposed implementation default, isolated behind repository adapters. Custom SQL migrations may implement PostgreSQL-specific constraints and indexes. |
| Retention | Keep published records and their versions unless the college authorizes removal. Approve a retention schedule before production use; do not invent a statutory period. |

**Institutional launch prerequisites:** Confirm the official institution name, allowed email domains, authorized reviewers, public-catalog policy, document-deposit permission, privacy notice, retention schedule, and operational ownership. These do not prevent prototyping with synthetic data.

## 2. Product Overview

CCS Research Hub is a centralized institutional repository for student research papers, theses, capstone reports, and project documentation. It replaces scattered file sharing with a searchable catalog, structured submissions, academic review, reliable citation metadata, and controlled full-text access.

A visitor discovers a paper through its title, authors, keywords, program, or academic year. The detail page exposes the approved abstract and bibliographic information but not the PDF. An eligible college user requests access with an academic purpose. An authorized instructor or dean reviews that request, and approval creates a time-limited grant. The backend checks that grant whenever the reader requests protected PDF content.

The platform is a repository and access-management system. It is not an automated research-writing, plagiarism-detection, peer-review certification, or academic-grading system.

### 2.1 Objectives

| ID | Objective | Measurement |
| --- | --- | --- |
| G-01 | Establish one organized repository of approved CCS research. | Count of published records with complete required metadata and a validated PDF. |
| G-02 | Make relevant research discoverable and citable. | Search completion, metadata completeness, citation exports, and pilot usability results. |
| G-03 | Protect complete papers from unauthorized retrieval. | Authorization tests, private-bucket checks, and audited access decisions. |
| G-04 | Make access approval accountable and understandable. | Decision history, request age, median decision time, and number of overdue requests. |
| G-05 | Support maintainable development. | Endpoint-to-use-case traceability, automated tests, and enforced architecture boundaries. |

**Proposed pilot targets:** At least 90% of evaluated users can locate a specified paper and submit an access request without help; at least 90% of requests receive a decision within two working days. These are targets to validate with the college, not existing performance claims.

## 3. Scope

### 3.1 MVP: required for launch

The MVP includes account verification and sign-in; role- and resource-based authorization; metadata search; paper detail pages; citation generation; student submission drafts; secure PDF upload and validation; instructor review; dean publication approval; versioned corrections; reader-access requests; approval, rejection, expiration, cancellation, and revocation; protected PDF viewing; in-app and email notifications; stakeholder dashboards; account and catalog administration; audit trails; and production backup and restore procedures.

### 3.2 Later phases

Bookmarks, advanced analytics, bulk imports, institution-wide single sign-on, multi-factor authentication, additional citation export formats, public APIs for other repositories, author-account collaboration, configurable embargo dates, optional download permissions, and external-researcher accounts are not required for MVP. They require separate requirements before implementation.

### 3.3 Explicit exclusions

Do not add AI summaries, chatbots, recommendation models, plagiarism scoring, automatic thesis grading, DOI registration, payment processing, research datasets, source-code hosting, Google Scholar indexing guarantees, or a public full-text search index. Do not add microservices, Redis, a search cluster, or a message broker merely to implement this PRD.

## 4. Stakeholders and Permissions

### 4.1 Roles and relationships

Each account has one primary role: `STUDENT`, `INSTRUCTOR`, or `DEAN`. A visitor without an account is a guest, not a stored role. Resource relationships such as `submission owner` and `assigned instructor` are checked in addition to the role.

The first dean is created through a protected deployment/bootstrap command. Public registration must never accept a privileged role. Later dean invitations are restricted to an active dean and audited. Prevent removal or deactivation of the last active dean. Serialize dean-role changes and deactivations with an institution-level transaction lock so concurrent changes cannot both pass that safeguard.

### 4.2 Permission matrix

| Action | Guest | Student | Instructor | Dean |
| --- | --- | --- | --- | --- |
| Search published catalog and read public metadata | Yes | Yes | Yes | Yes |
| Generate citations for published versions | Yes | Yes | Yes | Yes |
| Submit a full-text access request | No | Yes, when eligible | Yes, for unrelated papers | Not needed for stewardship access |
| Read a current published PDF | No | Own paper or active grant | Assigned paper or active grant | Yes, with audit |
| Create and edit a submission draft | No | Own submission | No | No; manage ownership instead |
| Read an unpublished clean PDF | No | Own submission | Assigned submission only | Yes, with audit |
| Review and endorse publication | No | No | Assigned submission, no conflict | Reassign reviewer; do not impersonate endorsement |
| Give final publication approval | No | No | No | Yes, no conflict |
| Approve or reject reader access | No | No | Assigned paper, no conflict | Yes, no conflict |
| Revoke a reader's grant | No | No | Assigned paper | Yes |
| Withdraw or restore a paper | No | No | No | Yes |
| Assign an instructor or transfer ownership | No | No | No | Yes |
| Invite staff, manage roles, and deactivate users | No | No | No | Yes |
| Read audit history | No | Own request/submission history only | Assigned-paper history only | Institution-wide |

**Mandatory rules:** An inactive account loses all protected access. Students cannot approve access to their own papers. An unrelated instructor does not gain authority from their role alone. Neither a frontend role label nor knowing an object ID grants permission. Validate authorization on every protected backend operation, including file content requests. [S9]

A reviewer must not endorse or publish a paper on which they are an author. They must not decide their own access request. A dean resolves a conflict by assigning a different eligible reviewer; a conflicted final publisher requires another authorized dean. No automatic self-approval fallback is allowed.

## 5. Main User Journeys

### 5.1 Discover and cite

A visitor opens the catalog, searches for a topic, filters results, opens a paper detail page, reads its abstract, and copies or exports a citation. The visitor sees a clear `Request full-text access` action rather than a PDF preview.

### 5.2 Submit and publish

A student creates a draft, enters metadata and author order, uploads a PDF, waits for validation, acknowledges deposit permissions, and submits. The dean assigns an instructor if none is assigned. The instructor requests revisions or endorses the submission. The dean publishes the endorsed version, requests changes, or rejects it. Only publication exposes the metadata in the catalog.

### 5.3 Request and read

A signed-in student opens a published record and submits an academic purpose and requested duration. The assigned instructor or dean decides the request. Approval creates a version-specific grant and a notification. The student opens the reader while the grant is valid. Expired or revoked access returns the reader to the request/status experience without exposing new PDF bytes.

### 5.4 Correct a published paper

The owner creates a new draft version from the existing published version. The current published version stays visible during review. Publishing the replacement changes the current-version pointer atomically, retains historical citation metadata, and invalidates reader access to the superseded full text.

## 6. Functional Requirements

### 6.1 Accounts and authentication

| ID | Requirement |
| --- | --- |
| FR-AUTH-01 | Register students using name, institutional email, password, program, and an optional private student identifier. Enforce the configured admission policy. |
| FR-AUTH-02 | Verify email with a single-use token that expires after 24 hours. Resending verification invalidates older outstanding verification tokens. |
| FR-AUTH-03 | Support login, logout, current-session retrieval, forgot password, and password reset. Password-reset tokens expire after 30 minutes and are single-use. |
| FR-AUTH-04 | Invite instructors and deans through dean-only actions. Invitations bind the intended email and role; the recipient cannot change the invited role. |
| FR-AUTH-05 | Use server-side sessions stored in PostgreSQL. Store only a hash of the opaque session token and deliver the token in a secure, HTTP-only cookie. |
| FR-AUTH-06 | Deny protected operations for unverified or deactivated users. Password reset and role changes invalidate existing sessions. Re-check current account state at the backend. |
| FR-AUTH-07 | Allow users to update nonprivileged profile fields and change their password. Changing email requires re-verification; omit email changes from the MVP interface. |
| FR-AUTH-08 | Provide generic login/recovery responses, rate limits, and audit events without exposing whether arbitrary email addresses are registered. |

Proposed password policy: 15-128 characters, spaces and Unicode permitted, no silent truncation, and no arbitrary composition rules. Hash passwords with Argon2id using maintained implementations and parameters meeting current OWASP guidance, benchmarked for the deployment. Never log passwords or raw recovery tokens. [S11]

Use a `__Host-ccs_session` cookie in production with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain` attribute. Proposed session lifetime is eight hours absolute and thirty minutes idle. Rotate the token at authentication and invalidate it server-side at logout. Protect state-changing browser requests with an origin check and a session-bound CSRF token; login and registration also receive origin/content-type checks. These controls follow OWASP's session and CSRF guidance. [S10] [S12]

### 6.2 Catalog and discovery

| ID | Requirement |
| --- | --- |
| FR-CAT-01 | Display only active papers with a current published version in the public catalog. |
| FR-CAT-02 | Search title, approved abstract, author names, and keywords. Support filters for program, academic year, research type, and category. |
| FR-CAT-03 | Provide relevance, publication date, and title sorting with a deterministic ID tie-breaker. Default to newest published when no search query is supplied. |
| FR-CAT-04 | Paginate with a default page size of 20 and a maximum of 100. Do not return unbounded lists. |
| FR-CAT-05 | Show title, ordered authors, approved abstract, keywords, program, academic year, research year, research type, repository publication date, version number, and access status. |
| FR-CAT-06 | Give each paper a stable canonical route based on an immutable public ID. A title edit must not break existing citations. |
| FR-CAT-07 | Provide explicit empty, loading, error, unavailable, and no-results states. Preserve filters in the URL. |
| FR-CAT-08 | Keep unpublished versions, review notes, request reasons, private account data, object keys, and file bytes out of public responses and indexes. |

Implement metadata search in PostgreSQL using a maintained search projection and a `tsvector` GIN index. PostgreSQL documents GIN as the preferred index type for text search. Index title and keywords at higher weight than abstracts. Use safe parameterized queries; apply the published-record filter before ranking and counting results. [S7]

Use an English configuration for English title/abstract search and a `simple` configuration for names and keywords. Test multilingual names and punctuation. Full-PDF text extraction must not feed public search in MVP.

### 6.3 Paper metadata and submission

| Field | Validation / behavior |
| --- | --- |
| Title | Required; 10-300 characters after trimming. |
| Abstract | Required; 100-5,000 characters; plain text, not arbitrary HTML. |
| Authors | Required; 1-20 ordered author entries. Preserve user-supplied spelling, initials, suffixes, and name order. |
| Author name structure | Store display name and optional given/family-name components. Support mononyms and organizational authors without guessing missing components. |
| Research year | Required, distinct from upload/publication date; 1900 through the current calendar year. |
| Academic year | Required, from the institution's configured academic-year list. |
| Program | Required, from configured active programs. |
| Research type | Required: `THESIS`, `CAPSTONE`, `RESEARCH_PAPER`, or `PROJECT_REPORT`. |
| Keywords | Required; 3-10 unique entries, each 2-50 characters. |
| Category | Optional, from a configured list. |
| Preferred instructor | Optional proposal from the student; does not itself create reviewer authority. |
| Assigned instructor | Set by the dean; needed before an instructor can review or decide access. |
| Primary PDF | Optional in an editable draft; exactly one referenced `CLEAN` PDF is required before submission. |
| External identifier | Optional verified DOI or external reference; never generated or fabricated by the application. |
| Deposit acknowledgement | Required before submission; records uploader, timestamp, and acknowledged policy version. |
| Change summary | Required when submitting a replacement version. |

| ID | Requirement |
| --- | --- |
| FR-SUB-01 | Create a paper and its initial draft in one business operation. The authenticated student becomes its owner. |
| FR-SUB-02 | Permit owner editing only while the working version is `DRAFT` or `REVISION_REQUESTED`. Do not permit arbitrary status updates through metadata endpoints. |
| FR-SUB-03 | Preserve drafts until submitted or deleted. Prevent duplicate submissions caused by retries. |
| FR-SUB-04 | Require complete metadata, a clean PDF, and deposit acknowledgement at submission. |
| FR-SUB-05 | If no instructor is assigned, put the submitted version in the dean's assignment queue and notify the dean. It remains hidden from the public. |
| FR-SUB-06 | Save an immutable submission-round snapshot at each submission/resubmission, including metadata, author order, file ID, and checksum. |
| FR-SUB-07 | Allow the owner to delete only a never-submitted, unpublished draft. Use audited retention/withdrawal workflows for records with review or publication history. |
| FR-SUB-08 | Permit only one open working version per paper. Publication history is retained, not overwritten. |

Named coauthors need not have accounts. Their names are academic attribution, not authorization identities. Do not infer permissions by matching a submitted name or email to an account. Multi-author editing and account-based coauthor access are deferred.

### 6.4 PDF ingestion and validation

| ID | Requirement |
| --- | --- |
| FR-FILE-01 | Accept authenticated, owner-authorized PDF uploads through NestJS streaming multipart handling, not through a public bucket or browser-held R2 credentials. |
| FR-FILE-02 | Enforce 25 MiB while reading the stream; abort oversized uploads rather than buffering the full document in memory. |
| FR-FILE-03 | Validate filename extension, declared type, PDF signature, parsability, and actual byte count. A `Content-Type` header alone is insufficient. |
| FR-FILE-04 | Store new uploads under a private quarantine prefix and calculate SHA-256. Use application-generated object keys. |
| FR-FILE-05 | Validate files in an isolated worker with resource limits and an antivirus adapter. Reject malware, corrupt PDFs, password-protected PDFs, and unsupported active content. |
| FR-FILE-06 | Never mark a file clean if scanning is unavailable or inconclusive. Keep it blocked and expose a recoverable validation status. |
| FR-FILE-07 | Promote only validated bytes to an immutable private object and mark the file `CLEAN`. Never overwrite a clean object key. |
| FR-FILE-08 | Allow the owner to replace a draft's PDF reference. Do not change the PDF reference of a published version. |
| FR-FILE-09 | Clean up abandoned uploads and unreferenced quarantine objects without deleting any file referenced by a version or submission snapshot. |

Upload controls are informed by OWASP's file-upload guidance, including independent type validation, limits, generated names, authorization, and malware checks. [S13]

A self-hosted scanner such as ClamAV is a proposed supporting runtime component, not a replacement for the selected stack. Production requires an operational `MalwareScannerPort`; a fake scanner is permitted only in automated tests or a visibly marked local development environment. Do not claim validation guarantees that a PDF can never exploit a viewer.

File states are `UPLOADING`, `QUARANTINED`, `VALIDATING`, `CLEAN`, `REJECTED`, `VALIDATION_FAILED`, `ABANDONED`, and `BLOCKED`. A completed upload moves to quarantine; a leased validation job moves it through validation to a clean or rejected result. Exhausted technical retries produce `VALIDATION_FAILED`, not `CLEAN`. An incomplete upload becomes abandoned. The owner can replace a failed upload with a new file; never reuse its object key. A dean can irreversibly block a previously clean file in MVP. Blocking immediately prevents every role from reading it and revokes grants/cancels pending requests for versions referencing it. Remediation uses a new clean file and reviewed version, not mutation of the blocked original.

For a successful upload, return `202 Accepted` with a file ID and validation status. The frontend polls the authorized file-status endpoint. The upload use case stores the reference and a validation job; a worker handles validation independently. An interrupted stream cannot produce a submit-ready file.

### 6.5 Academic review and publication

| ID | Requirement |
| --- | --- |
| FR-REV-01 | Show instructors only assigned submissions and their review history. |
| FR-REV-02 | Permit the assigned instructor to request revisions, reject, or endorse a submitted version. Require a reason for revisions or rejection. |
| FR-REV-03 | Permit a dean to publish only an endorsed version, or return it for revisions/reject it with a reason. |
| FR-REV-04 | Publishing checks the clean file, complete metadata, deposit acknowledgement, current review round, and absence of a conflict of interest. |
| FR-REV-05 | Publish atomically: update version state and current-version pointer, update public search metadata, write audit records, and queue notifications. |
| FR-REV-06 | Keep rejection and review notes private to the owner and authorized staff. Distinguish a request for changes from a terminal rejection. |
| FR-REV-07 | Require fresh instructor endorsement after any post-review metadata or PDF revision. |
| FR-REV-08 | Allow dean withdrawal with an internal reason and a separate safe public notice. Hide withdrawn papers from catalog results and block reader-grant access. |
| FR-REV-09 | Preserve a minimal citation tombstone at the canonical URL after withdrawal; omit the abstract and private withdrawal reason. A privacy removal may further suppress the tombstone under an authorized process. |
| FR-REV-10 | Restore only through a dean action that rechecks publication eligibility. Restoration does not reactivate expired or revoked reader grants. |

## 7. State Machines and Business Rules

### 7.1 Paper and version lifecycle

A `paper` is the stable record. Its `record_state` is `ACTIVE` or `WITHDRAWN`, and `current_published_version_id` may be null. Each `paper_version` has its own workflow state.

```text
DRAFT -----------------------> SUBMITTED
REVISION_REQUESTED ----------> SUBMITTED
SUBMITTED -------------------> REVISION_REQUESTED
SUBMITTED -------------------> ENDORSED
SUBMITTED -------------------> REJECTED
ENDORSED --------------------> REVISION_REQUESTED
ENDORSED --------------------> REJECTED
ENDORSED --------------------> PUBLISHED
PUBLISHED -------------------> SUPERSEDED   (only when a replacement publishes)
```

`REJECTED` is terminal for that version. If no other working version exists, the owner may create a new draft version with a new version number. A previously published version remains current while its replacement is drafted or reviewed.

Only `DRAFT` and `REVISION_REQUESTED` versions are editable. Each resubmission increments `review_round`. Once published, bibliographic metadata, author order, and the PDF reference are immutable. Review history is append-only. Do not expose a generic `set-status` endpoint.

When a replacement publishes, retain the old version's public bibliographic metadata at its version-specific citation route. Ordinary readers cannot continue reading the superseded PDF; management access remains available to the owner, assigned instructor, and dean.

### 7.2 Reader-access request lifecycle

```text
PENDING -> APPROVED
PENDING -> REJECTED
PENDING -> CANCELLED
PENDING -> EXPIRED
```

Approval creates a separate `access_grant`. The historical request remains `APPROVED` even after its grant expires or is revoked. The UI derives grant state as `ACTIVE`, `EXPIRED`, or `REVOKED` from timestamps; do not rewrite the original decision.

| ID | Rule |
| --- | --- |
| BR-ACC-01 | Requests and approvals require an active, verified requester and a current published version of an active paper with a clean, unblocked PDF. |
| BR-ACC-02 | A request contains a purpose of 30-1,500 characters, optional course/research context, and requested duration of 1-30 days. |
| BR-ACC-03 | Owners, assigned instructors, and deans use their management authorization rather than requesting unnecessary grants. |
| BR-ACC-04 | A user may have only one pending request for a version and may not create another while an active grant exists. |
| BR-ACC-05 | An approver sees the requester's name, role, program, purpose, prior decisions, and requested duration, not unnecessary private identifiers. |
| BR-ACC-06 | Approval records the actor, decision time, approved duration, optional note, exact version ID, and grant expiry. Rejection and revocation require a reason. |
| BR-ACC-07 | A requester may cancel only their own pending request. No mutation of another user's request is allowed. |
| BR-ACC-08 | A request expires fourteen days after creation if undecided. Authorization and decision handlers check timestamps even if the maintenance worker has not run. |
| BR-ACC-09 | Rejected, cancelled, or expired requests are historical. A new request receives a new ID. Apply a proposed 24-hour retry cooldown after rejection; a dean may waive it with an audit reason. |
| BR-ACC-10 | Grant duration is measured from approval in UTC. A configured local timezone controls display, not enforcement. |
| BR-ACC-11 | An assigned instructor or dean may revoke a grant. Changing instructor assignment removes the previous instructor's authority immediately. |
| BR-ACC-12 | Withdrawal, account deactivation, or replacement publication blocks subsequent protected reads without waiting for notification delivery. |
| BR-ACC-13 | Withdrawal/replacement cancels pending requests and revokes affected grants in the same transaction as the publication-state change. |
| BR-ACC-14 | A request decision is final for that request. Reject an incompatible second decision with `409 Conflict`; do not silently overwrite the first reviewer. |
| BR-ACC-15 | Request reasons and reading histories are private operational records, not public profile information. |

### 7.3 Full-text authorization decision

Evaluate the following on **each** protected content request, including byte-range requests:

```text
1. Authenticate a valid server-side session.
2. Confirm the account is verified and active.
3. Resolve the paper and requested version without trusting client-provided roles.
4. Confirm the referenced file is CLEAN and not operationally blocked.
5. Permit management access if the actor is the owner, assigned instructor, or dean.
6. Otherwise require all of:
   - paper.record_state == ACTIVE;
   - requested version == current published version;
   - version.status == PUBLISHED;
   - matching grant.user_id and grant.version_id;
   - grant.revoked_at is null;
   - grant.starts_at <= server_time < grant.expires_at.
7. Audit the authorized content request and stream only the permitted object.
```

For management access to withdrawn or superseded files, display a management-state warning and record the access basis. File-safety blocks override every role. A privacy/security takedown may therefore block even management viewing.

## 8. Protected Reading and R2 Storage

### 8.1 Required MVP delivery model

All original PDFs remain in a private Cloudflare R2 bucket. Disable public bucket access and public file-serving custom domains. Store object keys in PostgreSQL, not permanent public URLs.

Use authenticated **NestJS proxy streaming** for reader delivery:

```text
Browser -> same-origin NestJS content endpoint
        -> session and resource authorization
        -> private R2 object read using server credentials
        -> streamed PDF bytes back to the browser
```

Do not send a presigned R2 GET URL to the browser in MVP. Cloudflare documents presigned URLs as bearer credentials usable by anyone who has the URL until it expires; application-grant revocation alone does not invalidate such an already issued URL. Proxy delivery is selected here to re-check the user's permission on every new content request. [S4]

The streaming endpoint must support normal full responses and single HTTP byte-range requests, including valid `206` responses and `416` for unsupported/invalid ranges. Restrict or reject multipart ranges initially. Honor cancellation, avoid full-file memory buffers, and cap request concurrency. A browser reader may make several range requests; each maps to the same read-content use case.

Send `Content-Type: application/pdf`, safe `Content-Disposition: inline`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, and an appropriate no-index header. Do not let a CDN, Next.js cache, service worker, log pipeline, or application cache retain protected response bodies. Authenticate conditional requests too; do not use an unauthenticated `304` path.

### 8.2 Important limitation

Removing a download button is not digital rights management. A user who legitimately receives PDF bytes may save them or capture pages. Revocation blocks future backend content requests; it cannot recall bytes already delivered, browser memory, screenshots, or an already-authorized in-progress response. The interface, stakeholder documentation, and acceptance criteria must not promise impossible copy prevention.

Do not add PDF watermarks by rewriting the archived original. A future watermark feature would require a separately generated derivative and explicit privacy/formatting decisions.

### 8.3 Storage operational rules

Use separate credentials and buckets for development, staging, and production. Restrict credentials to the required bucket and actions. Generate object keys such as `papers/{paperId}/{fileId}.pdf`; filenames submitted by users are display metadata only. R2 credentials must never appear in `NEXT_PUBLIC_*` variables, HTML, logs, or browser network configuration.

R2/SQL operations are not one distributed transaction. Use durable upload states and compensating cleanup: an R2 write that succeeds before a database failure becomes an orphan to reconcile; a missing object cannot be marked publication-ready. Verify recorded checksums and byte sizes during validation and restoration.

## 9. Citations

| ID | Requirement |
| --- | --- |
| FR-CITE-01 | Generate APA 7 and IEEE-style references from approved structured metadata. Provide plain-text copy and BibTeX export. |
| FR-CITE-02 | Include ordered authors, research year, title, research type, institution, and a stable version-specific repository URL where the style calls for them. |
| FR-CITE-03 | Generate citations without requiring access to the PDF. Clearly label whether the user has full-text access; do not imply that copying a citation means they have read the paper. |
| FR-CITE-04 | Use a tested citation-formatting component and curated style fixtures, not an LLM or hand-built assumptions about unfamiliar names. |
| FR-CITE-05 | Never fabricate journal names, volume/issue data, page ranges, DOIs, or publication status. Distinguish institutional deposits from journal publications. |
| FR-CITE-06 | Expose approved historical metadata for superseded versions and indicate that a newer version exists. |
| FR-CITE-07 | Warn on incomplete optional bibliographic fields rather than substituting invented values. Validate formatting fixtures with an academic stakeholder before launch. |

Canonical paper route: `/papers/{publicId}`. Version-specific citation route: `/papers/{publicId}/versions/{versionNumber}`. A request for citation data must not return R2 object keys or embed a direct file URL. Repository publication date and original research year are different fields.

## 10. Notifications and Stakeholder Dashboards

### 10.1 Notifications

| Event | Recipients |
| --- | --- |
| Verification, invitation, password recovery | Intended account/email only |
| Submission awaiting assignment | Dean |
| Submission ready for instructor review | Assigned instructor |
| Revision request or rejection | Submission owner |
| Instructor endorsement | Dean |
| Publication or withdrawal | Owner and assigned instructor |
| Reader-access request | Assigned instructor; dean queue visibility |
| Approval, rejection, cancellation by system, or revocation | Requester |
| Access ending within 24 hours | Requester; once per grant |
| Failed notification after retries | Operations visibility; no public disclosure |

| ID | Requirement |
| --- | --- |
| FR-NOT-01 | Store in-app notifications and support unread counts, paginated retrieval, and mark-as-read. |
| FR-NOT-02 | Send transactional email through Resend using a verified sending domain and a configured sender. |
| FR-NOT-03 | Include a link to the application, not an attached paper, bearer access token, or presigned PDF URL. |
| FR-NOT-04 | Queue domain notifications using a PostgreSQL transactional outbox written with the business transaction. Email failure must not undo an approval or publication. |
| FR-NOT-05 | Use stable event/recipient idempotency keys, retry temporary failures, and expose permanently failed delivery jobs. |
| FR-NOT-06 | Verify Resend webhook signatures against the raw request body, deduplicate events, and tolerate out-of-order delivery. |

Resend's documented idempotency window is 24 hours; keep durable application-side delivery records rather than assuming the provider prevents duplicates forever. After an ambiguous delivery result exceeds that window, reconcile or require operator review rather than blindly resending. Verify webhook signatures before processing; store provider event IDs uniquely. Email delivery events must never create, approve, or revoke a reader grant. [S5] [S6]

### 10.2 Dashboards

**Student dashboard:** Own drafts and published submissions, review status and feedback, active reader grants with expiry, pending/rejected/expired requests, and notifications.

**Instructor dashboard:** Assigned submissions awaiting review, assigned-paper access requests, active grants for assigned papers, upcoming expirations, and assigned-paper activity. Do not expose unrelated private submissions.

**Dean dashboard:** Unassigned submissions, endorsed versions awaiting publication, all access-request queues, aging requests, publication/withdrawal controls, active-user administration, reviewer assignments, reference data, email failures, and audit filters.

Dashboard metrics must have explicit definitions. An approved grant is not proof that the paper was read. A content request is not a completed reading session. A citation export is not an academically verified citation. Report these as platform activities, not research impact.

## 11. Technology and System Architecture

### 11.1 Stack

| Concern | Technology / decision |
| --- | --- |
| Backend API | NestJS with TypeScript |
| Backend architecture | Feature-based modular monolith with Clean Architecture and repository ports |
| Frontend | Next.js with TypeScript and App Router |
| Email | Resend |
| PDF object storage | Private Cloudflare R2 |
| Relational data | PostgreSQL |
| Database adapter | Prisma, proposed default; custom migrations for required SQL features |
| Search | PostgreSQL metadata full-text search; no external search service |
| Background processing | Separate NestJS worker using PostgreSQL jobs/outbox |
| Authentication | Opaque, database-backed sessions owned by NestJS |
| File safety | Isolated PDF validation and malware scanner behind an application port |

Pin mutually compatible, maintained stable dependency versions in the lockfile at implementation. Do not use floating `latest` versions for production images. This PRD does not assert particular framework versions are permanently current.

### 11.2 Clean Architecture boundaries

```text
HTTP controller / presentation adapter
                |
                v
One application use case for the route
                |
                +--> Domain entities and business policies
                |
                +--> Repository / storage / mail / clock / transaction ports
                                   ^
                                   |
                         Infrastructure implementations
                  PostgreSQL, Prisma, R2, Resend, scanner
```

The dependency direction is toward domain/application abstractions. NestJS modules organize features, and custom providers wire concrete adapters to ports; these mechanisms support the selected structure but do not automatically enforce Clean Architecture. [S1] [S2]

| Layer | Responsibilities | Must not contain |
| --- | --- | --- |
| Domain | Business entities, state transitions, invariants, authorization policies, domain errors | Nest decorators, HTTP types, Prisma types, SDK clients, SQL |
| Application | Use-case orchestration, input/output contracts, ports, transaction boundaries | Direct ORM queries, HTTP responses, R2/Resend calls |
| Infrastructure | Repository adapters, Prisma/SQL, R2 streaming, Resend delivery, token/password adapters, jobs | Unreviewed business-policy shortcuts |
| Presentation | Controllers, request DTO validation, guards, serializers, exception mapping | Business decisions, direct repositories, orchestration of multiple use cases |
| Composition root | Nest modules and dependency wiring | Domain workflow logic |

Use factory providers to inject dependencies into plain TypeScript application classes. Keep shared code small and technical; do not create a generic `CommonService` that becomes the application.

### 11.3 One use case per HTTP request: binding rule

Every implemented method-and-route pair must invoke **exactly one top-level application use case**. Use one dedicated class with an `execute(input, actorContext)` entry point for that action. A controller may host multiple route handlers, but each handler delegates to its own use-case class.

A use case may coordinate multiple repositories and ports in a transaction. For example, `ApproveAccessRequestUseCase` can update a request, insert its grant, append an audit event, and enqueue a notification. These are steps in one business action, not separate controller-invoked use cases.

Do not call one top-level use case from another. Extract shared business policies or application services where necessary. Guards, validation pipes, transaction adapters, and audit interceptors do not count as extra user-facing use cases. Workers have explicit job use cases too, even though they are not HTTP requests.

**Prohibited patterns:** A single `PaperService` containing all CRUD and business logic; controllers directly using Prisma; a generic endpoint with an `action` field; separate approval and grant-creation calls from the browser; authorization only in Next.js; and Next.js importing backend repositories.

### 11.4 Feature modules

| Module | Responsibility |
| --- | --- |
| `identity` | Registration, invitation, sessions, verification, password recovery, account status |
| `research` | Stable papers, version metadata, submission rounds, reviewer assignment, publication |
| `catalog` | Published metadata queries, filters, search projections, citation inputs |
| `access` | Requests, decisions, grants, expiry and revocation policies |
| `documents` | Upload states, validation, private-object reads, safe streaming |
| `citations` | Citation formatting and exports |
| `notifications` | In-app notifications, delivery records, Resend integration |
| `administration` | Programs, academic years, categories, user administration, dashboards |
| `audit` | Append-only activity records and authorized audit queries |

Expose narrow application ports between modules. A module must not import another module's Prisma repository implementation. Cross-module transactions use the same transaction context through ports, rather than issuing HTTP calls inside the monolith.

### 11.5 Suggested repository layout

```text
ccs-research-hub/
  apps/
    api/
      src/
        main.ts
        app.module.ts
        modules/
          access/
            domain/
              entities/
              policies/
              errors/
            application/
              ports/
              use-cases/
                create-access-request/
                approve-access-request/
                reject-access-request/
                revoke-access-grant/
            infrastructure/
              persistence/
              mappers/
            presentation/http/
              controllers/
              dto/
              serializers/
            access.module.ts
          identity/
          research/
          catalog/
          documents/
          citations/
          notifications/
          administration/
          audit/
        shared/
          application/
          infrastructure/
          presentation/
        worker/
          main.ts
          jobs/
      prisma/
        schema.prisma
        migrations/
      test/
        unit/
        integration/
        e2e/
    web/
      app/
        (public)/
        (auth)/
        (dashboard)/
      features/
      components/
      lib/api/
      lib/server/
      tests/
  packages/
    api-contracts/
  docs/
    PRD.md
    architecture-decisions/
  .env.example
```

`api-contracts` contains transport schemas/types, not domain entities or ORM models. Feature-local components and hooks belong in frontend features; do not duplicate access policy in several pages.

### 11.6 Next.js integration rules

Use Server Components for initial metadata rendering where useful and Client Components for interactive forms and the PDF viewer. Both call the NestJS API. Next.js does not own a second user database, grant table, or authorization policy.

Frontend route guards and hidden buttons are convenience controls, not the security boundary. Server-rendered personalized data must use uncached per-request fetches and forward only the intended session credentials. Never cache a privileged response as public HTML. Next.js documentation distinguishes optimistic UI checks from secure data-level authorization; this application keeps the authoritative check in NestJS. [S3]

Browser calls use the same-origin `/v1/api/*` path. The ingress forwards those paths directly to NestJS, including large streaming uploads and protected reads, rather than through a size-limited Next.js route handler. Disable automatic prefetch for content URLs and authentication token links.

## 12. Relational Data Model

Use UUID primary keys, foreign keys, UTC `timestamptz` fields, explicit enums/check constraints, and migration-managed schemas. Database records contain PDF metadata and object references, not PDF blobs. This is the required logical model; implementation may consolidate purely technical tables without changing behavior.

| Entity | Important fields and relationships |
| --- | --- |
| `users` | `id`, normalized `email`, `password_hash`, `display_name`, `role`, `program_id`, optional private `student_identifier`, `email_verified_at`, `account_status`, `created_at`, `updated_at`, `deactivated_at` |
| `sessions` | `id`, `user_id`, unique `token_hash`, library-required CSRF state, `created_at`, `last_activity_at`, `absolute_expires_at`, `revoked_at` |
| `one_time_tokens` | `id`, `user_id`, unique `token_hash`, `purpose`, `expires_at`, `consumed_at`; purposes include email verification and password reset |
| `invitations` | `id`, normalized intended email, assigned role/program, inviter ID, unique token hash, expiry, acceptance/revocation timestamps; proposed validity 72 hours |
| `programs` | `id`, unique code, name, active flag; deactivate rather than break historical references |
| `academic_years` | `id`, unique label, start/end dates, active flag |
| `categories` | `id`, unique name, active flag |
| `papers` | `id`, immutable unique `public_id`, `owner_user_id`, `assigned_instructor_id`, `preferred_instructor_id`, `record_state`, `current_published_version_id`, `lock_version`, withdrawal fields, timestamps |
| `paper_versions` | `id`, `paper_id`, `version_number`, `status`, `review_round`, title, abstract, research year/type, program/year/category references, snapshotted institution/program/year labels, keywords, optional external identifier, `primary_file_id`, deposit acknowledgement, change summary, `published_at`, `lock_version` |
| `version_authors` | `id`, `version_id`, `position`, display/given/family names, suffix or organization, optional dean-confirmed `verified_user_id` for conflict checks only |
| `paper_files` | `id`, `paper_id`, uploader ID, generated quarantine/final object keys, original filename, size, SHA-256, MIME, validation status, safe error code, scanner result reference, timestamps |
| `submission_rounds` | `id`, `version_id`, `round_number`, immutable metadata/author snapshot, `file_id`, checksum, submitted-by/time; unique version/round |
| `review_decisions` | `id`, version/round, reviewer ID, action, reason, conflict-of-interest attestation, created time |
| `access_requests` | `id`, `requester_id`, `version_id`, purpose, optional context, requested days, status, `pending_expires_at`, decision actor/time/reason, cancellation reason, timestamps |
| `access_grants` | `id`, unique `request_id`, `user_id`, `version_id`, grantor ID, `starts_at`, `expires_at`, nullable `revoked_at`, revoked-by/reason |
| `notifications` | `id`, `user_id`, source event ID, type, safe summary, application resource reference, `created_at`, `read_at` |
| `outbox_jobs` | `id`, event/job kind, payload, deduplication key, `available_at`, attempt count, status, lease owner/expiry, last safe error, completion time |
| `email_deliveries` | `id`, source event ID, recipient, template/version, unique deduplication key, provider email ID, status, attempt times, last error |
| `webhook_receipts` | Unique provider event ID, event type, provider email ID, received/processed timestamps; minimize retained payload |
| `audit_events` | `id`, actor ID or system actor, action, entity type/ID, outcome, timestamp, request correlation ID, bounded redacted metadata |
| `idempotency_records` | Actor ID, route/action, key, request fingerprint, processing/completed status, stored safe response, expiry; unique actor/action/key |
| `access_retry_waivers` | Requester ID, version ID, dean ID, reason, expiry and consumed time; used only for an explicitly waived rejection cooldown |

An author-account link is confirmed by a dean and exists only for conflict checks; it does not grant coauthor reading or editing privileges. Require reviewers to attest that they have no authorship conflict because not every named author will have a verified account link. Block known conflicts automatically and provide a dean correction/escalation process for identity disputes.

### 12.1 Required constraints and indexes

Enforce case-insensitive email uniqueness. Enforce unique `(paper_id, version_number)`, unique `(version_id, position)` for author order, and a partial unique index allowing only one open working version per paper. Open states are `DRAFT`, `SUBMITTED`, `REVISION_REQUESTED`, and `ENDORSED`.

A partial unique index must allow only one `PENDING` request per `(requester_id, version_id)`. PostgreSQL supports partial unique indexes for uniqueness over a selected subset of rows. Use a status predicate, not a time-dependent expression such as `expires_at > now()`. [S8]

Require `expires_at > starts_at` on grants and a unique grant per request. Add indexes for current publication queries, assigned-instructor queues, owner submissions, request status/expiry, grant authorization lookups, unread notifications, audit actor/entity/time, and available/leased jobs. Maintain the catalog's GIN search index and keep unpublished metadata out of public result projections.

Ensure a paper's current-version pointer and every referenced file belong to that same paper. Use composite foreign keys where practical, plus transaction-level invariants. Protect immutable published metadata from regular update paths. Updates to mutable drafts use optimistic concurrency with an expected `lockVersion`; reject stale writes with `409` rather than discarding someone else's changes.

### 12.2 Transaction and concurrency rules

For request creation, approval, withdrawal, publication replacement, or grant revocation, use a shared locking order: affected account rows when required, then paper, relevant version, and request/grant rows. Lock multiple rows of the same entity type in ascending ID order. Access creation/approval locks the requester account as well as the acting reviewer where applicable; account deactivation locks the same account row before invalidating its access. This prevents a new grant from racing past account deactivation. All relevant use cases must use the same convention. Under the lock, reload current state, expire stale pending requests, and re-check actor eligibility before mutation.

Serialize competing request/grant creation for a paper at the paper row in MVP. This prevents duplicate active grants and withdrawal-versus-approval races without a time-sensitive unique-index trick. A later optimization can narrow the lock scope after tests demonstrate the same invariants.

Approval commits the decision, grant, audit event, and notification outbox entry together. Publication replacement commits the new current-version pointer, old-version status, old-grant revocations, pending-request cancellations, search projection, audit, and outbox records together. File blocking follows the same account-before-paper locking convention where account locks are needed and revokes/cancels affected access in its transaction. Do not hold a database transaction open while sending email, scanning a PDF, or streaming R2 content.

Workers claim queued jobs with short transactions and leases. PostgreSQL's `FOR UPDATE SKIP LOCKED` can support competing queue consumers; use it only for job claiming, not to silently skip records in business decisions. Reclaim expired leases, cap attempts, and make each job safe to retry. [S15]

## 13. HTTP API and Use-Case Map

### 13.1 API conventions

Base path: `/v1/api`. Use explicit action paths. Table paths below are appended to that base. Each row defines one method-and-route pair and one dedicated top-level use case. Resource-ID path parameters are validated UUIDs. `publicId` uses the chosen public-ID schema, and `versionNumber` must be a positive integer.

Use `GET` for reads, `POST` for creation/commands, `PATCH` for field edits, and `DELETE` only for the permitted unpublished-draft deletion. Authentication, authorization, payload validation, and rate limiting occur before protected work. Requester/owner/approver IDs are derived from the authenticated actor; they are never trusted from ordinary client input.

The API may add transport-only endpoints later, but every addition must have a named use case, an authorization rule, a contract, and tests. Do not generate unused CRUD operations merely because a database table exists.

### 13.2 Identity

| Method | Path | Use case | Access |
| --- | --- | --- | --- |
| POST | `/auth/register` | `RegisterStudentUseCase` | Admission policy |
| POST | `/auth/verify-email` | `VerifyEmailUseCase` | Single-use token |
| POST | `/auth/resend-verification` | `ResendVerificationUseCase` | Rate-limited; generic response |
| POST | `/auth/login` | `LoginUseCase` | Credentials |
| POST | `/auth/logout` | `LogoutUseCase` | Current session |
| GET | `/auth/get-session` | `GetSessionUseCase` | Current session |
| GET | `/auth/get-csrf-token` | `GetCsrfTokenUseCase` | Current session; no-store |
| POST | `/auth/forgot-password` | `RequestPasswordResetUseCase` | Rate-limited; generic response |
| POST | `/auth/reset-password` | `ResetPasswordUseCase` | Single-use token |
| POST | `/auth/accept-invitation` | `AcceptInvitationUseCase` | Bound invitation token |
| PATCH | `/profile/update` | `UpdateProfileUseCase` | Self; safe fields only |
| POST | `/profile/change-password` | `ChangePasswordUseCase` | Self; current password required |

Token-consumption links open a confirmation form; a page load or mail-client link preview must not itself consume a token. Remove token values from the visible URL after form initialization, use `Referrer-Policy: no-referrer` on these pages, and keep third-party scripts off them.

### 13.3 Research and publication

| Method | Path | Use case | Access |
| --- | --- | --- | --- |
| GET | `/papers/get-all` | `SearchPublishedPapersUseCase` | Public; filters and pagination |
| GET | `/papers/get/:publicId` | `GetPublishedPaperUseCase` | Public; public DTO only |
| GET | `/papers/get-version/:publicId/:versionNumber` | `GetPublishedVersionUseCase` | Public bibliographic history only |
| GET | `/papers/get-mine` | `ListOwnPapersUseCase` | Student |
| GET | `/papers/get-for-management/:paperId` | `GetManagedPaperUseCase` | Owner, assigned instructor, dean |
| GET | `/papers/get-review-queue` | `ListReviewQueueUseCase` | Assigned instructor/dean scope |
| GET | `/instructors/get-selectable` | `ListSelectableInstructorsUseCase` | Active account; IDs/names/program only |
| POST | `/papers/create` | `CreatePaperUseCase` | Student |
| PATCH | `/papers/update-draft/:versionId` | `UpdatePaperDraftUseCase` | Owner, editable state |
| DELETE | `/papers/delete-draft/:paperId` | `DeleteUnsubmittedPaperUseCase` | Owner, never-submitted record only |
| POST | `/papers/create-version/:paperId` | `CreatePaperVersionUseCase` | Owner, no open working version |
| POST | `/papers/submit/:versionId` | `SubmitPaperVersionUseCase` | Owner |
| POST | `/papers/assign-instructor/:paperId` | `AssignPaperInstructorUseCase` | Dean |
| POST | `/papers/transfer-ownership/:paperId` | `TransferPaperOwnershipUseCase` | Dean; target active student |
| POST | `/papers/confirm-author-identity/:authorId` | `ConfirmAuthorIdentityUseCase` | Dean; conflict metadata only |
| POST | `/papers/request-revision/:versionId` | `RequestPaperRevisionUseCase` | Assigned instructor/dean; state rules |
| POST | `/papers/endorse/:versionId` | `EndorsePaperVersionUseCase` | Assigned instructor |
| POST | `/papers/reject/:versionId` | `RejectPaperVersionUseCase` | Assigned instructor/dean; state rules |
| POST | `/papers/publish/:versionId` | `PublishPaperVersionUseCase` | Dean |
| POST | `/papers/withdraw/:paperId` | `WithdrawPaperUseCase` | Dean |
| POST | `/papers/restore/:paperId` | `RestorePaperUseCase` | Dean |

`ConfirmAuthorIdentityUseCase` changes only the private conflict-check link, never published name/order text. Assignment changes invalidate a pending endorsement if the assigned reviewer changes before publication; return that working version to `SUBMITTED` for the new instructor's review, audit the change, and notify the owner. Already-published records remain published. Publishing an endorsed clean replacement for a withdrawn paper leaves the paper withdrawn until a separate dean restoration; it never silently restores visibility. A blocked original remains blocked.

### 13.4 Documents, citations, and access

| Method | Path | Use case | Access |
| --- | --- | --- | --- |
| POST | `/paper-files/upload/:versionId` | `UploadPaperFileUseCase` | Owner, editable version |
| POST | `/paper-files/block/:fileId` | `BlockPaperFileUseCase` | Dean; reason required; irreversible in MVP |
| GET | `/paper-files/get-status/:fileId` | `GetPaperFileStatusUseCase` | Owner, assigned instructor, dean |
| GET | `/paper-files/read/:versionId` | `ReadPaperContentUseCase` | Full content policy |
| HEAD | `/paper-files/read/:versionId` | `GetPaperContentHeadersUseCase` | Same policy; no body |
| GET | `/citations/generate/:versionId` | `GenerateCitationUseCase` | Published/superseded public metadata; format query |
| GET | `/access-grants/check/:versionId` | `CheckPaperAccessUseCase` | Current active user |
| POST | `/access-requests/create` | `CreateAccessRequestUseCase` | Eligible student/instructor |
| GET | `/access-requests/get-all` | `ListAccessRequestsUseCase` | Self, assigned, or dean scope enforced server-side |
| GET | `/access-requests/get/:requestId` | `GetAccessRequestUseCase` | Requester or authorized reviewer |
| POST | `/access-requests/cancel/:requestId` | `CancelAccessRequestUseCase` | Requester; pending |
| POST | `/access-requests/approve/:requestId` | `ApproveAccessRequestUseCase` | Assigned instructor/dean |
| POST | `/access-requests/reject/:requestId` | `RejectAccessRequestUseCase` | Assigned instructor/dean |
| POST | `/access-requests/waive-cooldown/:requestId` | `WaiveAccessRetryCooldownUseCase` | Dean; reason required |
| GET | `/access-grants/get-all` | `ListAccessGrantsUseCase` | Self, assigned, or dean scope |
| POST | `/access-grants/revoke/:grantId` | `RevokeAccessGrantUseCase` | Assigned instructor/dean |

A positive access-check response does not replace authorization at the content endpoint. A grant may expire between the two requests. Public catalog DTOs contain no personalized access flags; the frontend gets those separately to avoid mixed public/private caching. Use `no-store` for catalog metadata in MVP too; add public caching only with explicit withdrawal-invalidation tests.

### 13.5 Notifications and administration

| Method | Path | Use case | Access |
| --- | --- | --- | --- |
| GET | `/notifications/get-all` | `ListNotificationsUseCase` | Self |
| POST | `/notifications/mark-read/:notificationId` | `MarkNotificationReadUseCase` | Self |
| POST | `/notifications/mark-all-read` | `MarkAllNotificationsReadUseCase` | Self |
| GET | `/dashboard/get` | `GetDashboardUseCase` | Role/resource-scoped response |
| GET | `/users/get-all` | `ListUsersUseCase` | Dean; minimize private fields |
| POST | `/users/invite` | `InviteUserUseCase` | Dean; role/admission constraints |
| POST | `/users/revoke-invitation/:invitationId` | `RevokeUserInvitationUseCase` | Dean |
| POST | `/users/deactivate/:userId` | `DeactivateUserUseCase` | Dean; last-dean safeguard |
| POST | `/users/reactivate/:userId` | `ReactivateUserUseCase` | Dean |
| POST | `/users/change-role/:userId` | `ChangeUserRoleUseCase` | Dean; reason and safeguards |
| GET | `/reference-data/get` | `GetReferenceDataUseCase` | Public active lists; privileged fields excluded |
| POST | `/programs/create` | `CreateProgramUseCase` | Dean |
| PATCH | `/programs/update/:programId` | `UpdateProgramUseCase` | Dean |
| POST | `/academic-years/create` | `CreateAcademicYearUseCase` | Dean |
| PATCH | `/academic-years/update/:academicYearId` | `UpdateAcademicYearUseCase` | Dean |
| POST | `/categories/create` | `CreateCategoryUseCase` | Dean |
| PATCH | `/categories/update/:categoryId` | `UpdateCategoryUseCase` | Dean |
| GET | `/audit-events/get-all` | `ListAuditEventsUseCase` | Dean or strictly assigned/self history scope |
| GET | `/email-deliveries/get-failures` | `ListFailedEmailDeliveriesUseCase` | Dean/operations visibility |
| POST | `/email-deliveries/retry/:deliveryId` | `RetryEmailDeliveryUseCase` | Dean; idempotency/reconciliation rules |
| POST | `/webhooks/resend` | `ProcessResendWebhookUseCase` | Valid provider signature; not session/CSRF |
| GET | `/health/get-live` | `GetLivenessUseCase` | Minimal public process status |
| GET | `/health/get-ready` | `GetReadinessUseCase` | Ingress/operations; no secret details |

Role changes that would leave active instructor assignments unsupported are rejected until reassignment. Deactivation may leave assignments visible to the dean for remediation but must immediately block the deactivated instructor; the dean remains the access-decision fallback. Deactivation invalidates all sessions, revokes the user's reader grants, and cancels their pending reader requests in the same database transaction. It does not delete their research. Reactivation does not restore revoked reader grants or old sessions.

### 13.6 Contracts, errors, and retries

Use OpenAPI as the transport contract and generate or validate frontend transport types against it. JSON endpoints return a consistent envelope; file and citation exports return their correct media types rather than a JSON envelope.

Example request:

```http
POST /v1/api/access-requests/create
Content-Type: application/json
Idempotency-Key: <client-generated-unique-key>
X-CSRF-Token: <session-bound-token>

{
  "versionId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "purpose": "I am comparing related methods for our approved software engineering research project.",
  "requestedDurationDays": 7
}
```

Example approval result:

```json
{
  "data": {
    "requestId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "status": "APPROVED",
    "grant": {
      "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "versionId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "startsAt": "2026-10-05T02:00:00Z",
      "expiresAt": "2026-10-12T02:00:00Z"
    }
  },
  "meta": { "requestId": "req-example-001" }
}
```

Example denial:

```json
{
  "error": {
    "code": "FULL_TEXT_ACCESS_EXPIRED",
    "message": "Your access has expired. Submit a new request to read this paper."
  },
  "meta": { "requestId": "req-example-002" }
}
```

Use `400` for malformed/invalid input, `401` for missing/invalid authentication, `403` for a denied action on an otherwise visible resource, `404` for unknown or hidden resources, `409` for state/concurrency/idempotency conflicts, `413` for oversized uploads, `415` for unsupported file types, `416` for invalid ranges, `429` for throttling, and `503` for temporary service unavailability. Never expose stack traces, object keys, scanner internals, database errors, or another person's request history.

Require idempotency keys for create/submit/decision/publication/revocation/invitation commands and uploads. For JSON commands, bind the key to actor, route, and validated body fingerprint. For uploads, include the declared SHA-256/size in the command fingerprint and verify them while streaming. An identical retry returns its original result; conflicting content under the same key returns `409`. Document retry retention as a proposed 24 hours, with durable domain constraints still preventing duplicate effects after that period. Do not cache file bytes in idempotency records.

## 14. Frontend Pages and Interaction Requirements

| Route | Purpose | Primary audience |
| --- | --- | --- |
| `/` | Repository introduction, search, and recent published papers | Everyone |
| `/papers` | Filterable, paginated published catalog | Everyone |
| `/papers/[publicId]` | Abstract, metadata, citation tools, and separate access-status panel | Everyone |
| `/papers/[publicId]/versions/[versionNumber]` | Version-specific citation metadata and replacement/withdrawal notices | Everyone, subject to public visibility rules |
| `/papers/[publicId]/read` | Protected viewer for the authorized version | Authorized account |
| `/login`, `/register` | Authentication and admission | Eligible users |
| `/verify-email`, `/forgot-password`, `/reset-password`, `/accept-invitation` | Secure account workflows | Intended account/token holder |
| `/dashboard` | Role-specific overview | Signed-in users |
| `/dashboard/submissions` | Own submissions and status history | Students |
| `/dashboard/submissions/new` | Draft metadata and upload wizard | Students |
| `/dashboard/submissions/[paperId]` | Draft/version editor and review history | Owner; authorized staff view |
| `/dashboard/requests` | Own requests and grants | Students and instructors |
| `/dashboard/reviews` | Assigned submission and access queues | Instructors |
| `/dashboard/publications` | Assignment and final-publication queue | Dean |
| `/dashboard/access-management` | Request decisions and grant revocation | Assigned instructors/dean |
| `/dashboard/users`, `/dashboard/settings` | Account and reference-data management | Dean |
| `/dashboard/audit` | Authorized audit browsing | Dean |
| `/dashboard/notifications` | Personal notifications | Signed-in users |
| `/profile` | Safe profile and password changes | Signed-in users |

Use a clear academic interface: readable typography, prominent title/abstract, labeled filters, visible request status, and explicit feedback after every action. Do not make the PDF appear publicly available when it is locked.

The access panel must distinguish: guest; eligible to request; pending; approved with expiry; rejected with visible decision reason; expired; revoked; unavailable/withdrawn; and management access. On a replacement version, explain that the old grant does not cover the replacement.

Show upload progress and independent validation progress. Never equate a finished network upload with a clean PDF. Prevent duplicate clicks, but rely on backend idempotency rather than the disabled button alone. Destructive actions and access revocation require confirmation and a reason where specified.

Forms need keyboard operation, visible focus, associated labels, error summaries, and field-specific errors. Status must not rely on color alone. Test layouts from 360-pixel mobile width through desktop. The PDF viewer must offer page navigation, zoom, text selection, and keyboard support without enabling document scripts or embedded executable content. Searchable/selectable PDF text is desirable, but historical scanned PDFs may not provide it; OCR conversion is outside MVP.

Handle session expiry in the viewer without looping requests. Preserve safe unsaved metadata locally or warn before navigation, but do not persist passwords, access tokens, sensitive request purposes, or PDF bytes in browser storage.

## 15. Nonfunctional and Security Requirements

### 15.1 Proposed performance and reliability targets

These are acceptance-test targets for an agreed deployment, not guarantees for an unspecified hosting plan.

| Area | Target / verification |
| --- | --- |
| Initial dataset | Benchmark with 10,000 paper records and representative metadata; include unpublished and withdrawn records. |
| Concurrent use | Test 100 active browser sessions, including 20 concurrent readers and 5 simultaneous maximum-size uploads. |
| Metadata API latency | p95 below 1 second at 20 metadata/API requests per second in a warm deployment, excluding uploads, PDF bytes, and external email latency. |
| Protected first byte | Target below 2 seconds in the chosen deployment region under normal service conditions; report R2/network contribution separately. |
| Memory | Upload/download streaming must show bounded per-request memory, not proportional full-PDF buffering. |
| Email queue | Normal notifications are submitted to Resend within 60 seconds of the committed business event; provider delivery time is measured separately. |
| Availability | Proposed monthly service objective of 99.5%, with monitoring and an agreed maintenance policy. |
| Backup recovery | Proposed RPO of 24 hours and RTO of 8 hours; demonstrate a staging restore before launch. |

### 15.2 Security controls

In addition to the authentication and file controls already specified, require strict DTO allowlists, bounded field lengths, parameterized database access, safe output encoding, and centralized error handling. Prevent mass assignment of fields such as role, owner, reviewer, status, grant expiry, and object key.

Only trust ingress forwarding headers from the configured proxy. Keep production CORS limited to the intended application origin; credentialed wildcard access is prohibited. Deny arbitrary URL fetches or remote PDF imports in MVP. Apply security headers and a restrictive content-security policy that accounts for the selected PDF viewer and its worker.

Proposed baseline rate limits: login 5 attempts per 15 minutes per account/IP combination with broader IP abuse limits; password recovery 3 per hour per email/IP combination; access-request creation 10 per hour per account and at most 10 unexpired open requests; uploads 10 per hour per account; PDF reads limited by concurrent streams and a byte-aware abuse threshold. Tune against legitimate PDF range traffic rather than breaking normal readers. Enforce limits at a shared ingress or shared database-backed mechanism across API instances, not only in process memory.

Log authentication failures, role/account changes, assignment changes, upload validation outcomes, submission/review/publication actions, access decisions, and protected content requests. Record the access basis as `OWNER`, `ASSIGNED_INSTRUCTOR`, `DEAN`, or `READER_GRANT`. Audit logs are append-only to the application identity and visible only to authorized staff. Avoid recording PDF bytes, credentials, raw tokens, and full private request text in operational logs.

Management reads and grant decisions require audit persistence. If the audit/authorization database is unavailable, protected access fails closed rather than silently serving files. For read traffic, record an authorization/content-request event; do not claim this proves every byte was consumed. Anonymous catalog requests need operational monitoring, not personally identified reading profiles.

### 15.3 Privacy and research rights

Publish an institution-approved privacy notice and repository-deposit notice. Collect only data required for account eligibility, attribution, academic review, and access decisions. Keep student identifiers, email addresses, request purposes, and reading histories out of public responses.

Before submission, the owner acknowledges they are authorized to deposit the document and that confidential participant data or third-party content has been handled under institutional requirements. This acknowledgement is a recorded workflow step, not a legal conclusion about ownership or permission.

Define a takedown contact and a dean-operated withdrawal path. Distinguish deleting an account from removing an academic record; do not cascade-delete published research when a user leaves the college. The institution must decide retention, anonymization, alumni eligibility, and exceptional removal policy before real-data launch. The system must not advertise legal compliance solely because these features exist.

### 15.4 Backups, deployment, and observability

Back up PostgreSQL and the referenced R2 objects using a documented independent recovery process. Keeping several application versions in the same bucket is not by itself a backup plan. Protect backups, include an object/checksum manifest, and test restoring both metadata and document bytes into an isolated environment.

Use separate development, staging, and production resources and secrets. Run reviewed schema migrations during deployment; use production migration commands rather than development schema-reset commands. Prisma's production migration guidance distinguishes applying committed migrations from development migration workflows. [S14]

Expose metrics for API errors/latency, failed authorization attempts, upload validation backlog, worker lease age, outbox retries, missing objects, and notification failures. Use correlation IDs across HTTP actions and worker jobs. Readiness checks database connectivity and required internal capabilities; a temporary Resend outage should queue mail, not make the entire repository unavailable.

Deployment documentation must explain same-origin routing, TLS, request/stream limits, session cookie configuration, PDF-worker hosting, scanner resource limits, database migrations, dean bootstrap, backup restoration, and rollback. Allow multipart overhead at ingress while enforcing the 25 MiB limit on file bytes inside the API. A deployment environment unable to stream 25 MiB uploads or run the required worker/scanner must be changed or the file limit formally revised; do not silently drop validation.

## 16. Configuration and Secrets

Provide a committed `.env.example` containing placeholders only. Configuration below belongs to the server unless explicitly identified as public. Validate required configuration at startup and refuse unsafe production combinations.

| Variable / setting | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime environment |
| `APP_ORIGIN` | Canonical HTTPS web origin and link base |
| `DATABASE_URL` | PostgreSQL application connection |
| `MIGRATION_DATABASE_URL` | Optional separately privileged migration connection |
| `INSTITUTION_NAME` | Official display and citation institution name |
| `INSTITUTION_TIMEZONE` | Display timezone; proposed `Asia/Manila` |
| `REGISTRATION_MODE` | `DOMAIN_ALLOWLIST` or `INVITE_ONLY` |
| `ALLOWED_EMAIL_DOMAINS` | Institution-approved domains, never an assumed domain |
| `SESSION_ABSOLUTE_TTL_SECONDS` | Proposed 28,800 |
| `SESSION_IDLE_TTL_SECONDS` | Proposed 1,800 |
| `AUTH_CSRF_SECRET` | Secret required by the chosen maintained CSRF/session implementation |
| `R2_ACCOUNT_ID` | Cloudflare account identifier |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Server-only, least-privilege R2 credentials |
| `R2_BUCKET_NAME` | Private environment-specific bucket |
| `R2_ENDPOINT` | Validated S3-compatible R2 endpoint |
| `RESEND_API_KEY` | Server-only email credential |
| `RESEND_WEBHOOK_SECRET` | Raw-body webhook signature verification |
| `EMAIL_FROM` | Verified repository sender |
| `OPERATIONS_CONTACT_EMAIL` | Operational escalation, not a public author contact |
| `MAX_PDF_BYTES` | Proposed 26,214,400 |
| `DEFAULT_ACCESS_DAYS`, `MAX_ACCESS_DAYS` | Proposed 7 and 30 |
| `PENDING_REQUEST_TTL_DAYS` | Proposed 14 |
| `MALWARE_SCANNER_ENDPOINT` | Private scanner endpoint or equivalent local adapter configuration |
| `WORKER_POLL_INTERVAL_MS` | Proposed 5,000; lease-based worker claiming |
| `DEPOSIT_POLICY_VERSION` | Version of the acknowledged deposit notice |
| `NEXT_PUBLIC_API_BASE_PATH` | Nonsecret frontend value; `/v1/api` |

Do not put the first dean's permanent password in source control, images, or an example environment file. Provision the first dean through a one-time secure bootstrap and force password setup. Disable bootstrap once an active dean exists.

## 17. Acceptance Tests and Traceability

Every functional requirement needs automated coverage or a documented manual acceptance procedure. Use unit tests for domain policies/use cases, integration tests against PostgreSQL for constraints and races, and end-to-end tests for browser workflows. Use a controllable clock for expiry tests and synthetic documents/users for tests.

| Test | Scenario | Required result | Main requirements |
| --- | --- | --- | --- |
| AT-01 | Guest searches published and unpublished sample records | Only current published catalog records are returned; counts contain no hidden records | CR-03, FR-CAT-01, FR-CAT-08 |
| AT-02 | Guest requests a protected PDF or guesses its R2 object URL | No PDF bytes are returned; private R2 object is not publicly retrievable | CR-04, FR-FILE-01 |
| AT-03 | Unverified or deactivated user calls the content API directly | Access denied, regardless of visible UI or old session/grant | FR-AUTH-06, BR-ACC-12 |
| AT-04 | Student submits incomplete metadata or an unvalidated PDF | Submission rejected with actionable errors; no review-ready state | FR-SUB-04 |
| AT-05 | Upload is oversized, malformed, encrypted, malicious, or interrupted | No clean file/publication; correct safe status and bounded resources | FR-FILE-02 through FR-FILE-07 |
| AT-06 | Scanner or R2 is temporarily unavailable | Validation/read fails safely; retries do not create duplicate records | FR-FILE-06, Section 8.3 |
| AT-07 | Instructor requests an unrelated draft or decides its access request | Denied; global instructor role is insufficient | Section 4.2, FR-REV-01 |
| AT-08 | Assigned instructor endorses; dean publishes | Published metadata appears, but the original PDF remains private | FR-REV-03 through FR-REV-05 |
| AT-09 | Student tries to self-approve, assign a reviewer, or set a privileged role | Denied; request-body fields cannot elevate privileges | Section 4.2, FR-AUTH-04 |
| AT-10 | Two browser retries create the same access request | One pending request; duplicate response or conflict per contract | BR-ACC-04, Section 13.6 |
| AT-11 | Two reviewers approve/reject the same pending request concurrently | One final decision and at most one grant; no inconsistent notification | BR-ACC-14, Section 12.2 |
| AT-12 | Reader opens a permitted PDF with normal and range requests | Authorized bytes only; correct media/range headers | Section 7.3, Section 8.1 |
| AT-13 | Another user reuses the application's content URL | Authorization is evaluated for that user's session; no shared grant | BR-ACC-01, Section 7.3 |
| AT-14 | Grant expires while the expiration worker is stopped | New content requests are denied using server time | BR-ACC-08, BR-ACC-10 |
| AT-15 | Grant is revoked or user is deactivated | Subsequent content requests are denied; delivered bytes are not claimed to be recalled | BR-ACC-11, BR-ACC-12, Section 8.2 |
| AT-16 | Paper withdrawal races with grant approval | Consistent final state: withdrawn content unavailable and no usable grant | BR-ACC-13, Section 12.2 |
| AT-17 | Owner edits a published version directly | Denied; creating a new version is required | FR-SUB-02, Section 7.1 |
| AT-18 | Replacement publishes while readers have old grants | New metadata appears; old grants are revoked; old citation metadata remains version-specific | Section 7.1, BR-ACC-13 |
| AT-19 | Revision is made after endorsement | Prior endorsement cannot publish changed material; fresh review required | FR-REV-07 |
| AT-20 | Generate citations without PDF access | Correct fixture output and stable metadata URL; no invented fields or object keys | FR-CITE-01 through FR-CITE-07 |
| AT-21 | Resend send fails after an approval commits | Grant remains valid; durable notification retries are visible | FR-NOT-04, FR-NOT-05 |
| AT-22 | Forged, duplicate, or out-of-order Resend webhook arrives | Forgery rejected; duplicates safely acknowledged; delivery events never change grants | FR-NOT-06 |
| AT-23 | Session expires, password resets, or logout completes | Old session stops authorizing protected actions | FR-AUTH-03, FR-AUTH-06 |
| AT-24 | Cross-origin form/API request attempts a state change | Origin/CSRF protections reject it; legitimate same-origin flow succeeds | Section 6.1 |
| AT-25 | Current-version pointer/file reference targets another paper | Foreign key or application invariant rejects it | Section 12.1 |
| AT-26 | PDF responses are inspected at browser, ingress, and cache layers | No public caching, raw R2 URL, or token leakage | Section 8.1, Section 11.6 |
| AT-27 | Last active dean is removed or demoted | Operation blocked without leaving the institution unmanaged | Section 4.1 |
| AT-28 | Queue worker dies during a job and another claims its expired lease | Safe completion without duplicate business effects | Section 12.2, FR-NOT-05 |
| AT-29 | Restore backup into staging | Records resolve to correct, verified PDF objects; private access still works | Section 15.4 |
| AT-30 | Audit/authorization database is unavailable | Protected content fails closed; no unaudited fallback | Section 15.2 |
| AT-31 | Full workflow is used on mobile and by keyboard | Main actions remain usable, labeled, and understandable | Section 14 |
| AT-32 | Architecture dependency and route tests run in CI | One top-level use case per method/route; no controller/Next.js ORM access | CR-06, Section 11.3 |
| AT-33 | New instructor replaces an instructor who endorsed a working version | Pending endorsement is invalidated and the new reviewer must review | Section 13.3 |
| AT-34 | Reviewer is a known linked author or reports an authorship conflict | Endorsement/publication is blocked and reassignment is required | Section 4.2, Section 12 |
| AT-35 | Only the audit or content URL's identifier is modified | No unrelated private metadata or PDF bytes are disclosed | Section 4.2, Section 13.6 |
| AT-36 | Dean blocks a clean file while existing grants reference it | All roles lose new content access; grants/requests are revoked/cancelled; blocked bytes are never replaced in place | Section 6.4, Section 12.2 |

## 18. Delivery Plan

Implement vertical slices rather than building all controllers first and adding authorization later. Each phase ends with working behavior and tests. No calendar estimates are implied.

| Phase | Deliverables | Exit condition |
| --- | --- | --- |
| 1. Foundations | Repository, Nest/Next scaffolding, clean boundaries, configuration validation, PostgreSQL migrations, identity/session flow, dean bootstrap | Accounts and negative permission tests pass; no secrets in frontend |
| 2. Submission and files | Draft/version metadata, private R2 integration, streaming upload, validation worker, deposit acknowledgement | Clean PDFs can be submitted; unsafe PDFs cannot be read or published |
| 3. Academic review | Instructor assignment, review rounds, revisions, endorsement, dean publication, immutable versions | Published-only catalog is backed by an auditable approval workflow |
| 4. Discovery and citation | Search/filtering, public detail pages, version metadata, citation fixtures | A visitor can find and cite a record without getting its PDF |
| 5. Restricted reading | Access requests, decisions, grants, expiry/revocation, private streaming reader | All content authorization and concurrency tests pass |
| 6. Notifications and operations | Resend outbox/webhooks, dashboards, account administration, audit UI, monitoring | Provider failures are recoverable and decisions remain correct |
| 7. Pilot and hardening | Accessibility/mobile review, performance tests, privacy/policy approval, backup restore, stakeholder acceptance | Definition of done is satisfied before real-data launch |

### 18.1 Definition of done

All confirmed requirements and MVP acceptance tests pass. Every protected route has positive and negative authorization tests. Every method/route maps to one use case. Published PDFs and private metadata cannot be obtained from a public endpoint or bucket. No unresolved critical or high-severity security findings remain from the agreed prelaunch review.

Deliver committed schema migrations, seed data using fictional users, `.env.example`, OpenAPI documentation, architecture decisions, test commands, setup/deployment instructions, worker/scanner operations, backup/restore procedures, and stakeholder user guides. Obtain dean/instructor/student acceptance for the core journeys and record the approved institutional defaults.

The implementation must state any remaining limitations explicitly. Passing tests is not a claim that no undiscovered vulnerabilities exist.

## 19. Instructions for AI Coding Agents

Treat Sections 1.1 and 11.3 as hard requirements. Treat Section 1.2 as the explicit baseline for otherwise-unspecified policies. Do not silently replace the stack or add features from the future-phase list.

Before coding a feature, identify its requirement IDs, permission rule, state transition, route, use-case class, persistence changes, failure modes, and tests. Implement the domain/application behavior before connecting UI controls. If a requirement conflicts with an existing implementation, document the conflict rather than weakening file protection to make the UI work.

Keep controllers thin, use cases action-specific, SDKs/ORMs in infrastructure, and secrets server-side. Use migrations rather than manual schema edits. Generate frontend contracts from the API contract or validate them together in CI. Never use a frontend-only approval flag, publicly readable R2 bucket, long-lived public PDF link, fake production scanner, or email delivery status as evidence of reader authorization.

Do not turn "one use case per HTTP request" into "one database query per request." Business transactions may require several writes. Keep authorization, state changes, audit, and outbox effects consistent.

For undecided institutional values, use clearly labeled configuration placeholders and synthetic seed data. Do not invent the school's domain, officers' identities, author permissions, copyright ownership, or real research records.

## 20. Technical References

The following primary documentation informed technical constraints. Product workflows, limits, targets, and defaults in this document are proposed design decisions unless identified as confirmed requirements. Sources were checked on October 5, 2026; verify version-sensitive implementation details again when dependencies are pinned.

- **[S1] NestJS: Modules.** Feature boundaries and explicit provider exports. https://docs.nestjs.com/modules
- **[S2] NestJS: Custom providers.** Port/adapter dependency wiring. https://docs.nestjs.com/fundamentals/custom-providers
- **[S3] Next.js: Authentication guide.** Session management and the distinction between optimistic and secure authorization checks. https://nextjs.org/docs/app/guides/authentication
- **[S4] Cloudflare R2: Presigned URLs.** Bearer-token behavior and access-until-expiry semantics. https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- **[S5] Resend: Idempotency keys.** Provider idempotency behavior and the documented 24-hour window. https://resend.com/docs/dashboard/emails/idempotency-keys
- **[S6] Resend: Verify webhook requests.** Raw-body signature verification. https://resend.com/docs/webhooks/verify-webhooks-requests
- **[S7] PostgreSQL: Preferred index types for text search.** GIN indexing of `tsvector` search data. https://www.postgresql.org/docs/current/textsearch-indexes.html
- **[S8] PostgreSQL: Partial indexes.** Conditional uniqueness and subset indexing. https://www.postgresql.org/docs/current/indexes-partial.html
- **[S9] OWASP: Authorization Cheat Sheet.** Deny-by-default and per-request authorization. https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- **[S10] OWASP: Session Management Cheat Sheet.** Session-token handling and cookie/session controls. https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- **[S11] OWASP: Password Storage Cheat Sheet.** Password hashing guidance. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- **[S12] OWASP: Cross-Site Request Forgery Prevention Cheat Sheet.** CSRF defenses for browser-authenticated requests. https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- **[S13] OWASP: File Upload Cheat Sheet.** File validation, upload limits, storage isolation, and malware screening. https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- **[S14] Prisma: Applying migrations.** Development versus production migration handling. https://www.prisma.io/docs/orm/migrations/applying-a-migration
- **[S15] PostgreSQL: SELECT.** Row locks and `SKIP LOCKED` for queue-like consumers. https://www.postgresql.org/docs/current/sql-select.html

---

**End of PRD.**
