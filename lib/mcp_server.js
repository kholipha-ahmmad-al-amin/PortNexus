// PortNexus MCP tool definitions and stateless Streamable HTTP tool dispatch.

const { searchHSCode, classifyCommodity, calculateTotalDuties } = require('./hscode_database');
const { auditTradePackage } = require('./ucp600_rules');
const { queryGraph } = require('./graph_rag');
const { searchContextualRAG } = require('./contextual_rag');
const { parseSWIFTMT700, validateParsedMT700 } = require('./swift_mt700_parser');

const MCP_TOOLS = [
  {
    name: 'classify_hs_code',
    description: 'Return a keyword-based HS code candidate from a limited sample dataset. The result requires human and official tariff review.',
    inputSchema: {
      type: 'object',
      properties: {
        commodityDescription: {
          type: 'string',
          description: 'Description of the goods (e.g. 100% cotton knitted t-shirts)'
        },
        invoiceValueUsd: {
          type: 'number',
          description: 'Total commercial invoice value in USD (optional)'
        },
        exchangeRateBdt: {
          type: 'number',
          description: 'Current user-supplied BDT per USD exchange rate (required for an indicative calculation)'
        }
      },
      required: ['commodityDescription']
    }
  },
  {
    name: 'audit_letter_of_credit',
    description: 'Compare selected extracted fields in a trade package. Missing or non-identical values may require qualified human review.',
    inputSchema: {
      type: 'object',
      properties: {
        lc: { type: 'object', description: 'Letter of credit parameters' },
        invoice: { type: 'object', description: 'Commercial invoice parameters' },
        bl: { type: 'object', description: 'Bill of lading parameters' }
      },
      required: ['lc', 'invoice']
    }
  },
  {
    name: 'query_trade_graph',
    description: 'Query a static illustrative trade graph. Verify any route, agreement, and regulatory result against current official sources.',
    inputSchema: {
      type: 'object',
      properties: {
        commodityId: { type: 'string', description: 'Identifier of commodity' },
        destinationPortId: { type: 'string', description: 'Destination port node ID' }
      },
      required: ['commodityId', 'destinationPortId']
    }
  },
  {
    name: 'search_trade_regulations',
    description: 'Search a small local keyword corpus. Results have no maintained source links and require primary-source verification.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Question or search terms regarding trade compliance' }
      },
      required: ['query']
    }
  },
  {
    name: 'parse_swift_mt700',
    description: 'Parse an MT700 FIN message and report required-field validation results.',
    inputSchema: {
      type: 'object',
      properties: { rawMessage: { type: 'string', description: 'Raw SWIFT MT700 FIN message.' } },
      required: ['rawMessage']
    }
  }
];

function handleMcpToolCall(toolName, args) {
  switch (toolName) {
    case 'classify_hs_code': {
      const classification = classifyCommodity(args.commodityDescription);
      let duties = null;
      if (args.invoiceValueUsd !== undefined && args.invoiceValueUsd !== null && args.exchangeRateBdt && classification.match) {
        duties = calculateTotalDuties(classification.match, args.invoiceValueUsd, args.exchangeRateBdt);
      }
      return {
        tool: 'classify_hs_code',
        classification,
        duties,
        tariffDataStatus: 'UNVERIFIED_DEMONSTRATION_RATES'
      };
    }

    case 'audit_letter_of_credit': {
      return {
        tool: 'audit_letter_of_credit',
        audit: auditTradePackage(args)
      };
    }

    case 'query_trade_graph': {
      return {
        tool: 'query_trade_graph',
        result: queryGraph(args.commodityId, args.destinationPortId)
      };
    }

    case 'search_trade_regulations': {
      return {
        tool: 'search_trade_regulations',
        citations: searchContextualRAG(args.query)
      };
    }

    case 'parse_swift_mt700': {
      const parsed = parseSWIFTMT700(args.rawMessage);
      return { tool: 'parse_swift_mt700', parsed, validation: validateParsedMT700(parsed) };
    }

    default:
      throw new Error(`Unknown MCP Tool: ${toolName}`);
  }
}

module.exports = {
  MCP_TOOLS,
  handleMcpToolCall
};
