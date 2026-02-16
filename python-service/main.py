from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import os

app = FastAPI()
model = SentenceTransformer("all-MiniLM-L6-v2")
chroma_client = chromadb.PersistentClient(path="./chroma-data")

class IngestRequest(BaseModel):
    collection: str
    chunks: list[dict]  # [{text, file, startLine, endLine, language}]

class QueryRequest(BaseModel):
    collection: str
    question: str
    top_k: int = 5

@app.post("/ingest")
def ingest(req: IngestRequest):
    collection = chroma_client.get_or_create_collection(req.collection)
    texts = [c["text"] for c in req.chunks]
    embeddings = model.encode(texts).tolist()
    ids = [f"{c['file']}:{c['startLine']}" for c in req.chunks]
    metadatas = [{k: v for k, v in c.items() if k != "text"} for c in req.chunks]
    collection.upsert(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
    return {"indexed": len(req.chunks)}

@app.post("/query")
def query(req: QueryRequest):
    collection = chroma_client.get_or_create_collection(req.collection)
    question_embedding = model.encode([req.question]).tolist()
    results = collection.query(query_embeddings=question_embedding, n_results=req.top_k)
    chunks = []
    for i, doc in enumerate(results["documents"][0]):
        chunks.append({
            "text": doc,
            "metadata": results["metadatas"][0][i],
        })
    return {"chunks": chunks}
