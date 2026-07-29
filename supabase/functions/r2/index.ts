import { HeadObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "npm:@aws-sdk/client-s3"
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner"
import { createClient } from "npm:@supabase/supabase-js"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const authorization = request.headers.get("Authorization") ?? ""
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const publicClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    )
    const service = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )
    const { data: auth, error: authError } = await publicClient.auth.getUser()
    if (authError || !auth.user) return json({ error: "Authentication required" }, 401)

    const body = await request.json()
    let researchId = String(body.researchId ?? "")
    if (body.action === "email-pdf-access") {
      const request = await service
        .from("pdf_requests")
        .select("research_id")
        .eq("id", String(body.requestId ?? ""))
        .single()
      researchId = request.data?.research_id ?? ""
    }
    const { data: research } = await service
      .from("researches")
      .select("id,uploader_id,file_key,pending_file_key,upload_complete")
      .eq("id", researchId)
      .single()
    if (!research) return json({ error: "Research Record not found" }, 404)
    const isOwner = research.uploader_id === auth.user.id
    const { data: profile } = await service
      .from("profiles")
      .select("role,status")
      .eq("id", auth.user.id)
      .single()
    const isAdmin = profile?.role === "admin" && profile.status === "active"

    const s3 = new S3Client({
      region: "auto",
      endpoint: Deno.env.get("R2_ENDPOINT")!,
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      },
    })
    const bucket = Deno.env.get("R2_BUCKET_NAME")!

    if (body.action === "presign-upload") {
      if (!isOwner) return json({ error: "Research Record not found" }, 404)
      if (body.contentType !== "application/pdf") return json({ error: "Only PDF files are accepted" }, 400)
      const filename = String(body.filename ?? "research.pdf").replace(/[^a-zA-Z0-9._-]/g, "_")
      const key = `pdfs/${researchId}/${Date.now()}-${filename}`
      await service.from("researches").update({
        pending_file_key: key,
        pending_file_name: filename,
        updated_at: new Date().toISOString(),
      }).eq("id", researchId)
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: "application/pdf" }),
        { expiresIn: 300 },
      )
      return json({ uploadUrl, key })
    }

    if (body.action === "confirm-upload") {
      if (!isOwner) return json({ error: "Research Record not found" }, 404)
      if (!research.pending_file_key && research.upload_complete) return json({ message: "Upload confirmed" })
      if (!research.pending_file_key) return json({ error: "No pending upload to confirm" }, 404)
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: research.pending_file_key }))
      } catch {
        return json({ error: "File not found in storage" }, 404)
      }
      const confirmed = await service.rpc("confirm_research_upload", {
        target_id: researchId,
        owner_id: auth.user.id,
      })
      if (confirmed.error) throw confirmed.error
      return json({ message: "Upload confirmed" })
    }

    if (body.action === "owner-download") {
      if (!isOwner) return json({ error: "Research Record not found" }, 404)
      if (!research.upload_complete || !research.file_key) return json({ error: "Research PDF not found" }, 404)
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: research.file_key }),
        { expiresIn: 300 },
      )
      return json({ url })
    }

    if (body.action === "moderation-download") {
      if (!isAdmin) return json({ error: "Admin access required" }, 403)
      if (!research.upload_complete || !research.file_key) return json({ error: "Research PDF not found" }, 404)
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: research.file_key }),
        { expiresIn: 300 },
      )
      await service.from("audit_logs").insert({
        admin_id: auth.user.id,
        research_id: researchId,
        action: "moderate",
      })
      return json({ url })
    }

    if (body.action === "granted-download") {
      const requestId = String(body.requestId ?? "")
      const authorized = await service.rpc("authorize_granted_download", {
        target_request_id: requestId,
        requester: auth.user.id,
      })
      if (authorized.error) throw authorized.error
      const grant = authorized.data?.[0]
      if (!grant) return json({ error: "PDF Access Grant not found" }, 404)
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: grant.file_key }),
        { expiresIn: 300 },
      )
      return json({ url })
    }

    if (body.action === "email-pdf-access") {
      const requestId = String(body.requestId ?? "")
      const { data: access } = await service
        .from("pdf_requests")
        .select("requester_id,research_id,research_title,status")
        .eq("id", requestId)
        .single()
      if (!access) return json({ error: "PDF Access request not found" }, 404)
      const { data: owner } = await service
        .from("researches")
        .select("uploader_id")
        .eq("id", access.research_id)
        .single()
      const event = String(body.event ?? "")
      const isRequest = event === "requested" || event === "cancel"
      const expectedStatus: Record<string, string> = {
        requested: "pending",
        cancel: "canceled",
        approve: "granted",
        reject: "rejected",
        revoke: "revoked",
      }
      if (access.status !== expectedStatus[event])
        return json({ error: "PDF Access event is stale" }, 409)
      if (
        (isRequest && auth.user.id !== access.requester_id)
        || (!isRequest && auth.user.id !== owner?.uploader_id)
      ) return json({ error: "PDF Access request not found" }, 404)
      if (!Deno.env.get("RESEND_API_KEY") || !Deno.env.get("EMAIL_FROM"))
        return json({ message: "Application email is not configured" })

      const recipientId = isRequest ? owner?.uploader_id : access.requester_id
      if (!recipientId) return json({ message: "Recipient is unavailable" })
      const { data: recipient } = await service.auth.admin.getUserById(recipientId)
      if (!recipient.user?.email) return json({ message: "Recipient is unavailable" })
      const subject = isRequest
        ? `PDF access ${event}: ${access.research_title}`
        : `PDF access ${access.status}: ${access.research_title}`
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM"),
          to: [recipient.user.email],
          subject,
          text: subject,
        }),
      })
      if (!response.ok) return json({ message: "Email delivery failed" })
      return json({ message: "Email sent" })
    }

    return json({ error: "Unsupported action" }, 400)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Request failed" }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}
