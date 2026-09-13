from pydantic import BaseModel, Field

# Every field has a default matching the storefront's current hardcoded copy
# (see src/siteContent.ts's DEFAULT_CONTENT, which must be kept in sync) —
# a section with no row in site_content yet serializes to exactly what's on
# the page today, so publishing this feature doesn't change anything until
# an admin actually edits a section.


class LogoContent(BaseModel):
    imageUrl: str | None = None
    brandName: str = "Rapidfinil"


class HeroContent(BaseModel):
    headline: str = "3 Day Delivery"
    badgeText: str = "Buy Modafinil USA 3 Day Delivery"
    ctaLabel: str = "Why Choose Us?"
    backgroundImageUrl: str | None = None


class AnnouncementContent(BaseModel):
    usaText: str = "📢 Daily Rapid Shipping — Save Flat 25% on your first order!🎯"
    euText: str = "📣 Bitcoin 5% instant discount at checkout — Daily Rapid Shipping on every order📣"


class FooterContent(BaseModel):
    copyrightText: str = "© 2025 RapidFinil"
    supportEmail: str = "support@rapidfinil.st"
    facebookUrl: str = "https://www.facebook.com/rapidfinil/"
    twitterUrl: str = "https://twitter.com/RapidFinil_SE"
    instagramUrl: str = "https://www.instagram.com/rapidfinil_se/"
    linkedinUrl: str = "https://www.linkedin.com/in/rapidfinil/"
    youtubeUrl: str = "https://vimeo.com/user222616820"


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
                couponCode="BULK10",
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
