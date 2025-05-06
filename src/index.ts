import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our Catalysis Hub MCP agent
export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "CatalysisHub",
    version: "0.1.0",
    description: "API for accessing computational catalysis data from the Catalysis Hub database"
  });

  // Catalysis Hub API Configuration
  private readonly GRAPHQL_ROOT = 'http://api.catalysis-hub.org/graphql';

  async init() {
    console.error("Catalysis Hub MCP Server initialized.");

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
    this.server.tool(
      "catalysishub_graphql",
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
        
        const result = await this.executeGraphQLQuery(query, variables);
        
        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify(result)
          }]
        };
      }
    );
  }

  // Helper function to execute GraphQL queries
  private async executeGraphQLQuery(query: string, variables?: Record<string, any>): Promise<any> {
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
      
      console.error(`Debug - Making GraphQL request to: ${this.GRAPHQL_ROOT}`);
      
      const response = await fetch(this.GRAPHQL_ROOT, {
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
}

// Export the fetch handler
interface Env {
  // Add environment variables if needed
  MCP_HOST?: string;
  MCP_PORT?: string;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      // @ts-ignore
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      // @ts-ignore
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Get environment variables for host and port information
    const host = env.MCP_HOST || "localhost";
    const port = parseInt(env.MCP_PORT || "8000");
    
    console.error(`Listening on ${host}:${port}`);

    return new Response("Catalysis Hub MCP Server - Not found", { status: 404 });
  },
}; 