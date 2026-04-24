import { getAccounts } from "@/lib/blotato";

export async function GET() {
  if (!process.env.BLOTATO_API_KEY) {
    return Response.json(
      { error: "BLOTATO_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const accounts = await getAccounts();
    return Response.json({ accounts });
  } catch (err) {
    console.error("Failed to fetch accounts:", err);
    return Response.json(
      { error: "Failed to fetch connected accounts" },
      { status: 500 }
    );
  }
}
