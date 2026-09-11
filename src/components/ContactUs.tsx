import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useSiteContent } from '../SiteContentContext';

export const ContactUs: React.FC = () => {
  const { footer } = useSiteContent();
  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] text-gray-900 font-sans selection:bg-[#fed000] selection:text-black">
      {/* Header Section matching the reference page */}
      <header className="bg-white py-12 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-bold text-gray-900">Contact us</h1>
        </div>
      </header>

      {/* Main Content Matching Reference Structure */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12">
        {/* Email Icon and Contact Info - Matching Reference */}
        <div className="flex items-start space-x-6 mb-12">
          {/* Email Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <Mail className="h-8 w-8 text-[#fed000]" />
          </div>

          {/* Contact Information */}
          <div className="flex-1">
            <p className="mb-4">
              <span className="font-semibold text-gray-900">Email:</span> <br/>
              <a href={`mailto:${footer.supportEmail}`} className="text-[#fed000] hover:underline">
                {footer.supportEmail}
              </a>
            </p>
            <p className="text-gray-600 leading-relaxed">
              Whether you're placing your first bulk order or following up on one already in progress, our support
              team is happy to help with sizing, colorway availability, and order timelines.
            </p>
          </div>
        </div>

        {/* Additional Information Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Support Information</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-700 leading-relaxed">
              For fast assistance, please email our support team directly at{' '}
              <a href={`mailto:${footer.supportEmail}`} className="text-[#fed000] hover:underline font-medium">
                {footer.supportEmail}
              </a>. Our support desk operates 24/7 with average response times under 8 hours.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="space-y-4 p-6">
              <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                <h3 className="font-semibold text-gray-900 mb-2">How long does shipping take?</h3>
                <p className="text-gray-700">
                  We offer 3 business day delivery via domestic carrier for all USA domestic orders.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                <h3 className="font-semibold text-gray-900 mb-2">What is your return policy?</h3>
                <p className="text-gray-700">
                  If any package is delayed or arrives damaged during transit, we provide a free reshipment or a
                  full refund — just reach out with your order number.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                <h3 className="font-semibold text-gray-900 mb-2">Is my information secure?</h3>
                <p className="text-gray-700">
                  All purchases are protected by encrypted checkout security. We never store sensitive payment
                  information.
                </p>
              </div>

              <div className="last:border-b-0 last:pb-0">
                <h3 className="font-semibold text-gray-900 mb-2">Do you offer discounts?</h3>
                <p className="text-gray-700">
                  Yes! We offer an automatic 5% discount at checkout when paying with Bitcoin, and bulk-order
                  pricing scales automatically as your pack size goes up.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Consistent with app design but simplified for page context */}
      <footer className="bg-[#1e1e1e] text-gray-300 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Left: Copyright */}
            <div className="text-sm text-[#8e8e8e]">
              {footer.copyrightText}
            </div>

            {/* Right: Simple Links */}
            <div className="flex space-x-4 text-sm text-[#cccccc] hover:text-white">
              <a href="#" className="hover:underline">Return Policy</a>
              <a href="#" className="hover:underline">Security</a>
              <a href="#" className="hover:underline">FAQs</a>
              <a href="#" className="hover:underline">Become an Affiliate</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};