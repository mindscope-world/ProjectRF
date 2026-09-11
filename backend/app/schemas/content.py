from pydantic import BaseModel, Field

# Every field has a default matching the storefront's current hardcoded copy
# (see src/siteContent.ts's DEFAULT_CONTENT, which must be kept in sync) —
# a section with no row in site_content yet serializes to exactly what's on
# the page today, so publishing this feature doesn't change anything until
# an admin actually edits a section.


class LogoContent(BaseModel):
    imageUrl: str | None = None
    brandName: str = "Brimline"


class HeroContent(BaseModel):
    headline: str = "3 Day Delivery"
    badgeText: str = "World's Best Headwear Store"
    ctaLabel: str = "Why Choose Us?"
    backgroundImageUrl: str | None = None


class AnnouncementContent(BaseModel):
    usaText: str = "📢 Restock alert: wide-brim sun hats and pom-pom beanies are back in stock🎯"
    euText: str = "📣 First order? Use code WELCOME15 for 15% off — new bucket hat colorways landing this month📣"


class FooterContent(BaseModel):
    copyrightText: str = "© 2025 Brimline"
    supportEmail: str = "support@brimline.example"
    facebookUrl: str = "https://facebook.com/brimline"
    twitterUrl: str = "https://twitter.com/brimline"
    instagramUrl: str = "https://instagram.com/brimline"
    linkedinUrl: str = "https://linkedin.com/brimline"
    youtubeUrl: str = "https://youtube.com/brimline"


class OfferZoneOffer(BaseModel):
    title: str
    description: str
    couponCode: str | None = None


class OfferZoneContent(BaseModel):
    title: str = "Exclusive Offer Zone"
    offers: list[OfferZoneOffer] = Field(
        default_factory=lambda: [
            OfferZoneOffer(
                title="Bitcoin 5% Instant Discount",
                description="Select Bitcoin at checkout to automatically save 5% off your entire cart total.",
            ),
            OfferZoneOffer(
                title="Free USA Domestic Priority Shipping",
                description="USPS domestic tracking included on all orders, with delivery in 3 business days.",
            ),
            OfferZoneOffer(
                title="Bulk Order Bonus",
                description=(
                    "Use this coupon code for orders over $300 to receive a free bonus item in your pack."
                ),
                couponCode="BRIM10",
            ),
        ]
    )


class SiteContentOut(BaseModel):
    """The full set of editable sections, always present — see the
    per-section defaults above for what an unedited storefront returns."""

    logo: LogoContent
    hero: HeroContent
    announcement: AnnouncementContent
    footer: FooterContent
    offerZone: OfferZoneContent
