const axios = require("axios");
const cheerio = require("cheerio");

const COMTRADE_BASE = "https://comtradeapi.un.org/public/v1";
const WITS_BASE = "https://wits.worldbank.org";
const REPORTER_INDIA = "699";
const INDIA_ISO3 = "IND";

const cache = {
  countries: { value: null, expiresAt: 0 },
  hs: { value: null, expiresAt: 0 },
  trade: new Map(),
  tariff: new Map()
};

function normaliseCountry(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function yoy(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
}

function cagr(first, last, years) {
  if (first == null || last == null || first <= 0 || last < 0 || !years) return null;
  return Number(((Math.pow(last / first, 1 / years) - 1) * 100).toFixed(2));
}

function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function getCountryCodes() {
  if (cache.countries.value && cache.countries.expiresAt > Date.now()) return cache.countries.value;

  const response = await axios.get(
    "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json",
    { timeout: 15000 }
  );

  const rows = Array.isArray(response.data) ? response.data : (response.data?.data || []);
  const map = new Map();

  for (const row of rows) {
    const code = row.m49Code ?? row.code ?? row.id;
    const name = row.text ?? row.partnerAreaDesc ?? row.name ?? row.description;
    const iso3 = row.iso3Code ?? row.iso3 ?? row.iso3Code3;
    if (code != null && name) {
      map.set(normaliseCountry(name), { m49: String(code), iso3: iso3 ? String(iso3).toUpperCase() : null, name });
    }
  }

  cache.countries = { value: map, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
  return map;
}

async function resolveCountry(country) {
  const normalized = normaliseCountry(country);
  const aliases = {
    uae: "united arab emirates",
    "u.a.e.": "united arab emirates",
    usa: "united states of america",
    us: "united states of america",
    uk: "united kingdom",
    korea: "republic of korea",
    "south korea": "republic of korea"
  };
  const target = aliases[normalized] || normalized;
  const map = await getCountryCodes();
  const direct = map.get(target);
  if (direct) return direct;

  for (const [name, value] of map.entries()) {
    if (name.includes(target) || target.includes(name)) return value;
  }
  return null;
}

async function queryComtrade({ reporterCode, partnerCode = "0", flowCode, cmdCode, period }) {
  const params = {
    reporterCode,
    partnerCode,
    flowCode,
    cmdCode,
    period,
    maxRecords: 500,
    format: "json"
  };
  const key = process.env.COMTRADE_SUBSCRIPTION_KEY;
  if (key) params.subscriptionKey = key;

  const base = key ? "https://comtradeapi.un.org/data/v1/get" : `${COMTRADE_BASE}/preview`;
  const response = await axios.get(
    `${base}/C/A/HS`,
    { params, timeout: 20000 }
  );
  return response.data || {};
}

function buildSeries(records) {
  return records.map(record => ({
    year: String(record.period || record.refYear || ""),
    valueUsd: number(record.primaryValue),
    quantity: number(record.netWgt ?? record.netWeight),
    quantityUnit: record.qtyUnitAbbr || record.qtyUnit || "kg"
  })).filter(item => item.year && item.valueUsd != null);
}

function firstRecord(payload) {
  return Array.isArray(payload?.data) && payload.data.length ? payload.data[0] : null;
}

function parseWitsRows(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td").map((__, td) => $(td).text(" ").replace(/\s+/g, " ").trim()).get();
    if (cells.length >= 7 && /^\d{6}$/.test(cells[2] || "")) {
      const value = number((cells[4] || "").replace(/,/g, ""));
      const quantity = number((cells[5] || "").replace(/,/g, ""));
      if (value != null) {
        rows.push({
          supplier: cells[0],
          flow: cells[1],
          hsCode: cells[2],
          description: cells[3],
          valueThousandUsd: value,
          valueUsd: value * 1000,
          quantity,
          quantityUnit: cells[6] || null
        });
      }
    }
  });
  return rows;
}

async function getTopSuppliers({ marketIso3, hsCode, year }) {
  const url = `${WITS_BASE}/trade/comtrade/en/country/All/year/${year}/tradeflow/Exports/partner/${marketIso3}/product/${hsCode}`;
  const response = await axios.get(url, { timeout: 20000 });
  const rows = parseWitsRows(response.data);
  const total = rows.reduce((sum, row) => sum + row.valueUsd, 0);
  const suppliers = rows
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 10)
    .map((row, index) => ({
      rank: index + 1,
      country: row.supplier,
      valueUsd: row.valueUsd,
      quantity: row.quantity,
      sharePercent: total > 0 ? Number((row.valueUsd / total * 100).toFixed(2)) : null
    }));
  return {
    source: "World Bank WITS / UN Comtrade",
    sourceUrl: url,
    year,
    suppliers,
    totalReportedSupplierValueUsd: total || null
  };
}

function concentrationIndex(suppliers = []) {
  const shares = suppliers.map(s => Number(s.sharePercent || 0) / 100);
  if (!shares.length) return null;
  const hhi = shares.reduce((sum, share) => sum + share * share, 0);
  return Number(hhi.toFixed(4));
}

async function getTariffSeries({ marketIso3, hsCode, partnerIso3 = INDIA_ISO3, years }) {
  const series = [];
  for (const year of years) {
    const url = `${WITS_BASE}/tariff/trains/en/country/${marketIso3}/year/${year}/partner/${partnerIso3}/product/all/pagenumber/1/pageSize/200`;
    const response = await axios.get(url, { timeout: 20000 });
    const $ = cheerio.load(response.data);
    let found = null;
    $("table tr").each((_, tr) => {
      const cells = $(tr).find("td").map((__, td) => $(td).text(" ").replace(/\s+/g, " ").trim()).get();
      if (cells.length >= 7 && String(cells[0]).startsWith(hsCode)) {
        found = {
          hsCode: cells[0].slice(0, 6),
          description: cells[0].slice(7) || null,
          mfnPercent: number(cells[1]),
          appliedPercent: number(cells[2]),
          tariffLines: number(cells[3]),
          traded: cells[4] || null
        };
      }
    });
    if (found) series.push({ year, ...found });
  }
  return series;
}

async function buildTradeIntelligence({ product, market, hsCode }) {
  const cleanHs = String(hsCode || "").replace(/\D/g, "").slice(0, 6);
  if (cleanHs.length !== 6) {
    return {
      status: "Needs HS Code",
      source: "UN Comtrade / World Bank WITS / UNCTAD TRAINS",
      message: "A valid 6-digit HS code is required. TradeFlow does not guess product classification.",
      data: null
    };
  }

  const resolved = await resolveCountry(market);
  if (!resolved?.m49) {
    return {
      status: "Market Not Resolved",
      source: "UN Comtrade",
      message: `TradeFlow could not resolve "${market}" to a UN reporting economy. No statistic was invented.`,
      data: null
    };
  }

  const marketCode = resolved.m49;
  const marketIso3 = resolved.iso3;
  if (!marketIso3) {
    return {
      status: "Market ISO3 Unavailable",
      source: "UN Comtrade reference data",
      message: "The target market has no ISO-3 mapping available for WITS tariff/supplier enrichment.",
      data: null
    };
  }

  const latestYear = new Date().getUTCFullYear() - 1;
  const years = [latestYear - 4, latestYear - 3, latestYear - 2, latestYear - 1, latestYear];

  const marketImports = [];
  const marketExports = [];
  const indiaExports = [];

  for (const year of years) {
    const [importsPayload, exportsPayload, indiaPayload] = await Promise.all([
      queryComtrade({ reporterCode: marketCode, partnerCode: "0", flowCode: "M", cmdCode: cleanHs, period: year }),
      queryComtrade({ reporterCode: marketCode, partnerCode: "0", flowCode: "X", cmdCode: cleanHs, period: year }),
      queryComtrade({ reporterCode: REPORTER_INDIA, partnerCode: marketCode, flowCode: "X", cmdCode: cleanHs, period: year })
    ]);

    marketImports.push(...buildSeries(importsPayload.data || []));
    marketExports.push(...buildSeries(exportsPayload.data || []));
    indiaExports.push(...buildSeries(indiaPayload.data || []));
  }

  const latest = String(latestYear);
  const importLatest = marketImports.find(item => item.year === latest) || marketImports.at(-1) || null;
  const importFirst = marketImports.find(item => item.year === String(years[0])) || marketImports[0] || null;
  const exportLatest = marketExports.find(item => item.year === latest) || marketExports.at(-1) || null;
  const indiaLatest = indiaExports.find(item => item.year === latest) || indiaExports.at(-1) || null;

  const importPrevious = marketImports.find(item => item.year === String(latestYear - 1)) || null;
  const indiaPrevious = indiaExports.find(item => item.year === String(latestYear - 1)) || null;

  const supplierKey = `${marketIso3}:${cleanHs}:${latestYear}`;
  let suppliers = cache.trade.get(supplierKey);
  if (!suppliers || suppliers.expiresAt < Date.now()) {
    try {
      suppliers = { value: await getTopSuppliers({ marketIso3, hsCode: cleanHs, year: latestYear }), expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
      cache.trade.set(supplierKey, suppliers);
    } catch (error) {
      suppliers = { value: null, error: error.message, expiresAt: Date.now() + 10 * 60 * 1000 };
      cache.trade.set(supplierKey, suppliers);
    }
  }

  const tariffKey = `${marketIso3}:IND:${cleanHs}`;
  let tariff = cache.tariff.get(tariffKey);
  if (!tariff || tariff.expiresAt < Date.now()) {
    try {
      tariff = { value: await getTariffSeries({ marketIso3, hsCode: cleanHs, years: years.slice(-3) }), expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
      cache.tariff.set(tariffKey, tariff);
    } catch (error) {
      tariff = { value: [], error: error.message, expiresAt: Date.now() + 30 * 60 * 1000 };
      cache.tariff.set(tariffKey, tariff);
    }
  }

  const importCagr = cagr(importFirst?.valueUsd, importLatest?.valueUsd, 4);
  const indiaShare = importLatest?.valueUsd > 0 && indiaLatest?.valueUsd != null
    ? Number((indiaLatest.valueUsd / importLatest.valueUsd * 100).toFixed(2))
    : null;
  const tradeBalance = exportLatest?.valueUsd != null && importLatest?.valueUsd != null
    ? Number((exportLatest.valueUsd - importLatest.valueUsd).toFixed(2))
    : null;
  const unitValue = importLatest?.valueUsd != null && importLatest?.quantity > 0
    ? Number((importLatest.valueUsd / importLatest.quantity).toFixed(4))
    : null;

  const supplierData = suppliers.value;
  const hhi = supplierData ? concentrationIndex(supplierData.suppliers) : null;
  const tariffSeries = tariff.value || [];
  const tariffLatest = tariffSeries.at(-1) || null;
  const tariffPrevious = tariffSeries.length > 1 ? tariffSeries.at(-2) : null;

  return {
    status: marketImports.length || indiaExports.length ? "Live Data" : "No Matching Trade Records",
    source: "UN Comtrade public preview + World Bank WITS / UNCTAD TRAINS",
    methodology: "Five-year annual HS-6 merchandise series. Market imports/exports use reporter=target market, partner=World. India exports use reporter=India, partner=target market. Supplier ranking uses World Bank WITS/UN Comtrade reporter=all, partner=target market. Tariffs use WITS/UNCTAD TRAINS.",
    data: {
      hsCode: cleanHs,
      product,
      market,
      marketM49: marketCode,
      marketIso3,
      years,
      marketImports: {
        latest: importLatest,
        first: importFirst,
        previous: importPrevious,
        yoyPercent: yoy(importLatest?.valueUsd, importPrevious?.valueUsd),
        cagrPercent: importCagr,
        series: marketImports
      },
      marketExports: {
        latest: exportLatest,
        series: marketExports
      },
      indiaExportsToMarket: {
        latest: indiaLatest,
        previous: indiaPrevious,
        yoyPercent: yoy(indiaLatest?.valueUsd, indiaPrevious?.valueUsd),
        series: indiaExports
      },
      tradeBalanceUsd: tradeBalance,
      indiaMarketSharePercent: indiaShare,
      averageImportValuePerKgUsd: unitValue,
      supplierCompetition: supplierData ? {
        ...supplierData,
        hhi: hhi
      } : {
        status: "Unavailable",
        reason: "World Bank WITS supplier ranking could not be retrieved for this query."
      },
      tariffIntelligence: {
        source: "World Bank WITS / UNCTAD TRAINS",
        partner: INDIA_ISO3,
        latest: tariffLatest,
        previous: tariffPrevious,
        series: tariffSeries,
        changePercentPoints: tariffLatest && tariffPrevious && tariffLatest.mfnPercent != null && tariffPrevious.mfnPercent != null
          ? Number((tariffLatest.mfnPercent - tariffPrevious.mfnPercent).toFixed(2))
          : null,
        effectiveDateStatus: "Annual validity year is available; an exact implementation date is not inferred from annual WITS tariff records."
      },
      provenance: {
        hsCode: cleanHs,
        marketM49: marketCode,
        marketIso3,
        sourceRetrievedAt: new Date().toISOString(),
        tradeSources: [
          "https://comtradeapi.un.org/",
          `https://wits.worldbank.org/trade/comtrade/en/country/All/year/${latestYear}/tradeflow/Exports/partner/${marketIso3}/product/${cleanHs}`
        ],
        tariffSource: `https://wits.worldbank.org/tariff/trains/en/country/${marketIso3}/year/${latestYear}/partner/IND/product/all/pagenumber/1/pageSize/200`,
        methodologyVersion: "trade-opportunity-v1"
      }
    }
  };
}

function calculateTradeOpportunityScore({ tradeData, verifiedBuyers = 0, buyersDiscovered = 0 }) {
  const d = tradeData;
  if (!d?.marketImports?.latest?.valueUsd) return { score: null, status: "Insufficient live trade data" };

  const components = [];
  const imports = d.marketImports.latest.valueUsd;
  const scale = Math.min(25, Math.max(0, Math.log10(Math.max(1, imports)) * 3.2));
  components.push({ name: "Market import scale", points: Number(scale.toFixed(1)), max: 25, method: "log10(latest HS-6 imports USD) × 3.2, capped at 25" });

  const growth = d.marketImports.cagrPercent;
  const growthScore = growth == null ? 0 : Math.min(20, Math.max(0, 10 + growth / 2));
  components.push({ name: "Five-year import growth", points: Number(growthScore.toFixed(1)), max: 20, method: "10 + CAGR/2, bounded 0–20" });

  const indiaShare = d.indiaMarketSharePercent;
  const shareScore = indiaShare == null ? 0 : Math.min(15, Math.max(0, indiaShare / 2));
  components.push({ name: "India market share", points: Number(shareScore.toFixed(1)), max: 15, method: "India share percentage / 2, capped at 15" });

  const hhi = d.supplierCompetition?.hhi;
  const competitionScore = hhi == null ? 0 : Math.min(15, Math.max(0, 15 * (1 - hhi)));
  components.push({ name: "Supplier diversification", points: Number(competitionScore.toFixed(1)), max: 15, method: "15 × (1 − supplier HHI)" });

  const tariff = d.tariffIntelligence?.latest?.appliedPercent ?? d.tariffIntelligence?.latest?.mfnPercent;
  const tariffScore = tariff == null ? 0 : Math.min(10, Math.max(0, 10 - tariff / 5));
  components.push({ name: "Tariff access", points: Number(tariffScore.toFixed(1)), max: 10, method: "10 − applied tariff / 5, bounded 0–10" });

  const buyerScore = buyersDiscovered > 0 ? Math.min(15, (verifiedBuyers / buyersDiscovered) * 15) : 0;
  components.push({ name: "Verified buyer evidence", points: Number(buyerScore.toFixed(1)), max: 15, method: "Verified buyers / discovered buyers × 15" });

  const score = Number(components.reduce((sum, item) => sum + item.points, 0).toFixed(1));
  return {
    score,
    maxScore: 100,
    status: "Calculated from live trade evidence",
    method: "Weighted data-derived index; not a forecast. Missing components contribute zero rather than being estimated.",
    components
  };
}

async function searchHsCodes(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q || q.length < 2) return [];

  if (!cache.hs.value || cache.hs.expiresAt < Date.now()) {
    const response = await axios.get(
      `${WITS_BASE}/API/V1/wits/datasource/trn/product/ALL?format=JSON`,
      { timeout: 30000 }
    );
    const raw = Array.isArray(response.data) ? response.data : (response.data?.data || response.data?.products || []);
    cache.hs = {
      value: raw.map(row => ({
        code: String(row.ProductCode ?? row.productCode ?? row.Code ?? row.code ?? ""),
        description: String(row.ProductDescription ?? row.productDescription ?? row.Description ?? row.description ?? "")
      })).filter(row => /^\d{6}$/.test(row.code) && row.description),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };
  }

  return cache.hs.value
    .filter(item => item.code.includes(q) || item.description.toLowerCase().includes(q))
    .slice(0, 20);
}

module.exports = {
  buildTradeIntelligence,
  calculateTradeOpportunityScore,
  searchHsCodes,
  resolveCountry
};
