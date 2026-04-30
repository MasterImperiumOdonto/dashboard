import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Código ausente" }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("google_tokens", JSON.stringify(tokens), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}