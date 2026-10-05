import { referenceDataContract } from "@repo/contracts";

// Rendered per request so builds do not need the API running.
export const dynamic = "force-dynamic";

async function getPrograms() {
  const origin = process.env.API_ORIGIN ?? "http://localhost:3001";
  const res = await fetch(`${origin}/v1/api${referenceDataContract.path}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Reference data request failed: ${res.status}`);
  return referenceDataContract.response.parse(await res.json()).data.programs;
}

export default async function Home() {
  const programs = await getPrograms();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>CCS Research Repository</h1>
      <h2>Programs</h2>
      <ul>
        {programs.map((program) => (
          <li key={program.id}>{program.name}</li>
        ))}
      </ul>
    </main>
  );
}
