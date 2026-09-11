import pytest

from app.core.config import get_settings

# site_content rows are global singletons (one per key, no random-slug
# isolation like products/categories get) in a real, persistent Postgres
# database shared across test runs — so tests here must not assert on
# "pristine default" state (another test, or a real admin edit, may have
# already changed it) and must revert whatever they change.


def _admin_headers() -> dict[str, str]:
    key = get_settings().admin_api_key
    assert key, "ADMIN_API_KEY must be set to run admin tests (see backend/README.md)"
    return {"X-Admin-Token": key}


@pytest.mark.asyncio
async def test_public_site_content_has_every_section(client) -> None:
    resp = await client.get("/api/v1/site-content")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert set(body.keys()) == {"logo", "hero", "announcement", "footer", "offerZone"}
    assert isinstance(body["hero"]["headline"], str) and body["hero"]["headline"]
    assert isinstance(body["offerZone"]["offers"], list) and len(body["offerZone"]["offers"]) >= 1


@pytest.mark.asyncio
async def test_admin_site_content_requires_auth(client) -> None:
    resp = await client.put("/api/v1/admin/site-content/hero", json={"headline": "Nope"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_admin_can_edit_hero_content_and_it_is_publicly_visible(client) -> None:
    before = (await client.get("/api/v1/site-content")).json()["hero"]
    try:
        updated = await client.put(
            "/api/v1/admin/site-content/hero",
            headers=_admin_headers(),
            json={
                "headline": "Free Shipping Today",
                "badgeText": "Custom Badge",
                "ctaLabel": "Shop Now",
                "backgroundImageUrl": "/uploads/products/hero.jpg",
            },
        )
        assert updated.status_code == 200, updated.text
        assert updated.json()["headline"] == "Free Shipping Today"

        # The public endpoint picks up the edit immediately.
        public = await client.get("/api/v1/site-content")
        assert public.json()["hero"]["headline"] == "Free Shipping Today"
        assert public.json()["hero"]["backgroundImageUrl"] == "/uploads/products/hero.jpg"

        # A full re-edit replaces the section wholesale (no partial-merge
        # leftovers) — dropping backgroundImageUrl here should clear it.
        replaced = await client.put(
            "/api/v1/admin/site-content/hero",
            headers=_admin_headers(),
            json={"headline": "Another Headline", "badgeText": "B", "ctaLabel": "C"},
        )
        assert replaced.status_code == 200, replaced.text
        assert replaced.json()["backgroundImageUrl"] is None

        logs = await client.get(
            "/api/v1/admin/audit-logs", headers=_admin_headers(), params={"entityType": "site_content"}
        )
        assert any(row["entityId"] == "hero" and row["action"] == "content.update" for row in logs.json()["items"])
    finally:
        await client.put("/api/v1/admin/site-content/hero", headers=_admin_headers(), json=before)


@pytest.mark.asyncio
async def test_admin_can_edit_footer_and_offer_zone(client) -> None:
    before_footer = (await client.get("/api/v1/site-content")).json()["footer"]
    before_offer_zone = (await client.get("/api/v1/site-content")).json()["offerZone"]
    try:
        footer = await client.put(
            "/api/v1/admin/site-content/footer",
            headers=_admin_headers(),
            json={
                "copyrightText": "© 2026 Test Co",
                "supportEmail": "help@example.com",
                "facebookUrl": "https://facebook.com/testco",
                "twitterUrl": "https://twitter.com/testco",
                "instagramUrl": "https://instagram.com/testco",
                "linkedinUrl": "https://linkedin.com/testco",
                "youtubeUrl": "https://youtube.com/testco",
            },
        )
        assert footer.status_code == 200, footer.text
        assert footer.json()["copyrightText"] == "© 2026 Test Co"

        offer_zone = await client.put(
            "/api/v1/admin/site-content/offerZone",
            headers=_admin_headers(),
            json={
                "title": "Big Sale",
                "offers": [
                    {"title": "A", "description": "a desc"},
                    {"title": "B", "description": "b desc", "couponCode": "SAVE10"},
                ],
            },
        )
        assert offer_zone.status_code == 200, offer_zone.text
        assert len(offer_zone.json()["offers"]) == 2
        assert offer_zone.json()["offers"][1]["couponCode"] == "SAVE10"
    finally:
        await client.put("/api/v1/admin/site-content/footer", headers=_admin_headers(), json=before_footer)
        await client.put("/api/v1/admin/site-content/offerZone", headers=_admin_headers(), json=before_offer_zone)
