const axios = require("axios");

const COMTRADE_BASE = "https://comtradeapi.un.org/public/v1";
const REPORTER_INDIA = "699";
const cache = { countries: null, expiresAt: 0 };

function normaliseCountry(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

async function getCountryCodes() {
  if (cache.countries && cache.expiresAt > Date.now()) return cache.countries;

  const response = await axios.get(
    "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json",
    { timeout: 15000 }
  );

  const rows = Array.isArray(response.data) ? response.data : (response.data?.data || []);
  const map = new Map();

  for (const row of rows) {
    const code = row.m49Code ?? row.code ?? row.id;
    const name = row.text ?? row.partnerAreaDesc ?? row.name ?? row.description;
    if (code != null && name) map.set(normaliseCountry(name), String(code));
  }

  cache.countries = map;
  cache.expiresAt = Date.now() + 6 * 60 * 60 * 1000;
  return map;
}

async function resolveReporterCode(country) {
  const normalized = normaliseCountry(country);
  const aliases = {
    "uae": "united arab emirates",
    "u.a.e.": "united arab emirates",
    "usa": "united states of america",
    "us": "united states of america",
    "uk": "united kingdom",
    "korea": "republic of korea",
    "south korea": "republic of korea"
  };

  const target = aliases[normalized] || normalized;
  const map = await getCountryCodes();
  const direct = map.get(target);
  if (direct) return direct;

  for (const [name, code] of map.entries()) {
    if (name.includes(target) || target.includes(name)) return code;
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
    maxRecords: 50,
    format: "json"
  };

  const response = await axios.get(
    `${COMTRADE_BASE}/preview/C/A/HS`,
    { params, timeout: 20000 }
  );

  return response.data || {};
}

function firstRecord(payload) {
  return Array.isArray(payload?.data) && payload.data.length ? payload.data[0] : null;
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildSeries(records) {
  return records.map(record => ({
    year: String(record.period || record.refYear || ""),
    valueUsd: number(record.primaryValue),
    quantity: number(record.netWgt ?? record.netWeight),
    quantityUnit: record.qtyUnitAbbr || record.qtyUnit || "kg"
  })).filter(item => item.year && item.valueUsd != null);
}

function yoy(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
}

async function buildTradeIntelligence({ product, market, hsCode }) {
  const cleanHs = String(hsCode || "").replace(/\D/g, "").slice(0, 6);
  if (!cleanHs || cleanHs.length !== 6) {
    return {
      status: "Needs HS Code",
      source: "UN Comtrade",
      message: "A valid 6-digit HS code is required for product-level trade statistics. TradeFlow does not guess the classification.",
      data: null
    };
  }

  const marketCode = await resolveReporterCode(market);
  if (!marketCode) {
    return {
      status: "Market Not Resolved",
      source: "UN Comtrade",
      message: `TradeFlow could not resolve "${market}" to a UN M49 reporting economy. No trade statistic was invented.`,
      data: null
    };
  }

  const currentYear = new Date().getUTCFullYear() - 1;
  const years = [currentYear - 2, currentYear - 1, currentYear];

  const imports = [];
  const indiaExports = [];

  for (const year of years) {
    const [importsPayload, exportsPayload] = await Promise.all([
      queryComtrade({
        reporterCode: marketCode,
        partnerCode: "0",
        flowCode: "M",
        cmdCode: cleanHs,
        period: year
      }),
      queryComtrade({
        reporterCode: REPORTER_INDIA,
        partnerCode: marketCode,
        flowCode: "X",
        cmdCode: cleanHs,
        period: year
      })
    ]);

    imports.push(...buildSeries(importsPayload.data || []));
    indiaExports.push(...buildSeries(exportsPayload.data || []));
  }

  const importLatest = imports.find(item => item.year === String(currentYear)) || imports.at(-1) || null;
  const importPrevious = imports.find(item => item.year === String(currentYear - 1)) || null;

  const exportLatest = indiaExports.find(item => item.year === String(currentYear)) || indiaExports.at(-1) || null;
  const exportPrevious = indiaExports.find(item => item.year === String(currentYear - 1)) || null;

  const avgUnitValue = importLatest?.valueUsd != null && importLatest?.quantity
    ? Number((importLatest.valueUsd / importLatest.quantity).toFixed(4))
    : null;

  return {
    status: imports.length || indiaExports.length ? "Live Data" : "No Matching Trade Records",
    source: "UN Comtrade public preview",
    methodology: "Annual merchandise trade at HS-6. Market imports are reporter=target market, partner=World. India exports are reporter=India, partner=target market. Values are reported trade statistics, not forecasts.",
    data: {
      hsCode: cleanHs,
      product,
      market,
      marketM49: marketCode,
      years,
      marketImports: {
        latest: importLatest,
        previous: importPrevious,
        yoyPercent: yoy(importLatest?.valueUsd, importPrevious?.valueUsd),
        series: imports
      },
      indiaExportsToMarket: {
        latest: exportLatest,
        previous: exportPrevious,
        yoyPercent: yoy(exportLatest?.valueUsd, exportPrevious?.valueUsd),
        series: indiaExports
      },
      averageImportValuePerKgUsd: avgUnitValue
    }
  };
}

module.exports = { buildTradeIntelligence, resolveReporterCode };
