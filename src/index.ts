import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// JSON-RPC request type (can be request or notification)
interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id?: string | number | null; // undefined for notifications
}

// Global server instance
let server: McpServer | null = null;

// Function to get or create the MCP server
function getServer(): McpServer {
  if (!server) {
    server = new McpServer({
      name: "CatalysisHub",
      version: "0.1.0"
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Register the GraphQL execution tool
    // This tool allows executing any GraphQL query against the Catalysis Hub API.
    // The Catalysis Hub contains computational catalysis data including:
    // - Reaction energetics and barriers
    // - Surface structures
    // - DFT calculation parameters
    // - Publication metadata
    //
    // Example queries:
    // 1. List reactions: 
    //    query { reactions(first: 10) { edges { node { id chemicalComposition } } } }
    // 2. Search publications: 
    //    query { publications(first: 10) { edges { node { title authors year doi } } } }
    // 3. Get systems/materials: 
    //    query { systems(first: 10) { edges { node { id energy } } } }
    // 4. Explore schema (introspection):
    //    query { __schema { queryType { name } types { name kind description } } }
    // 5. Search for specific reactions:
    //    query { reactions(textsearch: "CO2", first: 5) { edges { node { id chemicalComposition } } } }
    server.tool(
      "catalysishub_graphql",
      "Execute GraphQL queries against the Catalysis Hub API",
      {
        query: z.string().describe(
          "The GraphQL query to execute against the Catalysis Hub API. Use introspection queries to discover the schema. If you get a HTTP 400 error, it means the query is invalid, and you should run introspection queries in order to correct your queries."
        ),
        variables: z.record(z.any()).optional().describe(
          "Optional dictionary of variables for the GraphQL query"
        ),
      },
      async ({ query, variables }: { query: string; variables?: Record<string, any> }) => {
        console.error(`Executing catalysishub_graphql with query: ${query.slice(0, 100)}...`);
        
        const result = await executeGraphQLQuery(query, variables);
        
        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify(result)
          }]
        };
      }
    );

    console.error("Catalysis Hub MCP Server initialized.");
  }
  
  return server;
}

// Helper function to execute GraphQL queries
async function executeGraphQLQuery(query: string, variables?: Record<string, any>): Promise<any> {
  const GRAPHQL_ROOT = 'http://api.catalysis-hub.org/graphql';
  
  try {
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "MCPCatalysisHubServer/0.1.0"
    };
    
    const data: Record<string, any> = {
      query
    };
    
    if (variables) {
      data.variables = variables;
    }
    
    console.error(`Debug - Making GraphQL request to: ${GRAPHQL_ROOT}`);
    
    const response = await fetch(GRAPHQL_ROOT, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    
    console.error(`Debug - API response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error during Catalysis Hub request: ${error instanceof Error ? error.message : String(error)}`);
    
    if (error instanceof TypeError || error instanceof Error) {
      return { 
        errors: [{ 
          message: `HTTP Request Error connecting to Catalysis Hub: ${error.message}` 
        }]
      };
    }
    
    return { 
      errors: [{ 
        message: `An unexpected error occurred: ${String(error)}` 
      }]
    };
  }
}

// Export the fetch handler
interface Env {
  // Add environment variables if needed
  MCP_HOST?: string;
  MCP_PORT?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };
    
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      
      if (request.method !== 'POST') {
        return new Response("Catalysis Hub MCP Server - Ready", {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
      }
      
      const mcpServer = getServer();
      const requestBody = await request.json() as JsonRpcRequest;
      console.error(`Received MCP request: ${JSON.stringify(requestBody)}`);
      
      // Handle JSON-RPC requests manually
      if (requestBody.method === 'initialize') {
        const clientProtocolVersion = requestBody.params?.protocolVersion || "2024-11-05";
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: requestBody.id,
          result: {
            protocolVersion: clientProtocolVersion, // Use the client's protocol version
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "CatalysisHub",
              version: "0.1.0"
            }
          }
        }), { headers: corsHeaders });
      }
      
      // Handle notifications (they don't have an id field)
      if (requestBody.method && !requestBody.id) {
        if (requestBody.method === 'notifications/initialized') {
          console.error('Received notifications/initialized - client is ready for operations');
          // Notifications don't expect a JSON-RPC response, just HTTP 204
          return new Response(null, { status: 204, headers: corsHeaders });
        }
        
        // Handle other notifications if needed
        console.error(`Received unknown notification: ${requestBody.method}`);
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      
      if (requestBody.method === 'tools/list') {
        // Return the tools list manually since we know what tools are registered
        const tools = [{
          name: "catalysishub_graphql",
          description: "Execute GraphQL queries against the Catalysis Hub API",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The GraphQL query to execute against the Catalysis Hub API. Use introspection queries to discover the schema. If you get a HTTP 400 error, it means the query is invalid, and you should run introspection queries in order to correct your queries."
              },
              variables: {
                type: "object",
                description: "Optional dictionary of variables for the GraphQL query"
              }
            },
            required: ["query"]
          }
        }];
        
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: requestBody.id,
          result: { tools }
        }), { headers: corsHeaders });
      }
      
      if (requestBody.method === 'tools/call') {
        const { name, arguments: args } = requestBody.params;
        
        if (name === 'catalysishub_graphql') {
          try {
            console.error(`Executing catalysishub_graphql with query: ${args.query?.slice(0, 100)}...`);
            const result = await executeGraphQLQuery(args.query, args.variables);
            
            return new Response(JSON.stringify({
              jsonrpc: "2.0",
              id: requestBody.id,
              result: {
                content: [{
                  type: "text",
                  text: JSON.stringify(result)
                }]
              }
            }), { headers: corsHeaders });
          } catch (toolError) {
            console.error(`Tool execution error for ${name}:`, toolError);
            return new Response(JSON.stringify({
              jsonrpc: "2.0",
              id: requestBody.id,
              error: {
                code: -32603,
                message: `Tool execution failed: ${toolError instanceof Error ? toolError.message : String(toolError)}`
              }
            }), { status: 500, headers: corsHeaders });
          }
        }
        
        // Tool not found
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: requestBody.id,
          error: {
            code: -32601,
            message: `Tool not found: ${name}`
          }
        }), { status: 404, headers: corsHeaders });
      }
      
      // Method not found
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: requestBody.id,
        error: {
          code: -32601,
          message: `Method not found: ${requestBody.method}`
        }
      }), { status: 404, headers: corsHeaders });
      
    } catch (error) {
      console.error("Error in fetch handler:", error);
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      }), { status: 500, headers: corsHeaders });
    }
  },
}; 