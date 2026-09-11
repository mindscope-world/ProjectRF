"""Seed data for the storefront's catalog: a bulk/wholesale headwear supplier
selling bucket hats, caps, beanies, sun hats, and berets to boutiques, event
organizers, and resellers.

Category assignment: each product below carries a single category matching
one of `CATEGORIES`, and App.tsx's client-side `filterList` keyword-matches
against product name/description the same way. See workplan.md Phase 3 notes
for why category assignment happens this way rather than a dedicated join
table lookup.

Inventory: the original data only had a boolean "out of stock" badge, never
real stock counts. Products carrying that badge seed with 0 available units;
everything else seeds with a flat 250 units — a placeholder, not a real
stock take.

Pricing: every product uses the same bulk order-size ladder (10 / 30 / 60 /
90 / 180 units), matching the supplier catalog this data was modeled on —
"pricing schedule applies to every product in this catalog."
"""

CATEGORIES = [
    {"name": "Bucket Hats", "slug": "bucket-hats"},
    {"name": "Baseball Caps", "slug": "baseball-caps"},
    {"name": "Beanies", "slug": "beanies"},
    {"name": "Sun Hats", "slug": "sun-hats"},
    {"name": "Berets", "slug": "berets"},
]

_OUT_OF_STOCK_UNITS = 0
_IN_STOCK_UNITS = 250


def _stock(badges: list[dict] | None) -> int:
    if badges and any(b["variant"] == "out-of-stock" for b in badges):
        return _OUT_OF_STOCK_UNITS
    return _IN_STOCK_UNITS


# The bulk order-size ladder shared by every USA-region (USD) product.
# Prices are deliberately tiny so real crypto checkouts can be tested
# end-to-end for pocket change. The floor is $0.50, not lower, because
# BTCPay refuses to create an on-chain invoice whose BTC amount is below the
# ~546 sat dust threshold (~$0.42 at $77k/BTC) — a sub-$0.50 total makes
# every crypto checkout fail. savings_label is dropped: a "Save $730" tag
# makes no sense against a $1 price.
_USD_VARIANTS = [
    {"quantity": 10, "label": "10-Pack", "price": 0.50, "savings_label": None},
    {"quantity": 30, "label": "30-Pack", "price": 0.65, "savings_label": None},
    {"quantity": 60, "label": "60-Pack", "price": 0.80, "savings_label": None},
    {"quantity": 90, "label": "90-Pack", "price": 0.90, "savings_label": None},
    {"quantity": 180, "label": "180-Pack", "price": 1.00, "savings_label": None},
]

# Same ladder for the EU-region duplicates (same tiny values).
_EUR_VARIANTS = [
    {"quantity": 10, "label": "10-Pack", "price": 0.50, "savings_label": None},
    {"quantity": 30, "label": "30-Pack", "price": 0.65, "savings_label": None},
    {"quantity": 60, "label": "60-Pack", "price": 0.80, "savings_label": None},
    {"quantity": 90, "label": "90-Pack", "price": 0.90, "savings_label": None},
    {"quantity": 180, "label": "180-Pack", "price": 1.00, "savings_label": None},
]


PRODUCTS = [
    # ---- USA catalog (USD, ships from the US warehouse) ----
    {
        "slug": "sunset-tie-dye-bucket-hat",
        "name": "Sunset Tie-Dye Bucket Hat",
        "region": "usa",
        "category_slug": "bucket-hats",
        "is_best_seller": True,
        "has_usa_domestic_badge": True,
        "rating": 4.8,
        "rating_count": 214,
        "badges": [{"text": "Best Seller", "variant": "best-seller"}],
        "image_key": "tie-dye-bucket-hat",
        "currency": "USD",
        "description": (
            "Fluffy tie-dye faux-fur bucket hat in a rotating mix of pastel colorways. "
            "A statement pick for boutiques and festival vendors ordering in bulk."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "heritage-wool-beret",
        "name": "Heritage Wool Beret",
        "region": "usa",
        "category_slug": "berets",
        "is_best_seller": False,
        "has_usa_domestic_badge": True,
        "rating": 4.6,
        "rating_count": 88,
        "badges": [{"text": "Ships Fast", "variant": "ships-fast"}],
        "image_key": "wool-beret",
        "currency": "USD",
        "description": (
            "Classic wool beret in eight solid colorways, finished with a soft knit "
            "headband. A steady mover for resellers stocking a European-inspired lineup."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "youth-script-dad-cap",
        "name": "Youth Script Dad Cap",
        "region": "usa",
        "category_slug": "baseball-caps",
        "is_best_seller": True,
        "has_usa_domestic_badge": True,
        "rating": 4.7,
        "rating_count": 176,
        "badges": [{"text": "Best Seller", "variant": "best-seller"}],
        "image_key": "youth-dad-cap",
        "currency": "USD",
        "description": (
            "Low-profile cotton dad cap with a minimalist 'YOUTH' embroidery, available "
            "in black, pink, and white. A consistent reorder for streetwear pop-ups."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "rugged-trail-distressed-cap",
        "name": "Rugged Trail Distressed Cap",
        "region": "usa",
        "category_slug": "baseball-caps",
        "is_best_seller": False,
        "has_usa_domestic_badge": True,
        "rating": 4.4,
        "rating_count": 52,
        "badges": None,
        "image_key": "rugged-trail-cap",
        "currency": "USD",
        "description": (
            "Weathered rust-brown cap with frayed edges and bold front lettering. "
            "Built for outdoor and workwear-adjacent retailers."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "faithwalk-distressed-cap",
        "name": "Faithwalk Distressed Cap",
        "region": "usa",
        "category_slug": "baseball-caps",
        "is_best_seller": False,
        "has_usa_domestic_badge": True,
        "rating": 4.9,
        "rating_count": 133,
        "badges": [{"text": "Price Drop", "variant": "price-drop"}],
        "image_key": "faithwalk-cap",
        "currency": "USD",
        "description": (
            "Vintage-wash dad cap with a raised 'Child of God' embroidered patch and a "
            "distressed brim. A dependable seller for faith-based and lifestyle brands."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "little-bear-pom-beanie",
        "name": "Little Bear Pom Beanie",
        "region": "usa",
        "category_slug": "beanies",
        "is_best_seller": True,
        "has_usa_domestic_badge": True,
        "has_uk_domestic_badge": True,
        "rating": 4.9,
        "rating_count": 301,
        "badges": [{"text": "Best Seller", "variant": "best-seller"}],
        "image_key": "bear-pom-beanie",
        "currency": "USD",
        "description": (
            "Knit toddler beanie with two oversized pom-poms and a soft folded cuff, "
            "offered in five colorways under our signature 'mini' tag."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "blush-cow-print-bucket-hat",
        "name": "Blush Cow-Print Bucket Hat",
        "region": "usa",
        "category_slug": "bucket-hats",
        "is_best_seller": False,
        "has_usa_domestic_badge": True,
        "rating": 4.3,
        "rating_count": 41,
        "badges": [{"text": "Back in Stock", "variant": "back-in-stock"}],
        "image_key": "cow-print-bucket-hat",
        "currency": "USD",
        "description": (
            "Plush faux-fur bucket hat in a pink cow-print pattern. A playful "
            "accessory line for gift shops and novelty retailers."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "paris-nights-bucket-hat",
        "name": "Paris Nights Bucket Hat",
        "region": "usa",
        "category_slug": "bucket-hats",
        "is_best_seller": False,
        "has_usa_domestic_badge": True,
        "rating": 4.5,
        "rating_count": 67,
        "badges": None,
        "image_key": "paris-nights-bucket-hat",
        "currency": "USD",
        "description": (
            "Script-embroidered bucket hat with statement piercing-ring hardware, "
            "offered in black and white. A fashion-forward pick for boutique buyers."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "espresso-monogram-cap",
        "name": "Espresso Monogram Cap",
        "region": "usa",
        "category_slug": "baseball-caps",
        "is_best_seller": False,
        "has_usa_domestic_badge": True,
        "rating": 4.2,
        "rating_count": 29,
        "badges": [{"text": "Quality Checked", "variant": "quality-checked"}],
        "image_key": "espresso-monogram-cap",
        "currency": "USD",
        "description": (
            "Clean six-panel cap in a rich espresso brown with a simple embroidered "
            "monogram. A versatile basic for private-label programs."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "ribbon-bow-knit-beanie",
        "name": "Ribbon-Bow Knit Beanie",
        "region": "usa",
        "category_slug": "beanies",
        "is_best_seller": False,
        "has_usa_domestic_badge": True,
        "rating": 4.6,
        "rating_count": 95,
        "badges": None,
        "image_key": "ribbon-bow-beanie",
        "currency": "USD",
        "description": (
            "Fine-knit beanie with a delicate embroidered bow, offered in four neutral "
            "tones. A quiet best-seller in gifting assortments."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "corduroy-docker-cap",
        "name": "Corduroy Docker Cap",
        "region": "usa",
        "category_slug": "beanies",
        "is_best_seller": False,
        "has_usa_domestic_badge": True,
        "rating": 4.1,
        "rating_count": 18,
        "badges": [{"text": "Out of Stock", "variant": "out-of-stock"}],
        "image_key": "corduroy-docker-cap",
        "currency": "USD",
        "description": (
            "Ribbed corduroy brimless cap with an adjustable buckle strap, in four "
            "colorways. A crossover pick for streetwear and workwear buyers."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "statement-bucket-hat",
        "name": "Statement Bucket Hat",
        "region": "usa",
        "category_slug": "bucket-hats",
        "is_best_seller": False,
        "has_usa_domestic_badge": True,
        "rating": 4.4,
        "rating_count": 60,
        "badges": None,
        "image_key": "statement-bucket-hat",
        "currency": "USD",
        "description": (
            "Bold graphic bucket hat in black or white with a hand-lettered front logo. "
            "A reliable reorder for skate and streetwear shops."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "classic-bear-bucket-hat",
        "name": "Classic Bear Bucket Hat",
        "region": "usa",
        "category_slug": "bucket-hats",
        "is_best_seller": True,
        "has_usa_domestic_badge": True,
        "has_uk_domestic_badge": True,
        "rating": 4.8,
        "rating_count": 249,
        "badges": [{"text": "Best Seller", "variant": "best-seller"}],
        "image_key": "classic-bear-bucket-hat",
        "currency": "USD",
        "description": (
            "Two-tone bucket hat with a playful embroidered bear motif. One of our "
            "most reordered SKUs for kids' and lifestyle retailers."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "camo-faith-cap",
        "name": "Camo Faith Cap",
        "region": "usa",
        "category_slug": "baseball-caps",
        "is_best_seller": False,
        "has_usa_domestic_badge": True,
        "rating": 4.5,
        "rating_count": 73,
        "badges": None,
        "image_key": "camo-faith-cap",
        "currency": "USD",
        "description": (
            "Camouflage dad cap with a woven 'Walk By Faith' patch and a distressed "
            "brim. A steady seller for outdoor and lifestyle boutiques."
        ),
        "variants": _USD_VARIANTS,
    },
    {
        "slug": "expedition-wide-brim-sun-hat",
        "name": "Expedition Wide-Brim Sun Hat",
        "region": "usa",
        "category_slug": "sun-hats",
        "is_best_seller": True,
        "has_usa_domestic_badge": True,
        "has_uk_domestic_badge": True,
        "rating": 4.7,
        "rating_count": 158,
        "badges": [{"text": "Best Seller", "variant": "best-seller"}],
        "image_key": "wide-brim-expedition-hat",
        "currency": "USD",
        "description": (
            "Wide-brim outdoor hat with an adjustable chin cord and embroidered front "
            "lettering. Built for travel, hiking, and outfitter retailers."
        ),
        "variants": _USD_VARIANTS,
    },
    # ---- EU catalog (EUR, ships from the EU warehouse) ----
    {
        "slug": "eu-classic-bear-bucket-hat",
        "name": "Classic Bear Bucket Hat",
        "region": "eu",
        "category_slug": "bucket-hats",
        "is_best_seller": True,
        "has_usa_domestic_badge": False,
        "rating": 4.8,
        "rating_count": 121,
        "badges": [{"text": "EU Warehouse", "variant": "eu-delivery"}],
        "image_key": "classic-bear-bucket-hat",
        "currency": "EUR",
        "description": (
            "Two-tone bucket hat with a playful embroidered bear motif. Dispatched from "
            "our EU warehouse with domestic courier tracking."
        ),
        "variants": _EUR_VARIANTS,
    },
    {
        "slug": "eu-expedition-wide-brim-sun-hat",
        "name": "Expedition Wide-Brim Sun Hat",
        "region": "eu",
        "category_slug": "sun-hats",
        "is_best_seller": True,
        "has_usa_domestic_badge": False,
        "rating": 4.7,
        "rating_count": 84,
        "badges": [{"text": "EU Warehouse", "variant": "eu-delivery"}],
        "image_key": "wide-brim-expedition-hat",
        "currency": "EUR",
        "description": (
            "Wide-brim outdoor hat with an adjustable chin cord and embroidered front "
            "lettering. Dispatched from our EU warehouse with domestic courier tracking."
        ),
        "variants": _EUR_VARIANTS,
    },
    {
        "slug": "eu-youth-script-dad-cap",
        "name": "Youth Script Dad Cap",
        "region": "eu",
        "category_slug": "baseball-caps",
        "is_best_seller": True,
        "has_usa_domestic_badge": False,
        "rating": 4.6,
        "rating_count": 59,
        "badges": [{"text": "EU Warehouse", "variant": "eu-delivery"}],
        "image_key": "youth-dad-cap",
        "currency": "EUR",
        "description": (
            "Low-profile cotton dad cap with a minimalist 'YOUTH' embroidery, available "
            "in black, pink, and white. Dispatched from our EU warehouse."
        ),
        "variants": _EUR_VARIANTS,
    },
    {
        "slug": "eu-little-bear-pom-beanie",
        "name": "Little Bear Pom Beanie",
        "region": "eu",
        "category_slug": "beanies",
        "is_best_seller": True,
        "has_usa_domestic_badge": False,
        "rating": 4.9,
        "rating_count": 142,
        "badges": [{"text": "EU Warehouse", "variant": "eu-delivery"}],
        "image_key": "bear-pom-beanie",
        "currency": "EUR",
        "description": (
            "Knit toddler beanie with two oversized pom-poms and a soft folded cuff, "
            "offered in five colorways. Dispatched from our EU warehouse."
        ),
        "variants": _EUR_VARIANTS,
    },
    {
        "slug": "eu-heritage-wool-beret",
        "name": "Heritage Wool Beret",
        "region": "eu",
        "category_slug": "berets",
        "is_best_seller": False,
        "has_usa_domestic_badge": False,
        "rating": 4.5,
        "rating_count": 37,
        "badges": [{"text": "EU Warehouse", "variant": "eu-delivery"}],
        "image_key": "wool-beret",
        "currency": "EUR",
        "description": (
            "Classic wool beret in eight solid colorways, finished with a soft knit "
            "headband. Dispatched from our EU warehouse with domestic courier tracking."
        ),
        "variants": _EUR_VARIANTS,
    },
    {
        "slug": "eu-sunset-tie-dye-bucket-hat",
        "name": "Sunset Tie-Dye Bucket Hat",
        "region": "eu",
        "category_slug": "bucket-hats",
        "is_best_seller": False,
        "has_usa_domestic_badge": False,
        "rating": 4.7,
        "rating_count": 63,
        "badges": [{"text": "EU Warehouse", "variant": "eu-delivery"}],
        "image_key": "tie-dye-bucket-hat",
        "currency": "EUR",
        "description": (
            "Fluffy tie-dye faux-fur bucket hat in a rotating mix of pastel colorways. "
            "Dispatched from our EU warehouse with domestic courier tracking."
        ),
        "variants": _EUR_VARIANTS,
    },
]
