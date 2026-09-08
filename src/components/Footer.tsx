import React, { useState } from 'react';

interface FooterProps {
  onCategoryClick?: (cat: string) => void;
}

export const Footer: React.FC<FooterProps> = () => {
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleLinkClick = (name: string) => {
    switch (name) {
      case 'Contact Us':
        setModalContent({
          title: 'Contact Us',
          body: 'For fast assistance, please email our support team directly at support@rapidfinil.is. Our support desk operates 24/7 with average response times under 8 hours.',
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
          body: 'We guarantee 100% successful delivery. If any package is delayed or damaged during domestic transit, we provide an immediate free reshipment or full refund. No questions asked.',
        });
        break;
      case '100% Purchase Protection':
        setModalContent({
          title: '100% Purchase Protection',
          body: 'All purchases are shielded by our 100% domestic delivery guarantee, discreet plain packaging, and encrypted checkout security.',
        });
        break;
      case 'Donate to Gaza':
        setModalContent({
          title: 'Donate to Gaza Emergency Relief',
          body: 'RapidFinil proudly supports humanitarian emergency aid organizations providing clean water, food, and urgent medical supplies to families in Gaza.',
        });
        break;
      case 'Security':
        setModalContent({
          title: 'Security & Privacy',
          body: 'We never store sensitive payment information or credit card numbers. Customer records are permanently scrubbed post-dispatch to preserve complete customer confidentiality.',
        });
        break;
      case 'FAQs':
        setModalContent({
          title: 'Frequently Asked Questions',
          body: '• Delivery Time: 3 business days via domestic carrier.\n• Packaging: 100% plain discreet padded envelopes.\n• Bitcoin Discount: Automatic 5% discount applied at checkout.\n• Off-Site Menu: For specialized quantities, email us directly.',
        });
        break;
      case 'Become an Affiliate':
        setModalContent({
          title: 'Affiliate Partnership Program',
          body: 'Join the RapidFinil affiliate program to earn competitive commissions on every referred customer. Contact affiliates@rapidfinil.is to apply.',
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
              Help &amp; Contact
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
                'Donate to Gaza',
              ].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => handleLinkClick(item)}
                    className="flex items-center gap-3 text-[#cccccc] hover:text-white transition-colors cursor-pointer text-left group"
                  >
                    <span className="text-gray-500 font-mono text-sm group-hover:text-gray-300 transition-colors">
                      &gt;
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
            {/* Yellow Accent Bar + Dark Gray Line */}
            <div className="flex items-center w-full mb-5">
              <span className="w-10 h-[2px] bg-[#fed000] shrink-0"></span>
              <span className="w-full h-[1px] bg-[#3a3a3a]"></span>
            </div>
            <ul className="space-y-3.5 text-[14px]">
              {['Facebook', 'Twitter', 'Instagram', 'Linkedin', 'Youtube'].map((item) => (
                <li key={item}>
                  <a
                    href={`https://${item.toLowerCase()}.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-[#cccccc] hover:text-white transition-colors cursor-pointer text-left group"
                  >
                    <span className="text-gray-500 font-mono text-sm group-hover:text-gray-300 transition-colors">
                      &gt;
                    </span>
                    <span>{item}</span>
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
                      &gt;
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
                      &gt;
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
            &copy; 2025 RapidFinil
          </div>

          {/* Right: Payment Icons + Scroll to Top Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center">
            {/* Cash App Badge */}
            <div
              className="flex flex-col items-center justify-center bg-[#00D632] text-white rounded-[5px] px-2 py-0.5 h-[34px] min-w-[54px] shadow-sm select-none"
              title="Cash App"
            >
              <span className="text-[15px] font-black leading-none">$</span>
              <span className="text-[7.5px] font-bold tracking-tighter leading-none mt-0.5">
                Cash App
              </span>
            </div>

            {/* Zelle Badge */}
            <div
              className="flex items-center justify-center bg-[#7414CA] text-white font-bold text-[12px] rounded-[5px] px-2.5 h-[34px] shadow-sm tracking-tight select-none"
              title="Zelle"
            >
              zelle
            </div>

            {/* Venmo Badge */}
            <div
              className="flex items-center justify-center bg-[#008CFF] text-white font-black italic text-[13px] rounded-[5px] px-2.5 h-[34px] shadow-sm tracking-tight select-none"
              title="Venmo"
            >
              venmo
            </div>

            {/* PayPal Badge */}
            <div
              className="flex items-center justify-center bg-white rounded-[5px] px-2.5 h-[34px] border border-gray-200 shadow-sm select-none"
              title="PayPal"
            >
              <span className="text-[#003087] font-black italic text-[12px]">Pay</span>
              <span className="text-[#0079C1] font-black italic text-[12px]">Pal</span>
            </div>

            {/* Bitcoin Badge */}
            <div
              className="flex items-center justify-center w-[34px] h-[34px] rounded-full bg-gradient-to-b from-[#f7931a] to-[#d3770e] text-white font-black text-[15px] shadow-sm border border-amber-300/40 select-none"
              title="Bitcoin"
            >
              ₿
            </div>

            {/* Cards Stack Badge */}
            <div
              className="flex items-center justify-center bg-[#1f2327] rounded-[5px] px-2 h-[34px] border border-gray-700 shadow-sm select-none gap-0.5"
              title="Credit & Debit Cards"
            >
              <div className="w-4 h-2.5 bg-amber-400 rounded-xs shadow-2xs"></div>
              <div className="w-4 h-2.5 bg-red-500 rounded-xs -ml-1.5 opacity-90 shadow-2xs"></div>
            </div>

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
