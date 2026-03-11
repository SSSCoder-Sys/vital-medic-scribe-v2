from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import voice_routes, protocol_routes, log_routes

app = FastAPI(title="V.I.T.A.L. Backend")

# Allow CORS for frontend (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(voice_routes.router, prefix="/voice")
app.include_router(protocol_routes.router, prefix="/protocol")
app.include_router(log_routes.router, prefix="/logs")

@app.get("/")
def root():
    return {"message": "V.I.T.A.L. Backend is running"}