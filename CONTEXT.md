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
An authenticated user's request to download the research PDF of an approved research record with a completed upload, which the owner approves or rejects after notification. Only one request may be pending per user and research PDF; the requester may cancel it, and another attempt after cancellation, rejection, or revocation requires a 24-hour cooldown.
_Avoid_: PDF message, public PDF request, partial PDF request

**Request Note**:
The single required plain-text explanation attached to a PDF Access Request, trimmed to 1–1,000 characters. It gives the owner context for the decision but does not start a conversation.
_Avoid_: Message, chat, reply, conversation

**Requester Identity**:
The requester's full name, required institution, and optional program shown to the owner with a PDF Access Request. A complete Requester Identity is required before requesting access; the requester's email address remains hidden.
_Avoid_: Contact details, requester email, anonymous request

**PDF Access Grant**:
An owner's persistent permission for one authenticated requester to download one research PDF. Approval creates the grant, which may be used repeatedly until the owner revokes it; each download still requires authentication and increments the research record's download count.
_Avoid_: Download link, emailed PDF access, permanent URL

**PDF Access Notification**:
An in-app notice to the owner when a PDF Access Request arrives or to the requester when access is approved, rejected, or revoked. Email may repeat the notice for convenience but carries no Request Note, Requester Identity, or download URL.
_Avoid_: Email grant, download email, access link

**Moderation Access**:
An admin's authority to download a research PDF solely to moderate its research record, without a PDF Access Request or PDF Access Grant. Every moderation download is recorded in the Audit Log.
_Avoid_: Owner approval, public PDF access, admin PDF grant

**Guest**:
An unauthenticated visitor who may browse public research metadata but cannot submit a PDF Access Request. Guest is a browsing state, not an account role.
_Avoid_: Guest account, guest role, anonymous user

**User**:
A person with a registered, email-verified account who can authenticate, upload a research record, and submit a PDF Access Request for another owner's research PDF.
_Avoid_: Guest, visitor, unverified account

**Admin**:
An authenticated user with authority to moderate research records and exercise audited Moderation Access.
_Avoid_: Owner, moderator account

**Owner**:
The authenticated user who uploaded a research record and is stored as its uploader; ownership is separate from bibliographic authorship.
_Avoid_: Author, creator

**Author**:
A bibliographic person credited on a research paper; an author is not necessarily a system user or the owner of the uploaded record.
_Avoid_: Owner, uploader

**Approval**:
The moderation decision that makes a research record eligible for public discovery; owners and admins can still see non-approved records in their private workflows.
_Avoid_: Upload completion, publication

**Research Record**:
The metadata entity created for a paper before or after its PDF file is uploaded; it can exist without a completed file upload.
_Avoid_: Uploaded paper, PDF

**Completed Upload**:
The state after a direct object upload succeeds and a trusted server-side component confirms the file exists in storage.
_Avoid_: Metadata creation, approval

**Collection**:
A user's private saved-paper list containing references to research records; removing an item from a collection does not affect the research record.
_Avoid_: Public folder, curated playlist, citation library

**Engagement Count**:
A research record's cumulative number of explicit views, authorized downloads, or citations. Passive renders and owner downloads are excluded; Moderation Access belongs only in the Audit Log.
_Avoid_: Analytics Event, trend history, page prefetch
