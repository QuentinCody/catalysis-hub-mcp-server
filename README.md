# Catalysis Hub for Claude Desktop

This guide will help you connect Claude Desktop to the Catalysis Hub database, allowing you to search and analyze computational catalysis data directly in your conversations with Claude.

## What is Catalysis Hub?

Catalysis Hub is a database containing computational catalysis research data, including:
- Reaction energetics and barriers
- Surface structures and properties
- Density Functional Theory (DFT) calculation parameters
- Publication metadata and references

By connecting Claude to this database, you can ask questions about catalysis research, look up specific reactions, and analyze materials data without having to navigate complex databases yourself.

## Setting Up Claude Desktop (Simple Method)

Follow these simple steps to enable Catalysis Hub in your Claude Desktop application:

1. **Open Claude Desktop** on your computer
2. Click on the **Settings** icon (gear icon)
3. Select the **Developer** tab
4. Click **Edit Config** to open the configuration file
5. Add the following code to the `mcpServers` section:

```json
"catalysis-hub": {
  "command": "npx",
  "args": [
    "mcp-remote",
    "https://catalysis-hub-mcp-server.quentincody.workers.dev/sse"
  ]
}
```

6. **Save** the file
7. **Restart** Claude Desktop

## Using Catalysis Hub with Claude

After setting up Claude Desktop, you can now ask Claude to access information from the Catalysis Hub database. Here are some examples of what you can ask:

- "Can you use Catalysis Hub to list 5 recent publications about CO2 reduction?"
- "Search Catalysis Hub for reactions involving platinum catalysts"
- "Use Catalysis Hub to tell me about the most studied metal surfaces in the database"
- "Get information about adsorption energies for carbon monoxide on different metal surfaces from Catalysis Hub"

Claude will use the GraphQL interface to query the database and return the relevant information to you.

## Example Queries

Here are specific examples showing how to ask Claude to use Catalysis Hub effectively:

1. **List recent publications**:
   "Using Catalysis Hub, could you list 5 recent publications about water splitting catalysts?"

2. **Find specific reactions**:
   "Can you search Catalysis Hub for CO2 reduction reactions and summarize the findings?"

3. **Compare catalyst materials**:
   "Use Catalysis Hub to compare adsorption energies of hydrogen on platinum versus palladium surfaces"

4. **Explore reaction mechanisms**:
   "Using Catalysis Hub, can you find information about the oxygen evolution reaction mechanism on oxide catalysts?"

## Troubleshooting

If Claude says it can't access Catalysis Hub:

1. Make sure you've correctly added the configuration to Claude Desktop
2. Restart Claude Desktop completely
3. When asking Claude to use Catalysis Hub, be specific that you want it to use the "catalysis-hub" tool
4. If errors persist about queries, try asking Claude to run an introspection query first to understand the database schema

## Need Help?

If you encounter any issues or have questions about using Catalysis Hub with Claude Desktop, please contact technical support or the database administrators.

Happy researching!
