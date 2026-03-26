import argparse
import json
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from llama_cpp import Llama
import asyncio

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
                stream=True
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
            echo=False
        )
        return output

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_path", type=str, required=True)
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--n_ctx", type=int, default=2048)
    parser.add_argument("--n_threads", type=int, default=4)
    args = parser.parse_args()

    llm = Llama(
        model_path=args.model_path,
        n_ctx=args.n_ctx,
        n_threads=args.n_threads
    )

    uvicorn.run(app, host="0.0.0.0", port=args.port)
