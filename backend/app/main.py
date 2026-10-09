#FastAPI app + /api/forecast route
from fastapi import FastAPI

app = FastAPI(title="Weather App")

@app.get("/api/health")
def health():
    return {"status": "ok"}
