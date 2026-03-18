from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import candidates, jobs, applications, interviews

app = FastAPI(title="TalentLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(applications.router, prefix="/applications", tags=["applications"])
app.include_router(interviews.router, prefix="/interviews", tags=["interviews"])


@app.get("/health")
def health():
    return {"status": "ok"}
