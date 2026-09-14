import React, { useState } from 'react';
import { useSiteContent } from '../SiteContentContext';
import footerPaymentIcons from '../assets/images/banners/footer-payment-icons.png';

interface FooterProps {
  onCategoryClick?: (cat: string) => void;
  onNavSelect?: (nav: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavSelect }) => {
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);
  const { footer } = useSiteContent();

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleLinkClick = (name: string) => {
    // If onNavSelect is provided and this is Contact Us, use it for navigation
    if (name === 'Contact Us' && onNavSelect) {
      onNavSelect('Contact Us');
      return;
    }

    // Otherwise, show modal as before
    switch (name) {
      case 'Contact Us':
        setModalContent({
          title: 'Contact Us',
          body: `For fast assistance, please email our support team directly at ${footer.supportEmail}. Our support desk operates 24/7 with average response times under 8 hours.`,
        });
        break;
      case 'Your Account':
        setModalContent({
          title: 'Your Account',
          body: 'Order history, tracking numbers, and account details are sent directly to the email provided during checkout. If you need a copy of your recent tracking details, please contact support.',
        });
        break;
      case 'Returns Centre':
      case 'Return Policy':
        setModalContent({
          title: 'Return & Reship Policy',
          body: 'If any package is delayed or arrives damaged during transit, we provide a free reshipment or a full refund — just reach out with your order number.',
        });
        break;
      case '100% Purchase Protection':
        setModalContent({
          title: '100% Purchase Protection',
          body: 'All purchases are protected by our on-time delivery guarantee, secure padded packaging, and encrypted checkout security.',
        });
        break;
      case 'Community Give-Back':
        setModalContent({
          title: 'Community Give-Back Program',
          body: 'Rapidfinil donates a portion of every bulk order to community health initiatives.',
        });
        break;
      case 'Security':
        setModalContent({
          title: 'Security & Privacy',
          body: 'We never store sensitive payment information or credit card numbers. Your order details are kept confidential and used only to fulfill and support your purchase.',
        });
        break;
      case 'FAQs':
        setModalContent({
          title: 'Frequently Asked Questions',
          body: '• Delivery Time: 3 business days via domestic carrier.\n• Packaging: Secure padded mailers on every order.\n• Bitcoin Discount: Automatic 5% discount applied at checkout.\n• Bulk Quotes: For custom quantities, email us directly.',
        });
        break;
      case 'Become an Affiliate':
        setModalContent({
          title: 'Affiliate Partnership Program',
          body: 'Join the Rapidfinil affiliate program to earn competitive commissions on every referred customer. Contact affiliates@rapidfinil.st to apply.',
        });
        break;
      default:
        break;
    }
  };

  return (
    <footer className="w-full bg-[#1e1e1e] text-gray-300 pt-16 pb-12 select-none">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Four-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-16">
          {/* Column 1: Help & Contact */}
          <div>
            <h3 className="text-white text-[16px] font-semibold tracking-normal mb-2">
              Help & Contact
            </h3>
            {/* Yellow Accent Bar + Dark Gray Line */}
            <div className="flex items-center w-full mb-5">
              <span className="w-10 h-[2px] bg-[#fed000] shrink-0"></span>
              <span className="w-full h-[1px] bg-[#3a3a3a]"></span>
            </div>
            <ul className="space-y-3.5 text-[14px]">
              {[
                'Contact Us',
                'Your Account',
                'Returns Centre',
                '100% Purchase Protection',
                'Community Give-Back',
              ].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => handleLinkClick(item)}
                    className="flex items-center gap-3 text-[#cccccc] hover:text-white transition-colors cursor-pointer text-left group"
                  >
                    <span className="text-gray-500 font-mono text-sm group-hover:text-gray-300 transition-colors">
                      {'>'}
                    </span>
                    <span>{item}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Social Media */}
          <div>
            <h3 className="text-white text-[16px] font-semibold tracking-normal mb-2">
              Social Media
            </h3>
            {/* Yellow Accent Bar Accent + Dark Gray Line */}
            <div className="flex items-center w-full mb-5">
              <span className="w-10 h-[2px] bg-[#fed000] shrink-0"></span>
              <span className="w-full h-[1px] bg-[#3a3a3a]"></span>
            </div>
            <ul className="space-y-3.5 text-[14px]">
              {[
                { label: 'Facebook', href: footer.facebookUrl },
                { label: 'Twitter', href: footer.twitterUrl },
                { label: 'Instagram', href: footer.instagramUrl },
                { label: 'Linkedin', href: footer.linkedinUrl },
                { label: 'Youtube', href: footer.youtubeUrl },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-[#cccccc] hover:text-white transition-colors cursor-pointer text-left group"
                  >
                    <span className="text-gray-500 font-mono text-sm group-hover:text-gray-300 transition-colors">
                      {'>'}
                    </span>
                    <span>{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Policy */}
          <div>
            <h3 className="text-white text-[16px] font-semibold tracking-normal mb-2">
              Policy
            </h3>
            {/* Yellow Accent Bar + Dark Gray Line */}
            <div className="flex items-center w-full mb-5">
              <span className="w-10 h-[2px] bg-[#fed000] shrink-0"></span>
              <span className="w-full h-[1px] bg-[#3a3a3a]"></span>
            </div>
            <ul className="space-y-3.5 text-[14px]">
              {['Return Policy', 'Security', 'FAQs'].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => handleLinkClick(item)}
                    className="flex items-center gap-3 text-[#cccccc] hover:text-white transition-colors cursor-pointer text-left group"
                  >
                    <span className="text-gray-500 font-mono text-sm group-hover:text-gray-300 transition-colors">
                      {'>'}
                    </span>
                    <span>{item}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Work With Us */}
          <div>
            <h3 className="text-white text-[16px] font-semibold tracking-normal mb-2">
              Work With Us
            </h3>
            {/* Yellow Accent Bar + Dark Gray Line */}
            <div className="flex items-center w-full mb-5">
              <span className="w-10 h-[2px] bg-[#fed000] shrink-0"></span>
              <span className="w-full h-[1px] bg-[#3a3a3a]"></span>
            </div>
            <ul className="space-y-3.5 text-[14px]">
              {['Become an Affiliate'].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => handleLinkClick(item)}
                    className="flex items-center gap-3 text-[#cccccc] hover:text-white transition-colors cursor-pointer text-left group"
                  >
                    <span className="text-gray-500 font-mono text-sm group-hover:text-gray-300 transition-colors">
                      {'>'}
                    </span>
                    <span>{item}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sub-Footer Divider Line */}
        <div className="border-t border-[#2e2e2e] pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Copyright */}
          <div className="text-[14px] text-[#8e8e8e] font-normal">
            {footer.copyrightText}
          </div>

          {/* Right: Payment Icons + Scroll to Top Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center">
            <img
              src={footerPaymentIcons}
              alt="Accepted payment methods: Cash App, Zelle, Venmo, PayPal, Bitcoin, Credit Card"
              className="h-[34px] w-auto object-contain"
            />

            {/* Scroll To Top Button: White circle with green arrow */}
            <button
              id="scroll-to-top-button"
              type="button"
              onClick={scrollToTop}
              className="w-[36px] h-[36px] rounded-full bg-white hover:bg-gray-100 transition-colors flex items-center justify-center shadow-md cursor-pointer border border-gray-200 ml-3 sm:ml-4 group"
              aria-label="Scroll back to top"
            >
              <span className="text-[#15803d] font-black text-[18px] leading-none group-hover:-translate-y-0.5 transition-transform">
                &uarr;
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Modal for Footer Links */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#242424] text-white rounded-lg max-w-md w-full p-6 border border-gray-700 shadow-2xl relative">
            <h4 className="text-lg font-bold text-[#fed000] mb-3">{modalContent.title}</h4>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line mb-5">
              {modalContent.body}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModalContent(null)}
                className="bg-[#fed000] hover:bg-[#ffc800] text-gray-950 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};