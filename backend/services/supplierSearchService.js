const demoSupplierData = [
  {
    name: "Global Agro Exporters",
    product: "Rice",
    country: "India",
    website: "https://example.com/global-agro",
    email: "sales@globalagro.example.com",
    phone: "+91-9000000001",
    source: "TradeFlow Demo Intelligence",
    tags: ["rice", "agri", "exporter", "bulk"],
    notes: "Demo supplier profile for testing supplier discovery."
  },
  {
    name: "Premium Food Trading LLC",
    product: "Rice",
    country: "UAE",
    website: "https://example.com/premium-food",
    email: "contact@premiumfood.example.com",
    phone: "+971-500000001",
    source: "TradeFlow Demo Intelligence",
    tags: ["rice", "food importer", "uae", "trading"],
    notes: "Useful for UAE food import/export workflow testing."
  },
  {
    name: "Natural Jaggery India",
    product: "Jaggery",
    country: "India",
    website: "https://example.com/natural-jaggery",
    email: "exports@naturaljaggery.example.com",
    phone: "+91-9000000002",
    source: "TradeFlow Demo Intelligence",
    tags: ["jaggery", "organic", "food", "export"],
    notes: "Demo jaggery supplier with export-ready profile."
  },
  {
    name: "MedSupply Global",
    product: "Medicine",
    country: "India",
    website: "https://example.com/medsupply",
    email: "business@medsupply.example.com",
    phone: "+91-9000000003",
    source: "TradeFlow Demo Intelligence",
    tags: ["medicine", "pharma", "healthcare", "export"],
    notes: "Demo pharmaceutical supplier. Real compliance verification required."
  },
  {
    name: "Fresh Agri Commodities",
    product: "Agri Products",
    country: "India",
    website: "https://example.com/fresh-agri",
    email: "trade@freshagri.example.com",
    phone: "+91-9000000004",
    source: "TradeFlow Demo Intelligence",
    tags: ["agri", "commodities", "farm", "bulk"],
    notes: "General agri commodity supplier profile."
  }
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function calculateSupplierScore(supplier, query) {
  let score = 50;

  const product = normalize(query.product);
  const country = normalize(query.country);
  const text = normalize(
    `${supplier.name} ${supplier.product} ${supplier.country} ${(supplier.tags || []).join(" ")}`
  );

  if (product && text.includes(product)) score += 20;
  if (country && normalize(supplier.country).includes(country)) score += 15;
  if (supplier.email) score += 5;
  if (supplier.phone) score += 5;
  if (supplier.website) score += 5;

  return Math.min(score, 100);
}

async function searchSuppliers(query = {}) {
  const product = normalize(query.product);
  const country = normalize(query.country);

  let results = demoSupplierData.filter((supplier) => {
    const combined = normalize(
      `${supplier.name} ${supplier.product} ${supplier.country} ${(supplier.tags || []).join(" ")}`
    );

    const productMatch = !product || combined.includes(product);
    const countryMatch = !country || normalize(supplier.country).includes(country);

    return productMatch && countryMatch;
  });

  if (results.length === 0) {
    results = demoSupplierData;
  }

  return results.map((supplier) => ({
    supplierName: supplier.name,
    product: supplier.product,
    country: supplier.country,
    website: supplier.website,
    email: supplier.email,
    phone: supplier.phone,
    source: supplier.source,
    notes: supplier.notes,
    score: calculateSupplierScore(supplier, query),
    status: "Discovered Lead"
  }));
}

module.exports = {
  searchSuppliers
};