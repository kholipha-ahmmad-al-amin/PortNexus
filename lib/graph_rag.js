// Static illustrative trade graph. Node links and regulatory statements require official review.

const GRAPH_NODES = [
  // Commodities
  { id: 'COMMODITY_COTTON_TSHIRT', label: 'Cotton T-Shirt (Knitted)', type: 'Commodity' },
  { id: 'COMMODITY_DENIM_TROUSER', label: "Men's Denim Trousers (Woven)", type: 'Commodity' },
  { id: 'COMMODITY_LEATHER_SHOES', label: 'Leather Ankle Shoes', type: 'Commodity' },
  { id: 'COMMODITY_SOLAR_INVERTER', label: 'Industrial Solar Inverter', type: 'Commodity' },

  // HS Codes
  { id: 'HS_6109_10', label: 'HS 6109.10 (Knitted Cotton T-Shirts)', type: 'HSCode', chapter: '61' },
  { id: 'HS_6203_42', label: 'HS 6203.42 (Woven Cotton Trousers)', type: 'HSCode', chapter: '62' },
  { id: 'HS_6403_91', label: 'HS 6403.91 (Leather Footwear)', type: 'HSCode', chapter: '64' },
  { id: 'HS_8504_40', label: 'HS 8504.40 (Static Inverters)', type: 'HSCode', chapter: '85' },

  // Countries & Ports
  { id: 'PORT_CHATTOGRAM', label: 'Chattogram Port (BDCGP)', type: 'Port', country: 'Bangladesh' },
  { id: 'PORT_ROTTERDAM', label: 'Port of Rotterdam (NLRTM)', type: 'Port', country: 'Netherlands' },
  { id: 'PORT_HAMBURG', label: 'Port of Hamburg (DEHAM)', type: 'Port', country: 'Germany' },
  { id: 'PORT_NEWYORK', label: 'Port of New York / New Jersey (USNYC)', type: 'Port', country: 'United States' },

  // Trade Agreements
  { id: 'FTA_EU_EBA', label: 'EU Everything But Arms (EBA)', type: 'TradeAgreement', dutyDiscount: 'Preference eligibility depends on current product-specific origin rules and proof.' },
  { id: 'FTA_SAFTA', label: 'South Asian Free Trade Area (SAFTA)', type: 'TradeAgreement', dutyDiscount: 'Concessional rates' },
  { id: 'FTA_US_NTR', label: 'US Normal Trade Relations (MFN)', type: 'TradeAgreement', dutyDiscount: 'Standard MFN tariff' },

  // Compliance & Regulatory Frameworks
  { id: 'REG_EU_CBAM', label: 'EU Carbon Border Adjustment Mechanism (CBAM)', type: 'Regulation' },
  { id: 'REG_EU_CSDDD', label: 'EU Corporate Sustainability Due Diligence Directive', type: 'Regulation' },
  { id: 'REG_UCP_600', label: 'ICC Uniform Customs and Practice (UCP 600)', type: 'BankingStandard' }
];

const GRAPH_EDGES = [
  { source: 'COMMODITY_COTTON_TSHIRT', target: 'HS_6109_10', relation: 'CLASSIFIED_UNDER', confidence: 0.98 },
  { source: 'COMMODITY_DENIM_TROUSER', target: 'HS_6203_42', relation: 'CLASSIFIED_UNDER', confidence: 0.99 },
  { source: 'COMMODITY_LEATHER_SHOES', target: 'HS_6403_91', relation: 'CLASSIFIED_UNDER', confidence: 0.95 },
  { source: 'COMMODITY_SOLAR_INVERTER', target: 'HS_8504_40', relation: 'CLASSIFIED_UNDER', confidence: 0.94 },

  { source: 'HS_6109_10', target: 'PORT_CHATTOGRAM', relation: 'PRIMARY_EXPORT_ORIGIN' },
  { source: 'PORT_CHATTOGRAM', target: 'PORT_ROTTERDAM', relation: 'DIRECT_SHIPPING_LANE', transitDays: 24 },
  { source: 'PORT_CHATTOGRAM', target: 'PORT_HAMBURG', relation: 'DIRECT_SHIPPING_LANE', transitDays: 26 },
  { source: 'PORT_CHATTOGRAM', target: 'PORT_NEWYORK', relation: 'DIRECT_SHIPPING_LANE', transitDays: 32 },

  { source: 'PORT_ROTTERDAM', target: 'FTA_EU_EBA', relation: 'GOVERNED_BY' },
  { source: 'PORT_HAMBURG', target: 'FTA_EU_EBA', relation: 'GOVERNED_BY' },
  { source: 'PORT_NEWYORK', target: 'FTA_US_NTR', relation: 'GOVERNED_BY' },

  { source: 'COMMODITY_COTTON_TSHIRT', target: 'REG_EU_CSDDD', relation: 'SUBJECT_TO_AUDIT', requirement: 'Supply chain labor & environmental traceability' },
  { source: 'COMMODITY_DENIM_TROUSER', target: 'REG_EU_CSDDD', relation: 'SUBJECT_TO_AUDIT', requirement: 'Water usage & chemical effluent clearance' },
  { source: 'COMMODITY_SOLAR_INVERTER', target: 'REG_EU_CBAM', relation: 'SUBJECT_TO_CARBON_TARIFF', requirement: 'Embodied carbon reporting' }
];

function queryGraph(sourceCommodityId, destinationPortId) {
  // Find commodity node
  const commNode = GRAPH_NODES.find(n => n.id === sourceCommodityId);
  // Find destination port node
  const destNode = GRAPH_NODES.find(n => n.id === destinationPortId);
  if (!commNode || !destNode) {
    return { error: 'Unknown commodity or destination port in the local demonstration graph.', dataStatus: 'STATIC_ILLUSTRATION' };
  }

  // Traverse: commodity -> HS code
  const hsEdge = GRAPH_EDGES.find(e => e.source === sourceCommodityId && e.relation === 'CLASSIFIED_UNDER');
  const hsNode = hsEdge ? GRAPH_NODES.find(n => n.id === hsEdge.target) : null;

  // Traverse: shipping lane between Chittagong and destination port
  const laneEdge = GRAPH_EDGES.find(e => e.source === 'PORT_CHATTOGRAM' && e.target === destinationPortId);

  // Traverse: destination port -> trade agreements
  const ftaEdge = GRAPH_EDGES.find(e => e.source === destinationPortId && e.relation === 'GOVERNED_BY');
  const ftaNode = ftaEdge ? GRAPH_NODES.find(n => n.id === ftaEdge.target) : null;

  // Traverse: regulations
  const regEdges = GRAPH_EDGES.filter(e => e.source === sourceCommodityId && e.relation.startsWith('SUBJECT_TO'));
  const regulations = regEdges.map(e => ({
    regNode: GRAPH_NODES.find(n => n.id === e.target),
    requirement: e.requirement
  }));

  return {
    commodity: commNode,
    classifiedHS: hsNode,
    shippingLane: laneEdge ? {
      origin: 'Chattogram Port (BDCGP)',
      destination: destNode ? destNode.label : destinationPortId,
      transitDays: laneEdge.transitDays
    } : null,
    tradeAgreement: ftaNode ? {
      agreement: ftaNode.label,
      benefit: ftaNode.dutyDiscount
    } : null,
    applicableRegulations: regulations,
    dataStatus: 'STATIC_ILLUSTRATION',
    requiresOfficialReview: true,
  };
}

module.exports = {
  GRAPH_NODES,
  GRAPH_EDGES,
  queryGraph
};
