import { NextResponse } from "next/server";

const TOKEN = process.env.CLICKUP_API_TOKEN;

const LISTS: Record<string, string> = {
  "Janeiro": "901323922575",
  "Fevereiro": "901325070842",
  "Março": "901325974955",
  "Abril": "901326648601",
};

const STATUS_6M = "assessorado 6 meses";
const STATUS_12M = "assessorado 12 meses";

const VALOR_6M = { contrato: 8400, mrr: 1400 };
const VALOR_12M = { contrato: 24000, mrr: 2000 };

async function fetchTasks(listId: string): Promise<any[]> {
  const url = `https://api.clickup.com/api/v2/list/${listId}/task?statuses[]=${encodeURIComponent(STATUS_6M)}&statuses[]=${encodeURIComponent(STATUS_12M)}&limit=100`;
  const res = await fetch(url, {
    headers: { Authorization: TOKEN! },
    cache: "no-store",
  });
  const data = await res.json();
  return data.tasks || [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listName = searchParams.get("list") || "Abril";
  const listId = LISTS[listName] || LISTS["Abril"];

  try {
    const tasks = await fetchTasks(listId);

    let v6 = 0;
    let v12 = 0;

    for (const task of tasks) {
      const status = (task.status?.status || "").toLowerCase();
      if (status === STATUS_6M) v6++;
      else if (status === STATUS_12M) v12++;
    }

    const totalVendas = v6 + v12;
    const mrr = v6 * VALOR_6M.mrr + v12 * VALOR_12M.mrr;
    const faturamento = v6 * VALOR_6M.contrato + v12 * VALOR_12M.contrato;

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
