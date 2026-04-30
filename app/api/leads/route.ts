import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

function classifyICP(faturamento: string): "start" | "aceleracao" | null {
  const fat = (faturamento || "").toLowerCase();
  const fat50plus =
    fat.includes("50") || fat.includes("60") || fat.includes("70") ||
    fat.includes("80") || fat.includes("90") || fat.includes("100") ||
    fat.includes("150") || fat.includes("200") || fat.includes("300") ||
    fat.includes("acima") || fat.includes("mais");
  if (fat50plus) return "aceleracao";
  const fat20plus =
    fat.includes("20") || fat.includes("30") || fat.includes("40");
  if (fat20plus) return "start";
  return null;
}

function classifyMQL(funcao: string, faturamento: string, investe: string): "MQL" | "Não-MQL" {
  const f = (funcao || "").toLowerCase();
  const fat = (faturamento || "").toLowerCase();
  const inv = (investe || "").toLowerCase();

  const isDono =
    f.includes("dono") || f.includes("sócio") || f.includes("socio") ||
    f.includes("proprietário") || f.includes("proprietario") || f.includes("dentista");

  if (!isDono) return "Não-MQL";

  const fat30plus =
    fat.includes("30") || fat.includes("40") || fat.includes("50") ||
    fat.includes("60") || fat.includes("70") || fat.includes("80") ||
    fat.includes("90") || fat.includes("100") || fat.includes("150") ||
    fat.includes("200") || fat.includes("300") || fat.includes("acima") ||
    fat.includes("mais");

  const fat50plus =
    fat.includes("50") || fat.includes("60") || fat.includes("70") ||
    fat.includes("80") || fat.includes("90") || fat.includes("100") ||
    fat.includes("150") || fat.includes("200") || fat.includes("300") ||
    fat.includes("acima") || fat.includes("mais");

  const investeMarketing = inv.includes("sim") || inv.includes("yes") || inv.includes("investe") || (inv.length > 0 && inv !== "não" && inv !== "nao" && inv !== "no");

  if (investeMarketing && fat30plus) return "MQL";
  if (!investeMarketing && fat50plus) return "MQL";

  return "Não-MQL";
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const parts = value.trim().split(/[\s,T]/)[0];
  const dmy = parts.split("/");
  if (dmy.length === 3) {
    const [d, m, y] = dmy;
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function inRange(dateStr: string, since: string, until: string): boolean {
  const d = parseDate(dateStr);
  if (!d) return false;
  const s = new Date(since);
  const u = new Date(until);
  u.setHours(23, 59, 59);
  return d >= s && d <= u;
}

async function getSheetData(auth: any, range: string): Promise<any[][]> {
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return res.data.values || [];
}

interface SourceStats {
  total: number; mql: number; naoMql: number; icpStart: number; icpAceleracao: number;
}

function emptyStats(): SourceStats {
  return { total: 0, mql: 0, naoMql: 0, icpStart: 0, icpAceleracao: 0 };
}

function addMQL(stats: SourceStats, fat: string) {
  stats.mql++;
  const icp = classifyICP(fat);
  if (icp === "start") stats.icpStart++;
  else if (icp === "aceleracao") stats.icpAceleracao++;
}

function processLeadsLP(rows: any[][], since: string, until: string) {
  const meta = emptyStats();
  const bio = emptyStats();

  if (rows.length < 2) return { meta, bio };

  // col 9=investe, col 10=faturamento, col 12=utm_source (M)
  const funcaoIdx = rows[0].map((h: string) => h?.toString().toLowerCase().trim())
    .findIndex((h: string) => h.includes("função") || h.includes("funcao"));
  const investeIdx = 9;
  const fatIdx = 10;
  const utmSourceIdx = 12;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = row[0] || "";
    if (!inRange(dateStr, since, until)) continue;

    const funcao = funcaoIdx >= 0 ? (row[funcaoIdx] || "") : "";
    const investe = row[investeIdx] || "";
    const fat = row[fatIdx] || "";
    const utmSource = (row[utmSourceIdx] || "").toString().toLowerCase().trim();
    const isBio = utmSource === "bio" || utmSource.includes("bio");

    const stats = isBio ? bio : meta;
    stats.total++;

    const result = classifyMQL(funcao, fat, investe);
    if (result === "MQL") addMQL(stats, fat);
    else stats.naoMql++;
  }

  return { meta, bio };
}

function processFormsNativo(rows: any[][], since: string, until: string): SourceStats {
  const stats = emptyStats();
  if (rows.length < 2) return stats;

  const funcaoIdx = 12;
  const investeIdx = 13;
  const fatIdx = 14;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = row[1] || "";
    if (!inRange(dateStr, since, until)) continue;
    stats.total++;
    const funcao = row[funcaoIdx] || "";
    const investe = row[investeIdx] || "";
    const fat = row[fatIdx] || "";
    const result = classifyMQL(funcao, fat, investe);
    if (result === "MQL") addMQL(stats, fat);
    else stats.naoMql++;
  }

  return stats;
}

function sumStats(a: SourceStats, b: SourceStats): SourceStats {
  return {
    total: a.total + b.total,
    mql: a.mql + b.mql,
    naoMql: a.naoMql + b.naoMql,
    icpStart: a.icpStart + b.icpStart,
    icpAceleracao: a.icpAceleracao + b.icpAceleracao,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") || getDefaultSince();
  const until = searchParams.get("until") || today();

  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("google_tokens");

  if (!tokenCookie) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokenCookie.value);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);

    const [lpRows, formsRows] = await Promise.all([
      getSheetData(oauth2Client, "leads LP!A:Z"),
      getSheetData(oauth2Client, "SE - FORMS NATIVO SEM COND!A:Z"),
    ]);

    const lp = processLeadsLP(lpRows, since, until);
    const forms = processFormsNativo(formsRows, since, until);

    // meta = LP meta + forms (forms não tem BIO)
    const metaTotal = sumStats(lp.meta, forms);
    const bioTotal = lp.bio;
    const grandTotal = sumStats(metaTotal, bioTotal);

    return NextResponse.json({ meta: metaTotal, bio: bioTotal, total: grandTotal });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function getDefaultSince() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}