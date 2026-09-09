"""Idempotent catalog seeder: migrates app/seed/data.py into Postgres.

Run with:

    docker compose exec api python -m app.seed.seed_catalog

Safe to re-run: categories and products are skipped (not updated) if a row
with the same slug already exists. This is a one-shot data migration for
Phase 3, not a general-purpose upsert/sync tool.
"""

import asyncio

from sqlalchemy import select

from app.core.database import async_session_factory, engine
from app.models.catalog import Category, Inventory, Product, ProductImage, ProductVariant
from app.seed.data import CATEGORIES, PRODUCTS, _stock


async def seed_categories(session) -> dict[str, Category]:
    result = await session.execute(select(Category))
    by_slug = {c.slug: c for c in result.scalars().all()}

    for cat in CATEGORIES:
        if cat["slug"] in by_slug:
            continue
        category = Category(name=cat["name"], slug=cat["slug"])
        session.add(category)
        by_slug[cat["slug"]] = category

    await session.flush()
    return by_slug


async def seed_products(session, categories: dict[str, Category]) -> tuple[int, int]:
    result = await session.execute(select(Product.slug))
    existing_slugs = set(result.scalars().all())

    created = 0
    skipped = 0

    for item in PRODUCTS:
        if item["slug"] in existing_slugs:
            skipped += 1
            continue

        product = Product(
            category_id=categories[item["category_slug"]].id,
            name=item["name"],
            slug=item["slug"],
            description=item.get("description"),
            region=item["region"],
            is_best_seller=item.get("is_best_seller", False),
            has_usa_domestic_badge=item.get("has_usa_domestic_badge", False),
            has_uk_domestic_badge=item.get("has_uk_domestic_badge", False),
            rating=item.get("rating", 0),
            rating_count=item.get("rating_count"),
            badges=item.get("badges"),
        )
        session.add(product)
        await session.flush()

        session.add(
            ProductImage(
                product_id=product.id,
                storage_key=item["image_key"],
                is_primary=True,
            )
        )

        stock = _stock(item.get("badges"))
        for variant in item["variants"]:
            pv = ProductVariant(
                product_id=product.id,
                sku=f"{item['slug'].upper()}-{variant['quantity']}",
                quantity=variant["quantity"],
                label=variant["label"],
                price=variant["price"],
                currency=item["currency"],
                savings_label=variant.get("savings_label"),
            )
            session.add(pv)
            await session.flush()
            session.add(Inventory(variant_id=pv.id, quantity_available=stock))

        created += 1

    return created, skipped


async def run() -> None:
    async with async_session_factory() as session:
        categories = await seed_categories(session)
        created, skipped = await seed_products(session, categories)
        await session.commit()

    print(f"Seed complete: {created} product(s) created, {skipped} already present (skipped).")


async def main() -> None:
    try:
        await run()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
