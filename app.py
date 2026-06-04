from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, MessagesState, START
from langgraph.checkpoint.memory import MemorySaver

import json

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# LangGraph Setup
llm = ChatOllama(
    model="gemma3:4b",
    temperature=0.7
)

def chatbot(state: MessagesState):
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

builder = StateGraph(MessagesState)
builder.add_node("chatbot", chatbot)
builder.add_edge(START, "chatbot")

graph = builder.compile(
    checkpointer=MemorySaver()
)


# Routes
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )

@app.post("/chat")
async def chat(request: Request):

    body = await request.json()

    user_message = body["message"]
    thread_id = body.get("thread_id", "default")

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    def generate():

        for chunk, metadata in graph.stream(
            {
                "messages": [
                    ("user", user_message)
                ]
            },
            config=config,
            stream_mode="messages",
        ):
            if chunk.content:
                yield f"data: {json.dumps(chunk.content)}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )