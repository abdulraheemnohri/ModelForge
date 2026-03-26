import argparse
import json
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from llama_cpp import Llama
import asyncio
import sys

app = FastAPI()
llm = None

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    global llm
    data = await request.json()
    messages = data.get("messages", [])
    stream = data.get("stream", False)

    prompt = ""
    for msg in messages:
        prompt += f"{msg['role']}: {msg['content']}\n"
    prompt += "assistant: "

    if stream:
        async def stream_generator():
            output = llm(
                prompt,
                max_tokens=data.get("max_tokens", 512),
                stop=["user:", "\n"],
                echo=False,
                stream=True,
                temperature=data.get("temperature", 0.7),
                top_p=data.get("top_p", 0.9)
            )
            for chunk in output:
                yield f"data: {json.dumps(chunk)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    else:
        output = llm(
            prompt,
            max_tokens=data.get("max_tokens", 512),
            stop=["user:", "\n"],
            echo=False,
            temperature=data.get("temperature", 0.7),
            top_p=data.get("top_p", 0.9)
        )
        return output

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_path", type=str, required=True)
    parser.add_argument("--port", type=int, required=True)
    # Swallow unknown arguments from config
    args, unknown = parser.parse_known_args()

    # Try to extract extra params from unknown if any, but better to use defaults or pass via JSON
    # For now, let's just use defaults in Llama init and let the chat endpoint override them

    llm = Llama(
        model_path=args.model_path,
        n_ctx=2048,
        n_threads=4
    )

    uvicorn.run(app, host="0.0.0.0", port=args.port)
