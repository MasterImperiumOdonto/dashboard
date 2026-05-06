import { NextResponse } from "next/server";

const TOKEN = process.env.CLICKUP_API_TOKEN;

const LISTS: Record<string, string> = {
  "Janeiro": "901323922575",
  "Fevereiro": "901325070842",
  "Março": "901325974955",
  "Abril": "901326648601",
  "Maio": "901327058856",
};

const STATUS_ASSESSORADO = ["assessorado 6 meses", "assessorado 12 meses", "assessorado aceleração", "assessorado aceleracao", "assessorado start"];

const FIELD_PARCELA = "bee304b0-afd7-4efb-9d7b-49ec565e292f";
const FIELD_CONTRATO = "adc117e3-34a1-4f4c-b4e7-b00a44c7400d";

const FALLBACK_6M = { contrato: 8400, mrr: 1400 };
const FALLBACK_12M = { contrato: 24000, mrr: 2000 };

async function fetchTasks(listId: string): Promise<any[]> {
  const url = `https://api.clickup.com/api/v2/list/${listId}/task?limit=100`;
  const res = await fetch(url, {
    headers: { Authorization: TOKEN! },
    cache: "no-store",
  });
  const data = await res.json();
  return data.tasks || [];
}

function getFieldValue(task: any, fieldId: string): number | null {
  const field = (task.custom_fields || []).find((f: any) => f.id === fieldId);
  if (!field || field.value === null || field.value === undefined || field.value === "") return null;
  const n = Number(field.value);
  return isNaN(n) ? null : n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listName = searchParams.get("list") || "Abril";
  const listId = LISTS[listName] || LISTS["Abril"];

  try {
    const tasks = await fetchTasks(listId);

    let v6 = 0;
    let v12 = 0;
    let mrr = 0;
    let faturamento = 0;

    for (const task of tasks) {
      const status = (task.status?.status || "").toLowerCase().trim();
      if (!STATUS_ASSESSORADO.includes(status)) continue;

      const is12m = status.includes("12") || status.includes("aceleração") || status.includes("aceleracao");
      const is6m = !is12m;

      if (is6m) v6++;
      else v12++;

      const parcela = getFieldValue(task, FIELD_PARCELA);
      const contrato = getFieldValue(task, FIELD_CONTRATO);

      if (is6m) {
        mrr += parcela ?? FALLBACK_6M.mrr;
        faturamento += contrato ?? FALLBACK_6M.contrato;
      } else {
        mrr += parcela ?? FALLBACK_12M.mrr;
        faturamento += contrato ?? FALLBACK_12M.contrato;
      }
    }

    const totalVendas = v6 + v12;

    return NextResponse.json({
      lists: Object.keys(LISTS),
      selectedList: listName,
      v6,
      v12,
      totalVendas,
      mrr,
      faturamento,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
