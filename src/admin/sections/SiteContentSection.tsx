import React, { useEffect, useState } from 'react';
import {
  AdminAnnouncementContent,
  AdminFooterContent,
  AdminHeroContent,
  AdminLogoContent,
  AdminOfferZoneContent,
  AdminSiteContent,
  fetchAdminSiteContent,
  updateAdminSiteContent,
} from '../adminClient';
import { ImageUploadButton } from '../ImageUploadButton';
import { resolveImageSrc } from '../../components/ProductArtwork';

// ---- Shared card chrome ---------------------------------------------------------

const ContentCard: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <div className="bg-white rounded-lg shadow p-5 mb-5">
    <h3 className="font-bold text-sm text-gray-900">{title}</h3>
    <p className="text-xs text-gray-500 mb-4">{description}</p>
    {children}
  </div>
);

const SaveBar: React.FC<{ saving: boolean; saved: boolean; error: string | null; onSave: () => void }> = ({
  saving,
  saved,
  error,
  onSave,
}) => (
  <div className="flex items-center gap-3 mt-4">
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded cursor-pointer disabled:opacity-50"
    >
      {saving ? 'Saving…' : 'Save'}
    </button>
    {saved && <span className="text-xs font-semibold text-emerald-600">Saved</span>}
    {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
  </div>
);

function useSectionSave<K extends keyof AdminSiteContent>(section: K, value: AdminSiteContent[K]) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateAdminSiteContent(section, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return { saving, saved, error, save };
}

const field = 'w-full text-sm border border-gray-300 rounded px-2 py-1.5';
const label = 'block text-[10px] font-bold text-gray-500 uppercase mb-1';

// ---- Logo ---------------------------------------------------------------------

const LogoCard: React.FC<{ initial: AdminLogoContent }> = ({ initial }) => {
  const [value, setValue] = useState(initial);
  const { saving, saved, error, save } = useSectionSave('logo', value);
  const preview = value.imageUrl ? resolveImageSrc(value.imageUrl) : null;

  return (
    <ContentCard title="Logo" description="Shown in the header. Leave the image empty to use the default lettermark.">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 shrink-0 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[10px] text-gray-400">Default</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <label className={label}>Brand name</label>
            <input className={field} value={value.brandName} onChange={(e) => setValue({ ...value, brandName: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <ImageUploadButton label={value.imageUrl ? 'Replace logo' : 'Upload logo'} onUploaded={(imageUrl) => setValue({ ...value, imageUrl })} />
            {value.imageUrl && (
              <button type="button" onClick={() => setValue({ ...value, imageUrl: null })} className="text-xs font-bold text-red-600 cursor-pointer">
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </ContentCard>
  );
};

// ---- Hero ---------------------------------------------------------------------

const HeroCard: React.FC<{ initial: AdminHeroContent }> = ({ initial }) => {
  const [value, setValue] = useState(initial);
  const { saving, saved, error, save } = useSectionSave('hero', value);
  const preview = value.backgroundImageUrl ? resolveImageSrc(value.backgroundImageUrl) : null;

  return (
    <ContentCard title="Hero section" description="The full-width banner at the top of the homepage.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className={label}>Headline</label>
            <input className={field} value={value.headline} onChange={(e) => setValue({ ...value, headline: e.target.value })} />
          </div>
          <div>
            <label className={label}>Badge text</label>
            <input className={field} value={value.badgeText} onChange={(e) => setValue({ ...value, badgeText: e.target.value })} />
          </div>
          <div>
            <label className={label}>Button label</label>
            <input className={field} value={value.ctaLabel} onChange={(e) => setValue({ ...value, ctaLabel: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={label}>Background image</label>
          <div className="w-full aspect-video bg-gray-100 rounded overflow-hidden mb-2 flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-gray-400">Default background</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ImageUploadButton
              label={value.backgroundImageUrl ? 'Replace image' : 'Upload image'}
              onUploaded={(backgroundImageUrl) => setValue({ ...value, backgroundImageUrl })}
            />
            {value.backgroundImageUrl && (
              <button type="button" onClick={() => setValue({ ...value, backgroundImageUrl: null })} className="text-xs font-bold text-red-600 cursor-pointer">
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </ContentCard>
  );
};

// ---- Announcement banner --------------------------------------------------------

const AnnouncementCard: React.FC<{ initial: AdminAnnouncementContent }> = ({ initial }) => {
  const [value, setValue] = useState(initial);
  const { saving, saved, error, save } = useSectionSave('announcement', value);

  return (
    <ContentCard title="Announcement banner" description="The red strip at the very top of the page. USA and EU storefronts show different text.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={label}>USA banner text</label>
          <input className={field} value={value.usaText} onChange={(e) => setValue({ ...value, usaText: e.target.value })} />
        </div>
        <div>
          <label className={label}>EU banner text</label>
          <input className={field} value={value.euText} onChange={(e) => setValue({ ...value, euText: e.target.value })} />
        </div>
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </ContentCard>
  );
};

// ---- Footer ---------------------------------------------------------------------

const FooterCard: React.FC<{ initial: AdminFooterContent }> = ({ initial }) => {
  const [value, setValue] = useState(initial);
  const { saving, saved, error, save } = useSectionSave('footer', value);

  const socialFields: { key: keyof AdminFooterContent; label: string }[] = [
    { key: 'facebookUrl', label: 'Facebook URL' },
    { key: 'twitterUrl', label: 'Twitter URL' },
    { key: 'instagramUrl', label: 'Instagram URL' },
    { key: 'linkedinUrl', label: 'LinkedIn URL' },
    { key: 'youtubeUrl', label: 'YouTube URL' },
  ];

  return (
    <ContentCard title="Footer" description="Copyright line, support email, and social links shown site-wide.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <label className={label}>Copyright text</label>
          <input className={field} value={value.copyrightText} onChange={(e) => setValue({ ...value, copyrightText: e.target.value })} />
        </div>
        <div>
          <label className={label}>Support email</label>
          <input className={field} value={value.supportEmail} onChange={(e) => setValue({ ...value, supportEmail: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {socialFields.map(({ key, label: fieldLabel }) => (
          <div key={key}>
            <label className={label}>{fieldLabel}</label>
            <input className={field} value={value[key] as string} onChange={(e) => setValue({ ...value, [key]: e.target.value })} />
          </div>
        ))}
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </ContentCard>
  );
};

// ---- Offer zone popup -------------------------------------------------------------

const OfferZoneCard: React.FC<{ initial: AdminOfferZoneContent }> = ({ initial }) => {
  const [value, setValue] = useState(initial);
  const { saving, saved, error, save } = useSectionSave('offerZone', value);

  const updateOffer = (i: number, patch: Partial<AdminOfferZoneContent['offers'][number]>) => {
    setValue((prev) => ({
      ...prev,
      offers: prev.offers.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    }));
  };

  return (
    <ContentCard title="Offer zone popup" description="The promotional popup visitors can open from the storefront.">
      <div className="mb-3">
        <label className={label}>Popup title</label>
        <input className={field} value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} />
      </div>
      <div className="space-y-3">
        {value.offers.map((offer, i) => (
          <div key={i} className="border border-gray-200 rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className={label}>Title</label>
              <input className={field} value={offer.title} onChange={(e) => updateOffer(i, { title: e.target.value })} />
            </div>
            <div>
              <label className={label}>Description</label>
              <input className={field} value={offer.description} onChange={(e) => updateOffer(i, { description: e.target.value })} />
            </div>
            <div>
              <label className={label}>Coupon code (optional)</label>
              <input
                className={field}
                value={offer.couponCode ?? ''}
                onChange={(e) => updateOffer(i, { couponCode: e.target.value || null })}
              />
            </div>
          </div>
        ))}
      </div>
      <SaveBar saving={saving} saved={saved} error={error} onSave={save} />
    </ContentCard>
  );
};

// ---- Section root ---------------------------------------------------------------

export const SiteContentSection: React.FC = () => {
  const [content, setContent] = useState<AdminSiteContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminSiteContent()
      .then(setContent)
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!content) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <h2 className="text-xl font-black text-gray-900 mb-4">Website Content</h2>
      <LogoCard initial={content.logo} />
      <HeroCard initial={content.hero} />
      <AnnouncementCard initial={content.announcement} />
      <FooterCard initial={content.footer} />
      <OfferZoneCard initial={content.offerZone} />
    </div>
  );
};
