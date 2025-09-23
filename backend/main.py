"""
Main FastAPI application.
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .app.services import database
from .app.routers import auth, users, tasks, sessions, reviews, dashboard, invitations

# Create FastAPI app
app = FastAPI(
    title="Efference Video Training Platform API",
    description="API for managing video training sessions, tasks, and reviews",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(sessions.router)
app.include_router(reviews.router)
app.include_router(dashboard.router)
app.include_router(invitations.router)


@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "message": "Welcome to the Efference Video Training Platform API",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
def health_check(db: Session = Depends(database.get_db)):
    """Health check endpoint"""
    try:
        # Simple database connectivity test
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


# Startup event
@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    print("🚀 Efference Video Training Platform API is starting up...")
    print("📚 API Documentation available at /docs")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    print("🛑 Efference Video Training Platform API is shutting down...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)