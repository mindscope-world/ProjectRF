import React, { useState } from 'react';

export const EuFooter: React.FC<{ onNavSelect?: (nav: string) => void }> = ({
  onNavSelect,
}) => {
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);

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
          body: 'For fast EU support, please contact our European fulfillment desk at support@brimline-eu.example. Our support desk operates 24/7 with average response times under 8 hours.',
        });
        break;
      case 'Community Give-Back':
        setModalContent({
          title: 'Community Give-Back Program',
          body: 'Brimline Europe donates a portion of every bulk order to local youth sports leagues, helping supply teams with practice gear and uniforms.',
        });
        break;
      case 'Facebook':
      case 'Twitter':
        setModalContent({
          title: `${name} Community`,
          body: `Join our active ${name} discussions for restock alerts, bulk-order tips, and EU shipping schedule updates.`,
        });
        break;
      case 'FAQs':
        setModalContent({
          title: 'Frequently Asked Questions',
          body: '• EU Shipping: Dispatched from our EU warehouse (Spain/Netherlands).\n• Delivery Time: 2 to 4 business days with full courier tracking.\n• SEPA Transfers: 0% fee IBAN payments supported across all Eurozone banks.\n• Bitcoin Discount: 5% automatic discount at checkout.',
        });
        break;
      case 'Reviews.io':
      case 'Smartcustomer.com':
        setModalContent({
          title: `Verified Reviews on ${name}`,
          body: `Brimline Europe holds an average rating of 4.9/5 stars on ${name} with thousands of verified EU delivery testimonials.`,
        });
        break;
      default:
        break;
    }
  };

  return (
    <footer className="w-full bg-[#222222] text-white pt-12 pb-6 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top 4 Columns (Matching Image 4) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-[#333333]">
          {/* Column 1: Help & Contact */}
          <div>
            <h4 className="text-base font-bold text-white mb-4">
              Help &amp; Contact
            </h4>
            <ul className="space-y-2 text-sm text-[#b0b0b0]">
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('Contact Us')}
                  className="hover:text-[#fed000] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-[#888888]">&gt;</span>
                  <span>Contact Us</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('Community Give-Back')}
                  className="hover:text-[#fed000] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-[#888888]">&gt;</span>
                  <span>Community Give-Back</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Social Media */}
          <div>
            <h4 className="text-base font-bold text-white mb-4">
              Social Media
            </h4>
            <ul className="space-y-2 text-sm text-[#b0b0b0]">
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('Facebook')}
                  className="hover:text-[#fed000] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-[#888888]">&gt;</span>
                  <span>Facebook</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('Twitter')}
                  className="hover:text-[#fed000] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-[#888888]">&gt;</span>
                  <span>Twitter</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Policy */}
          <div>
            <h4 className="text-base font-bold text-white mb-4">
              Policy
            </h4>
            <ul className="space-y-2 text-sm text-[#b0b0b0]">
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('FAQs')}
                  className="hover:text-[#fed000] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-[#888888]">&gt;</span>
                  <span>FAQs</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Read Reviews */}
          <div>
            <h4 className="text-base font-bold text-white mb-4">
              Read Reviews
            </h4>
            <ul className="space-y-2 text-sm text-[#b0b0b0]">
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('Reviews.io')}
                  className="hover:text-[#fed000] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-[#888888]">&gt;</span>
                  <span>Reviews.io</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('Smartcustomer.com')}
                  className="hover:text-[#fed000] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-[#888888]">&gt;</span>
                  <span>Smartcustomer.com</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Payment Icons + Scroll to top */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Copyright */}
          <div className="text-sm text-[#8e8e8e]">
            &copy; 2025 Brimline Europe
          </div>

          {/* Right: Payment Icons + Scroll-To-Top Button */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {/* SEPA Badge */}
            <div
              className="flex items-center justify-center bg-[#003399] text-white font-black text-[11px] rounded-[5px] px-2.5 h-[34px] shadow-sm select-none border border-blue-400/30"
              title="SEPA Instant Transfer"
            >
              {'<'}
            <span className="text-gray-500 font-mono text-sm group-hover:text-gray-300 transition-colors">
                      {'>'}
                    </span>
              <span className="text-amber-300 mr-0.5">★</span> S€PA
            </div>

            {/* Bitcoin Badge */}
            <div
              className="flex items-center justify-center w-[34px] h-[34px] rounded-full bg-gradient-to-b from-[#f7931a] to-[#d3770e] text-white font-black text-[15px] shadow-sm border border-amber-300/40 select-none"
              title="Bitcoin 5% off"
            >
              {'<'}
              ₿
            </div>

            {/* Credit Cards Stack */}
            <div
              className="flex items-center justify-center bg-[#1f2327] rounded-[5px] px-2 h-[34px] border border-gray-700 shadow-sm select-none gap-0.5"
              title="Credit & Debit Cards"
            >
              {'<'}
            <span className="text-gray-500 font-mono text-sm group-hover:text-gray-300 transition-colors">
                      {'>'}
                    </span>
              <div className="w-4 h-2.5 bg-amber-400 rounded-xs shadow-2xs"></div>
              <div className="w-4 h-2.5 bg-red-500 rounded-xs -ml-1.5 opacity-90 shadow-2xs"></div>
            </div>

            {/* Scroll To Top Button: White circle with green arrow */}
            <button
              id="eu-scroll-to-top-button"
              type="button"
              onClick={scrollToTop}
              className="w-[36px] h-[36px] rounded-full bg-white hover:bg-gray-100 transition-colors flex items-center justify-center shadow-md cursor-pointer border border-gray-200 ml-2 group"
              aria-label="Scroll back to top"
            >
              {'<'}
              <span className="text-gray-500 font-mono text-sm group-hover:text-gray-300 transition-colors">
                      {'>'}
                    </span>
              <span className="text-[#15803d] font-black text-[18px] leading-none group-hover:-translate-y-0.5 transition-transform">
                &uarr;
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#2a2a2a] text-white rounded-xl max-w-md w-full p-6 border border-gray-700 shadow-2xl relative">
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
