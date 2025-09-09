from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.routes import datasets, downloads
from app.config import settings

app = FastAPI(
    title="VLM Dataset Serve API",
    description="API for serving VLM datasets from S3 with CloudFront CDN",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(datasets.router)
app.include_router(downloads.router)

@app.get("/")
async def root():
    return {"message": "VLM Dataset Serve API", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)
