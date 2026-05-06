import { NextResponse } from "next/server";

const TOKEN = process.env.META_ACCESS_TOKEN;

const AD_ACCOUNTS: Record<string, string> = {
  "CA-CONTING": "act_406004541792836",
  "CA-NOVA INSTA NICOLE": "act_927089859443644",
};

const SE_CAMPAIGNS = [
  "[NIC][AS] - [SE][FORMS][ABO]",
  "[NIC][AS] - [SE][LEADS][ABO]",
];

async function fetchInsights(accountId: string, timeRange: string, level: string) {
  const fields = "campaign_name,adset_name,ad_name,spend,impressions,clicks,outbound_clicks,ctr,cpc,actions";
  const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range=${timeRange}&level=${level}&limit=200&access_token=${TOKEN}`;
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

function extractLeads(actions: any[]): number {
  return parseInt(actions?.find((a: any) => a.action_type === "lead")?.value || "0");
}

function extractOutboundClicks(outbound_clicks: any[], clicks_fallback?: string): number {
  const outbound = parseInt(outbound_clicks?.find((a: any) => a.action_type === "outbound_click")?.value || "0");
  if (outbound > 0) return outbound;
  return parseInt(clicks_fallback || "0");
}

function buildTotals(list: any[]) {
  const t = list.reduce(
    (acc: any, c: any) => {
      acc.spend += parseFloat(c.spend);
      acc.impressions += parseInt(c.impressions);
      acc.clicks += c.clicks;
      acc.leads += c.leads;
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0, leads: 0 }
  );
  t.ctr = t.impressions > 0 ? ((t.clicks / t.impressions) * 100).toFixed(2) : "0";
  t.cpc = t.clicks > 0 ? (t.spend / t.clicks).toFixed(2) : "0";
  t.cpl = t.leads > 0 ? (t.spend / t.leads).toFixed(2) : "0";
  t.spend = t.spend.toFixed(2);
  return t;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") || getDefaultSince();
  const until = searchParams.get("until") || today();
  const accountKey = searchParams.get("account") || "CA-CONTING";
  const accountId = AD_ACCOUNTS[accountKey] || AD_ACCOUNTS["CA-CONTING"];

  try {
    const timeRange = encodeURIComponent(JSON.stringify({ since, until }));

    const [campaignJson, adsetJson, adJson] = await Promise.all([
      fetchInsights(accountId, timeRange, "campaign"),
      fetchInsights(accountId, timeRange, "adset"),
      fetchInsights(accountId, timeRange, "ad"),
    ]);

    if (campaignJson.error) {
      return NextResponse.json({ error: campaignJson.error.message }, { status: 400 });
    }

    const allCampaigns = (campaignJson.data || []).map((c: any) => {
      const leads = extractLeads(c.actions);
      const clicks = extractOutboundClicks(c.outbound_clicks, c.clicks);
      const spend = parseFloat(c.spend || "0");
      const impressions = parseInt(c.impressions || "0");
      return {
        campaign_name: c.campaign_name,
        spend: spend.toFixed(2),
        impressions: String(impressions),
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0",
        cpc: clicks > 0 ? (spend / clicks).toFixed(2) : "0",
        leads,
        cpl: leads > 0 ? (spend / leads).toFixed(2) : "0",
        isSE: SE_CAMPAIGNS.includes(c.campaign_name),
      };
    });

    const adsets = (adsetJson.data || []).map((a: any) => {
      const leads = extractLeads(a.actions);
      const clicks = extractOutboundClicks(a.outbound_clicks, a.clicks);
      const spend = parseFloat(a.spend || "0");
      const impressions = parseInt(a.impressions || "0");
      return {
        adset_name: a.adset_name,
        campaign_name: a.campaign_name,
        spend: spend.toFixed(2),
        impressions: String(impressions),
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0",
        cpc: clicks > 0 ? (spend / clicks).toFixed(2) : "0",
        leads,
        cpl: leads > 0 ? (spend / leads).toFixed(2) : "0",
      };
    });

    const ads = (adJson.data || []).map((a: any) => {
      const leads = extractLeads(a.actions);
      const clicks = extractOutboundClicks(a.outbound_clicks, a.clicks);
      const spend = parseFloat(a.spend || "0");
      const impressions = parseInt(a.impressions || "0");
      return {
        ad_name: a.ad_name,
        adset_name: a.adset_name,
        campaign_name: a.campaign_name,
        spend: spend.toFixed(2),
        impressions: String(impressions),
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0",
        cpc: clicks > 0 ? (spend / clicks).toFixed(2) : "0",
        leads,
        cpl: leads > 0 ? (spend / leads).toFixed(2) : "0",
      };
    });

    const seCampaigns = allCampaigns.filter((c: any) => c.isSE);

    return NextResponse.json({
      accounts: Object.keys(AD_ACCOUNTS),
      selectedAccount: accountKey,
      campaigns: seCampaigns,
      allCampaigns,
      adsets,
      ads,
      totals: buildTotals(seCampaigns),
    });
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