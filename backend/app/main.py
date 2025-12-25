from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.api.endpoints import health, companies, analysis, financial, watchlist

settings = get_settings()

app = FastAPI(
    title="株式分析API",
    description="10年長期分析＆AI予測レポート生成 API",
    version="0.1.0",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(health.router, tags=["Health"])
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(financial.router, prefix="/api/financial", tags=["Financial"])
app.include_router(watchlist.router, prefix="/api/watchlist", tags=["Watchlist"])


@app.get("/")
async def root():
    return {
        "message": "10年長期分析＆AI予測レポート生成 API",
        "docs": "/docs",
    }
