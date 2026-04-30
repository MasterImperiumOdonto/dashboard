"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

interface MetaTotals {
  spend: string; impressions: number; clicks: number;
  leads: number; ctr: string; cpc: string; cpl: string;
}
interface MetaCampaign {
  campaign_name: string; spend: string; impressions: string;
  clicks: number; ctr: string; cpc: string; leads: number; cpl: string; isSE: boolean;
}
interface MetaAdset {
  adset_name: string; campaign_name: string;
  spend: string; impressions: string; clicks: number;
  ctr: string; cpc: string; leads: number; cpl: string;
}
interface MetaAd {
  ad_name: string; adset_name: string; campaign_name: string;
  spend: string; impressions: string; clicks: number;
  ctr: string; cpc: string; leads: number; cpl: string;
}
interface MetaResponse {
  accounts: string[]; selectedAccount: string;
  campaigns: MetaCampaign[]; allCampaigns: MetaCampaign[];
  adsets: MetaAdset[]; ads: MetaAd[]; totals: MetaTotals;
}
interface LeadsStats { total: number; mql: number; naoMql: number; icpStart: number; icpAceleracao: number; }
interface LeadsResponse { total: LeadsStats; meta: LeadsStats; bio: LeadsStats; }

const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };
const todayStr = () => new Date().toISOString().split("T")[0];
const brl = (v: string | number) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;

const C = {
  preto: "#0A0A0A",
  branco: "#FFFFFF",
  fundo: "#F0EDE8",
  cinzaClaro: "#F5F5F5",
  cinzaMedio: "#E0E0E0",
  cinzaTexto: "#6B6B6B",
  dourado: "#C9A84C",
  douradoClaro: "#F0D98A",
  douradoEscuro: "#9A7A2E",
  verde: "#4CAF84",
  vermelho: "#E05252",
  azul: "#4A7FC1",
};

function KpiCard({ label, value, sub, dark = false, accent }: {
  label: string; value: string; sub?: string; dark?: boolean; accent?: string;
}) {
  return (
    <div style={{
      background: dark ? "#1A1A1A" : "#141414",
      borderRadius: 12,
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      <p style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "2px",
        textTransform: "uppercase", color: dark ? "rgba(255,255,255,0.4)" : C.cinzaTexto,
        marginBottom: 12,
      }}>{label}</p>
      <p style={{
        fontSize: 36, fontWeight: 900, lineHeight: 1,
        color: accent || (dark ? C.dourado : C.branco),
      }}>{value}</p>
      {sub && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>{sub}</p>
      )}
    </div>
  );
}

function SectionHeader({ number, label, title }: { number: string; label: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: C.preto, color: C.dourado,
        fontSize: 13, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>{number}</div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: C.branco, marginTop: 2 }}>{title}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 48, height: 2, background: C.dourado, margin: "0 0 32px" }} />;
}

function Spinner() {
  return (
    <svg style={{ animation: "spin 1s linear infinite", width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function MultiSelect({ options, selected, onChange, placeholder, maxLabel = 35 }: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  maxLabel?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const allSelected = selected.length === 0;
  const label = allSelected
    ? (placeholder || "Todas")
    : selected.length === 1
      ? (selected[0].length > maxLabel ? selected[0].slice(0, maxLabel - 2) + "…" : selected[0])
      : `${selected.length} selecionadas`;

  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter(s => s !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "#1A1A1A",
          border: `1px solid rgba(201,168,76,${open ? "0.6" : "0.25"})`,
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 13,
          color: "#FFFFFF",
          cursor: "pointer",
          fontFamily: "Inter, sans-serif",
          outline: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 180,
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
          <path d="M1 3l4 4 4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          minWidth: 260,
          background: "#1A1A1A",
          border: `1px solid rgba(201,168,76,0.25)`,
          borderRadius: 10,
          zIndex: 100,
          padding: "6px 0",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          maxHeight: 320,
          overflowY: "auto",
        }}>
          <div
            onClick={() => onChange([])}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              color: allSelected ? "#C9A84C" : "rgba(255,255,255,0.6)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 4,
            }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: 4,
              border: `1.5px solid ${allSelected ? "#C9A84C" : "rgba(255,255,255,0.25)"}`,
              background: allSelected ? "#C9A84C" : "transparent",
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {allSelected && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" /></svg>}
            </span>
            Todas as campanhas
          </div>
          {options.map(opt => {
            const checked = selected.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  color: checked ? "#C9A84C" : "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 4,
                  border: `1.5px solid ${checked ? "#C9A84C" : "rgba(255,255,255,0.25)"}`,
                  background: checked ? "#C9A84C" : "transparent",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {checked && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [leads, setLeads] = useState<LeadsResponse | null>(null);
  const [metaError, setMetaError] = useState("");
  const [leadsError, setLeadsError] = useState("");
  const [since, setSince] = useState(monthStart());
  const [until, setUntil] = useState(todayStr());
  const [account, setAccount] = useState("CA-CONTING");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAdsets, setSelectedAdsets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(`/api/meta?since=${since}&until=${until}&account=${account}`);
      const data = await res.json();
      if (data.error) setMetaError(data.error);
      else { setMeta(data); setMetaError(""); }
    } catch { setMetaError("Erro ao buscar dados do Meta Ads"); }
  }, [since, until, account]);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads?since=${since}&until=${until}`);
      const data = await res.json();
      if (data.error === "not_authenticated") setLeadsError("not_authenticated");
      else if (data.error) setLeadsError(data.error);
      else { setLeads(data); setLeadsError(""); }
    } catch { setLeadsError("Erro ao buscar leads"); }
  }, [since, until]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMeta(), fetchLeads()]);
    setLastUpdate(new Date());
    setLoading(false);
  }, [fetchMeta, fetchLeads]);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const allCampaigns = selectedCampaigns.length === 0;
  const allAdsets = selectedAdsets.length === 0;

  const filteredCampaigns = meta
    ? allCampaigns ? meta.allCampaigns : meta.allCampaigns.filter((c) => selectedCampaigns.includes(c.campaign_name))
    : [];

  const filteredAdsets = meta
    ? meta.adsets.filter((a) => {
        if (!allCampaigns && !selectedCampaigns.includes(a.campaign_name)) return false;
        if (!allAdsets && !selectedAdsets.includes(a.adset_name)) return false;
        return true;
      })
    : [];

  const filteredAds = meta
    ? meta.ads.filter((a) => {
        if (!allCampaigns && !selectedCampaigns.includes(a.campaign_name)) return false;
        if (!allAdsets && !selectedAdsets.includes(a.adset_name)) return false;
        return true;
      })
    : [];

  const adsetOptions = Array.from(new Set(
    (allCampaigns ? meta?.adsets : meta?.adsets.filter(a => selectedCampaigns.includes(a.campaign_name)))?.map(a => a.adset_name) || []
  ));

  const activeAds = [...filteredAds].filter(a => a.leads > 0).sort((a, b) => b.leads - a.leads);
  const inactiveAds = [...filteredAds].filter(a => a.leads === 0).sort((a, b) => parseFloat(b.spend) - parseFloat(a.spend));

  const ft = filteredCampaigns.reduce(
    (acc, c) => { acc.spend += parseFloat(c.spend); acc.impressions += parseInt(c.impressions); acc.clicks += c.clicks; acc.leads += c.leads; return acc; },
    { spend: 0, impressions: 0, clicks: 0, leads: 0 } as any
  );
  ft.ctr = ft.impressions > 0 ? ((ft.clicks / ft.impressions) * 100).toFixed(2) : "0";
  ft.cpc = ft.clicks > 0 ? (ft.spend / ft.clicks).toFixed(2) : "0";
  ft.cpl = ft.leads > 0 ? (ft.spend / ft.leads).toFixed(2) : "0";

  const pieData = leads ? [
    { name: "MQL", value: leads.total.mql, color: C.dourado },
    { name: "Não-MQL", value: leads.total.naoMql, color: C.cinzaMedio },
  ] : [];


  const barData = filteredCampaigns.map((c) => ({
    name: c.campaign_name.length > 30 ? c.campaign_name.slice(0, 28) + "…" : c.campaign_name,
    Investimento: parseFloat(c.spend),
    Leads: c.leads,
  }));

  const campaignOptions = meta?.allCampaigns.map((c) => c.campaign_name) || [];
  const accountOptions = meta?.accounts || [account];

  const selectStyle: React.CSSProperties = {
    background: "#1A1A1A",
    border: `1px solid rgba(201,168,76,0.25)`,
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    color: C.branco,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    outline: "none",
  };

  const inputStyle: React.CSSProperties = {
    background: "#1A1A1A",
    border: `1px solid rgba(201,168,76,0.25)`,
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    color: C.branco,
    fontFamily: "Inter, sans-serif",
    outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.preto, fontFamily: "Inter, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; }`}</style>

      {/* TOPBAR */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: C.preto,
        borderBottom: `1px solid rgba(201,168,76,0.2)`,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", color: C.dourado }}>IMPERIUM</p>
            <div style={{ width: 1, height: 16, background: "rgba(201,168,76,0.3)" }} />
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "1px" }}>SESSÃO ESTRATÉGIA</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <select value={account} onChange={(e) => setAccount(e.target.value)} style={selectStyle}>
              {accountOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            <MultiSelect
              options={campaignOptions}
              selected={selectedCampaigns}
              onChange={(v) => { setSelectedCampaigns(v); setSelectedAdsets([]); }}
              placeholder="Todas as campanhas"
            />

            <MultiSelect
              options={adsetOptions}
              selected={selectedAdsets}
              onChange={setSelectedAdsets}
              placeholder="Todos os conjuntos"
              maxLabel={30}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="date" value={since} onChange={(e) => setSince(e.target.value)} style={inputStyle} />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>→</span>
              <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={inputStyle} />
            </div>

            <button onClick={fetchAll} disabled={loading} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: C.dourado, color: C.preto,
              border: "none", borderRadius: 8,
              padding: "7px 16px", fontSize: 12, fontWeight: 700,
              letterSpacing: "1px", textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontFamily: "Inter, sans-serif",
            }}>
              {loading ? <Spinner /> : (
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px", display: "flex", flexDirection: "column", gap: 64 }}>

        {lastUpdate && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginTop: -40 }}>
            Atualizado às {lastUpdate.toLocaleTimeString("pt-BR")} · refresh automático a cada 5 min
          </p>
        )}

        {/* TRÁFEGO META ADS */}
        <section>
          <SectionHeader number="01" label="Tráfego pago" title="Meta Ads — Sessão Estratégia" />
          <Divider />
          {metaError ? (
            <div style={{ background: "#141414", borderRadius: 12, padding: 20, color: C.vermelho, fontSize: 14 }}>{metaError}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <KpiCard label="Investimento" value={meta ? brl(ft.spend) : "—"} dark />
              <KpiCard label="Leads Meta" value={meta ? String(ft.leads) : "—"} dark />
              <KpiCard label="CPL" value={meta ? brl(ft.cpl) : "—"} dark />
              <KpiCard label="CPC" value={meta ? brl(ft.cpc) : "—"} />
              <KpiCard label="CTR" value={meta ? `${ft.ctr}%` : "—"} />
              <KpiCard label="Cliques" value={meta ? String(ft.clicks) : "—"} />
            </div>
          )}
        </section>

        {/* LEADS PLANILHA */}
        <section>
          <SectionHeader number="02" label="Qualificação" title="Leads — Google Sheets" />
          <Divider />
          {leadsError === "not_authenticated" ? (
            <div style={{ background: "#141414", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Conecte sua conta Google para ver os dados da planilha.</p>
              <a href="/api/auth/login" style={{
                display: "inline-block", background: C.preto, color: C.dourado,
                padding: "10px 20px", borderRadius: 8, fontSize: 12,
                fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase",
                textDecoration: "none",
              }}>Conectar Google Sheets</a>
            </div>
          ) : leadsError ? (
            <div style={{ background: "#141414", borderRadius: 12, padding: 20, color: C.vermelho, fontSize: 14 }}>{leadsError}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {/* Resumo Total */}
              {leads && (
                <div style={{ background: "#141414", borderRadius: 12, padding: "20px 28px", border: `1px solid rgba(201,168,76,0.2)`, display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
                  {[
                    { l: "Total de Leads", v: leads.total.total, c: C.branco },
                    { l: "MQL", v: leads.total.mql, c: C.dourado },
                    { l: "Não-MQL", v: leads.total.naoMql, c: C.vermelho },
                    { l: "Oport. Start", v: leads.total.icpStart, c: C.azul },
                    { l: "Oport. Aceleração", v: leads.total.icpAceleracao, c: C.dourado },
                    { l: "Receita Potencial", v: `R$${((leads.total.icpStart * 8400) + (leads.total.icpAceleracao * 24000)).toLocaleString("pt-BR")}`, c: C.verde },
                  ].map((m, i, arr) => (
                    <div key={m.l} style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ padding: "0 24px", textAlign: "center" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6, whiteSpace: "nowrap" }}>{m.l}</p>
                        <p style={{ fontSize: 28, fontWeight: 900, color: m.c, lineHeight: 1 }}>{m.v}</p>
                      </div>
                      {i < arr.length - 1 && <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              )}

              {/* Bloco Via Meta */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: C.dourado, marginBottom: 16 }}>VIA META — LP + FORMS NATIVO</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  <KpiCard label="Total de Leads" value={leads ? String(leads.meta.total) : "—"} />
                  <KpiCard label="MQL" value={leads ? String(leads.meta.mql) : "—"} dark
                    sub={leads ? `${pct(leads.meta.mql, leads.meta.total)}% do total` : undefined} />
                  <KpiCard label="Não-MQL" value={leads ? String(leads.meta.naoMql) : "—"}
                    accent={C.vermelho}
                    sub={leads ? `${pct(leads.meta.naoMql, leads.meta.total)}% do total` : undefined} />
                  <KpiCard label="Oport. Start" value={leads ? String(leads.meta.icpStart) : "—"}
                    accent={C.azul}
                    sub="R$1.400/mês · 6 meses" />
                  <KpiCard label="Oport. Aceleração" value={leads ? String(leads.meta.icpAceleracao) : "—"}
                    dark
                    sub="R$2.000/mês · 12 meses" />
                  <KpiCard label="Receita Potencial" value={leads ? `R$${((leads.meta.icpStart * 8400) + (leads.meta.icpAceleracao * 24000)).toLocaleString("pt-BR")}` : "—"}
                    accent={C.verde}
                    sub="Start × R$8.4k + Acel × R$24k" />
                </div>
              </div>

              {/* Bloco Via BIO */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: C.douradoClaro, marginBottom: 16 }}>VIA BIO — INSTAGRAM ORGÂNICO</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  <KpiCard label="Total de Leads" value={leads ? String(leads.bio.total) : "—"} />
                  <KpiCard label="MQL" value={leads ? String(leads.bio.mql) : "—"} dark
                    sub={leads ? `${pct(leads.bio.mql, leads.bio.total)}% do total` : undefined} />
                  <KpiCard label="Não-MQL" value={leads ? String(leads.bio.naoMql) : "—"}
                    accent={C.vermelho}
                    sub={leads ? `${pct(leads.bio.naoMql, leads.bio.total)}% do total` : undefined} />
                  <KpiCard label="Oport. Start" value={leads ? String(leads.bio.icpStart) : "—"}
                    accent={C.azul}
                    sub="R$1.400/mês · 6 meses" />
                  <KpiCard label="Oport. Aceleração" value={leads ? String(leads.bio.icpAceleracao) : "—"}
                    dark
                    sub="R$2.000/mês · 12 meses" />
                  <KpiCard label="Receita Potencial" value={leads ? `R$${((leads.bio.icpStart * 8400) + (leads.bio.icpAceleracao * 24000)).toLocaleString("pt-BR")}` : "—"}
                    accent={C.verde}
                    sub="Start × R$8.4k + Acel × R$24k" />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* CAMPANHAS */}
        {filteredCampaigns.length > 0 && (
          <section>
            <SectionHeader number="03" label="Campanhas ativas" title="Resultados por Campanha" />
            <Divider />
            <div style={{ display: "grid", gridTemplateColumns: filteredCampaigns.length === 1 ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
              {filteredCampaigns.map((c) => {
                const isForm = c.campaign_name.includes("FORMS");
                return (
                  <div key={c.campaign_name} style={{ background: "#141414", borderRadius: 12, padding: 32, border: `1px solid rgba(255,255,255,0.08)` }}>
                    <div style={{ marginBottom: 24 }}>
                      <span style={{
                        display: "inline-block",
                        background: C.preto, color: C.dourado,
                        fontSize: 9, fontWeight: 700, letterSpacing: "2px",
                        textTransform: "uppercase", padding: "4px 10px", borderRadius: 20,
                      }}>{isForm ? "FORMS NATIVO" : "LEADS ABO"}</span>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>{c.campaign_name}</p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                      {[
                        { l: "Investimento", v: brl(c.spend) },
                        { l: "Leads", v: String(c.leads) },
                        { l: "CPL", v: brl(c.cpl) },
                        { l: "CPC", v: brl(c.cpc) },
                        { l: "CTR", v: `${c.ctr}%` },
                        { l: "Cliques", v: String(c.clicks) },
                      ].map((m) => (
                        <div key={m.l}>
                          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{m.l}</p>
                          <p style={{ fontSize: 20, fontWeight: 800, color: C.branco }}>{m.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CONJUNTOS */}
        {filteredAdsets.length > 0 && (
          <section>
            <SectionHeader number="04" label="Conjuntos de anúncios" title="Performance por Adset" />
            <Divider />
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Conjunto", "Campanha", "Invest.", "Leads", "CPL", "CTR", "CPC", "Cliques"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filteredAdsets].sort((a, b) => b.leads - a.leads).map((a, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "10px 12px", color: C.branco, fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.adset_name}</td>
                      <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.4)", fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.campaign_name}</td>
                      <td style={{ padding: "10px 12px", color: C.dourado, fontWeight: 700 }}>{brl(a.spend)}</td>
                      <td style={{ padding: "10px 12px", color: C.branco, fontWeight: 700 }}>{a.leads}</td>
                      <td style={{ padding: "10px 12px", color: a.leads > 0 ? C.verde : "rgba(255,255,255,0.4)" }}>{brl(a.cpl)}</td>
                      <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.7)" }}>{a.ctr}%</td>
                      <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.7)" }}>{brl(a.cpc)}</td>
                      <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{a.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* CRIATIVOS */}
        {filteredAds.length > 0 && (
          <section>
            <SectionHeader number="05" label="Criativos" title="Performance por Anúncio" />
            <Divider />

            {activeAds.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: C.verde, marginBottom: 12 }}>
                  ● ATIVOS — {activeAds.length} criativos com leads
                </p>
                <div style={{ overflowX: "auto", marginBottom: 32 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Criativo", "Conjunto", "Invest.", "Leads", "CPL", "CTR", "CPC", "Cliques"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeAds.map((a, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(201,168,76,0.04)" }}>
                          <td style={{ padding: "10px 12px", color: C.branco, fontWeight: 600, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ad_name}</td>
                          <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.4)", fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.adset_name}</td>
                          <td style={{ padding: "10px 12px", color: C.dourado, fontWeight: 700 }}>{brl(a.spend)}</td>
                          <td style={{ padding: "10px 12px", color: C.dourado, fontWeight: 700 }}>{a.leads}</td>
                          <td style={{ padding: "10px 12px", color: C.verde }}>{brl(a.cpl)}</td>
                          <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.7)" }}>{a.ctr}%</td>
                          <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.7)" }}>{brl(a.cpc)}</td>
                          <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{a.clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {inactiveAds.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>
                  ○ INATIVOS — {inactiveAds.length} criativos sem leads
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Criativo", "Conjunto", "Invest.", "Leads", "CPL", "CTR", "CPC", "Cliques"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", borderBottom: "1px solid rgba(255,255,255,0.04)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inactiveAds.map((a, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", opacity: 0.45 }}>
                          <td style={{ padding: "10px 12px", color: C.branco, fontWeight: 500, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.ad_name}</td>
                          <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.4)", fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.adset_name}</td>
                          <td style={{ padding: "10px 12px", color: "rgba(201,168,76,0.6)", fontWeight: 600 }}>{brl(a.spend)}</td>
                          <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>0</td>
                          <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.3)" }}>—</td>
                          <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{a.ctr}%</td>
                          <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{brl(a.cpc)}</td>
                          <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.4)" }}>{a.clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {/* ANÁLISE VISUAL */}
        {((leads?.total.total || 0) > 0 || (meta?.campaigns.length || 0) > 0) && (
          <section>
            <SectionHeader number="06" label="Análise visual" title="Distribuição & Performance" />
            <Divider />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {leads && leads.total.total > 0 && (
                <div style={{ background: "#141414", borderRadius: 12, padding: 32, border: `1px solid rgba(255,255,255,0.08)` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Qualificação de Leads</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: C.branco, marginBottom: 24 }}>{since} → {until}</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" paddingAngle={3}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1a1a1a", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 8, fontSize: 12, color: "#fff" }}
                        formatter={(v: any, n: any) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 16 }}>
                    {pieData.map((d) => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, display: "inline-block" }} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {meta && barData && barData.length > 0 && (
                <div style={{ background: C.preto, borderRadius: 12, padding: 32 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Investimento vs Leads</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: C.dourado, marginBottom: 24 }}>{since} → {until}</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#1a1a1a", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 8, fontSize: 12, color: "#fff" }}
                        formatter={(v: any, n: any) => [n === "Investimento" ? brl(v) : v, n]} />
                      <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
                      <Bar dataKey="Investimento" fill={C.dourado} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Leads" fill="rgba(201,168,76,0.35)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>
        )}

        {/* LEADS POR FONTE */}
        {leads && (
          <section>
            <SectionHeader number="07" label="Fontes" title="Leads por Canal de Captação" />
            <Divider />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {([
                { label: "Via Meta (LP + Forms)", data: leads.meta, accent: C.dourado },
                { label: "Via BIO (Orgânico)", data: leads.bio, accent: C.douradoClaro },
              ]).map(({ label, data, accent }) => (
                <div key={label} style={{ background: "#141414", borderRadius: 12, padding: 32, border: `1px solid rgba(255,255,255,0.08)` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: accent, marginBottom: 20 }}>{label}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 20 }}>
                    {[
                      { l: "Total", v: data.total, c: C.branco },
                      { l: "MQL", v: data.mql, c: C.dourado },
                      { l: "Não-MQL", v: data.naoMql, c: C.vermelho },
                    ].map((m) => (
                      <div key={m.l}>
                        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{m.l}</p>
                        <p style={{ fontSize: 28, fontWeight: 900, color: m.c }}>{m.v}</p>
                        {data.total > 0 && (
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{pct(m.v, data.total)}%</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
                    <div style={{ background: "rgba(74,127,193,0.1)", border: "1px solid rgba(74,127,193,0.25)", borderRadius: 8, padding: "10px 14px" }}>
                      <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Oport. Start</p>
                      <p style={{ fontSize: 22, fontWeight: 900, color: C.azul }}>{data.icpStart}</p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>R$1.400/mês</p>
                    </div>
                    <div style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "10px 14px" }}>
                      <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Oport. Aceleração</p>
                      <p style={{ fontSize: 22, fontWeight: 900, color: C.dourado }}>{data.icpAceleracao}</p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>R$2.000/mês</p>
                    </div>
                  </div>
                  {data.total > 0 && (
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden", display: "flex" }}>
                      <div style={{ height: "100%", width: `${pct(data.mql, data.total)}%`, background: C.dourado }} />
                      <div style={{ height: "100%", width: `${pct(data.naoMql, data.total)}%`, background: C.vermelho }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <p style={{ textAlign: "center", fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", paddingBottom: 16 }}>
          IMPERIUM CLÍNICO ODONTO · {new Date().getFullYear()}
        </p>

      </main>
    </div>
  );
}
