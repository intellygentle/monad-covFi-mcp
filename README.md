### Summary of Commands
Here’s a recap of the prerequisite commands to set up your MCP project:

```bash
https://github.com/intellygentle/monad-covFi-mcp.git
cd monad-covFi-mcp
```


# Install dependencies
```bash 
npm isntall
npm install @modelcontextprotocol/sdk zod viem
npm install dotenv
```
- create an env file in your dist folder
  ```bash
  code .env # fill it with PRIVATE_KEY=0xYourPrivateKey
  ```

- edit the monad-magma-Tools.ts in the src folder with the path to your env. this is so that claude can load it

<img width="374" alt="env" src="https://github.com/user-attachments/assets/71bf86af-f7e0-449c-9620-b50e88ce3acc" />

 
# Build and run
```bash
npm run build
```

# configure claude json file
- copy the output of which node
```bash
which node  # it should look like this /home/yourUsername/.nvm/versions/node/v23.11.0/bin/node
```
- copy the path to your js file
- combine the two to make your claude json setup
- ```bash
  { "mcpServers": {
    "monad-mcp": {
      "command": "wsl",
      "args": [
         "/home/yourUsername/.nvm/versions/node/v23.11.0/bin/node",
        "/home/yourUsername/monad-covFi-mcp/dist/index.js"
      ]
    }
  ```

# Test with MCP Inspector
be sure to edit "username" use your directory
```bash
npx @modelcontextprotocol/inspector /home/username/.nvm/versions/node/v23.11.0/bin/node /home/username/monad-covFi-mcp/dist/index.js
```



# Claude will look like this



