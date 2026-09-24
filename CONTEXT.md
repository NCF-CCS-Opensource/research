# NCF Research Nexus

NCF Research Nexus supports public research discovery, authenticated research sharing, owner-controlled PDF access, and administrative moderation.

## Language

**Auth Boundary**:
The rule that trusted server-side components are the authority for authentication and authorization; client session state and roles are only hints for routing and presentation.
_Avoid_: Frontend auth enforcement, client-side permissions

**Direct Object Upload**:
The upload model where a trusted server-side component creates metadata and issues a presigned storage URL, while the client sends file bytes directly to object storage and then confirms completion.
_Avoid_: Backend-proxied upload, multipart research upload

**Research PDF**:
The PDF file attached by an owner to a research record. Its metadata remains public, but download is limited to the owner, an admin with Moderation Access, or a user with a PDF Access Grant.
_Avoid_: Private PDF, public PDF, uploaded paper

**PDF Replacement**:
An owner's attachment of a different research PDF to an existing research record. It resets Approval to pending, closes pending PDF Access Requests, and revokes PDF Access Grants for the replaced file.
_Avoid_: PDF edit, file update, grant transfer

**PDF Access Request**:
A User's request to download the Research PDF of an approved Research Record with a Completed Upload, which the Owner approves or rejects after notification. Admins may see anonymous aggregate request counts and trends, but not individual requests, Request Notes, or Requester Identities. Only one request may be pending per User and Research PDF; the requester may cancel it, and another attempt after cancellation, rejection, or revocation requires a 24-hour cooldown.
_Avoid_: PDF message, public PDF request, partial PDF request

**Request Note**:
The single required plain-text explanation attached to a PDF Access Request, trimmed to 1–1,000 characters. It gives the owner context for the decision but does not start a conversation.
_Avoid_: Message, chat, reply, conversation

**Requester Identity**:
The requester's full name and optional Program, shown to the Owner with a PDF Access Request. The requester's email address remains hidden.
_Avoid_: Contact details, requester email, anonymous request

**PDF Access Grant**:
An owner's persistent permission for one authenticated requester to download one research PDF. Approval creates the grant, which may be used repeatedly until the owner revokes it; each download still requires authentication and increments the research record's download count.
_Avoid_: Download link, emailed PDF access, permanent URL

**PDF Access Notification**:
An in-app notice to the owner when a PDF Access Request arrives or to the requester when access is approved, rejected, or revoked. Email may repeat the notice for convenience but carries no Request Note, Requester Identity, or download URL.
_Avoid_: Email grant, download email, access link

**Moderation Notification**:
An in-app notice to the Owner when an Admin approves or rejects their Research Record. Email may repeat the notice for convenience.
_Avoid_: Approval email, rejection email

**Moderation Access**:
An admin's authority to download a research PDF solely to moderate its research record, without a PDF Access Request or PDF Access Grant. Every moderation download is recorded in the Audit Log.
_Avoid_: Owner approval, public PDF access, admin PDF grant

**Guest**:
An unauthenticated visitor who may browse public research metadata but cannot submit a PDF Access Request. Guest is a browsing state, not an account role.
_Avoid_: Guest account, guest role, anonymous user

**NCF Google Account**:
A Google account on the student domain `gbox.ncf.edu.ph` or the faculty and employee domain `ncf.edu.ph`. It is the only kind of account that may complete Registration, and its domain does not change what a User may do.
_Avoid_: Any Google account, personal Gmail

**Registration**:
A person's first sign-in with an NCF Google Account followed by saving their complete Profile details. The person becomes a User only when the Profile is saved; there is no separate email confirmation.
_Avoid_: Onboarding, profile completion, sign-up

**Profile**:
A User's personal details: full name, the email address of their NCF Google Account, and an optional Program. Registration saves the first complete Profile.
_Avoid_: Account, user record

**Program**:
An NCF academic program from the list Admins maintain. A Profile may reference one Program; free-text Programs are not allowed.
_Avoid_: Course, custom program

**User**:
A person who completed Registration and can authenticate, upload a research record, and submit a PDF Access Request for another owner's research PDF.
_Avoid_: Guest, visitor, unregistered account

**Active Account**:
A registered account whose administrative status permits authentication and normal User activity. It does not mean the User has logged in or interacted recently.
_Avoid_: Active User, monthly active user, recent visitor

**Admin**:
An authenticated User with authority to moderate Research Records and exercise audited Moderation Access. An Admin may separately be an Owner and switch to their personal research workspace; administrative and personal analytics remain distinct.
_Avoid_: Owner-only role, moderator account

**Owner**:
The authenticated user who uploaded a research record and is stored as its uploader; ownership is separate from bibliographic authorship.
_Avoid_: Author, creator

**Author**:
A bibliographic person credited on a research paper; an author is not necessarily a system user or the owner of the uploaded record.
_Avoid_: Owner, uploader

**Approval**:
The moderation decision that makes a research record eligible for public discovery; owners and admins can still see non-approved records in their private workflows.
_Avoid_: Upload completion, publication

**Rejection Reason**:
The required explanation an Admin gives when rejecting a Research Record, visible to its Owner and to Admins.
_Avoid_: Rejection note, feedback, comment

**Research Record**:
The metadata entity created for a paper before or after its PDF file is uploaded; it can exist without a completed file upload.
_Avoid_: Uploaded paper, PDF

**Completed Upload**:
The state after a direct object upload succeeds and a trusted server-side component confirms the file exists in storage.
_Avoid_: Metadata creation, approval

**Ready for Moderation**:
A pending Research Record with a Completed Upload that an Admin can approve or reject. A pending record with an incomplete upload still requires Owner action and is not part of the Admin moderation queue.
_Avoid_: All pending records, stalled upload, pending approval

**Collection**:
A user's private saved-paper list containing references to research records; removing an item from a collection does not affect the research record.
_Avoid_: Public folder, curated playlist, citation library

**Engagement Count**:
A Research Record's cumulative number of Research Views, authorized downloads, or Citation Exports. Passive renders and Owner downloads are excluded; Moderation Access belongs only in the Audit Log.
_Avoid_: Analytics Event, trend history, page prefetch

**Research View**:
An opening of an approved Research Record's detail page. Repeat openings count separately; the measure does not identify unique visitors or claim audience reach.
_Avoid_: Unique visitor, reach, search-result impression

**Citation Export**:
A successful copy or BibTeX download of a Research Record's generated citation. It measures citation intent, not a confirmed citation in another work.
_Avoid_: Citation, citation impact, academic citation

**Engagement Trend**:
A daily, anonymous aggregate of Research Views, authorized downloads, and Citation Exports for a Research Record, used to compare activity over 30- or 90-day periods without identifying viewers.
_Avoid_: Viewer history, raw clickstream, individual tracking
