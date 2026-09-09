import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_ready_reports_dependency_checks() -> None:
    """/ready must reach real Postgres + Redis, so it needs a live environment
    (docker compose, or CI service containers) to return 200. If those
    dependencies are unreachable it should degrade to 503 rather than crash.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ready")

    assert response.status_code in (200, 503)
    body = response.json()
    assert set(body["checks"].keys()) == {"database", "redis"}
    assert body["status"] == ("ok" if response.status_code == 200 else "unavailable")
