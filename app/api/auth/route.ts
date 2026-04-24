export async function POST(request: Request) {
  const { password } = await request.json();
  const correctPassword = process.env.DASHBOARD_PASSWORD || "content2026";

  if (password === correctPassword) {
    return Response.json({ success: true });
  }

  return Response.json({ error: "Incorrect password" }, { status: 401 });
}
