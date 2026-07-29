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
    const researchId = String(body.researchId ?? "")
    const { data: research } = await service
      .from("researches")
      .select("id,uploader_id,file_key,pending_file_key,upload_complete")
      .eq("id", researchId)
      .eq("uploader_id", auth.user.id)
      .single()
    if (!research) return json({ error: "Research Record not found" }, 404)

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
      if (!research.upload_complete || !research.file_key) return json({ error: "Research PDF not found" }, 404)
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: research.file_key }),
        { expiresIn: 300 },
      )
      return json({ url })
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
