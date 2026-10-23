# ask-user

Server extension. Registers the `ask_user` tool: the agent asks a question (optionally with `options`, a `recommended` choice, or several `questions` shown as tabs) and waits for your answer in the pipaya client.

It reads no files, runs no commands and makes no network calls. The question and your answer only pass through the server's question channel (`ctx.ask`). It uses the same tool name as the built-in tool, so it replaces it. Requires a server version that provides `ctx.ask`.
