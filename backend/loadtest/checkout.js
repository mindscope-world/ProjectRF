// Phase 11 load test: browse -> add to cart -> checkout, repeated per
// virtual user with its own session id (guest checkout, no auth — see
// backend/README.md on Phase 2 auth never being built).
//
// Run with k6 (https://k6.io — single static binary, nothing to install
// beyond it):
//
//   BASE_URL=http://localhost:8000/api/v1 k6 run backend/loadtest/checkout.js
//
// Tune load with k6's own flags rather than editing this file for one-off
// runs, e.g.:
//
//   k6 run --vus 50 --duration 2m backend/loadtest/checkout.js
//
// The default `options` below is a smoke-test-sized ramp — enough to prove
// the script and the API work together, not a real capacity test. Raise
// vus/duration for that (see backend/README.md's Phase 11 section for
// suggested capacity-test profiles).

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000/api/v1';

const checkoutFailures = new Counter('checkout_failures');

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 5 },
        { duration: '30s', target: 5 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    checkout_failures: ['count<1'],
  },
};

function sessionId() {
  return `loadtest-${__VU}-${__ITER}-${Date.now()}`;
}

function jsonHeaders(sid) {
  return { headers: { 'Content-Type': 'application/json', 'X-Session-Id': sid } };
}

export default function () {
  const sid = sessionId();

  // 1. Browse the catalog, like a real customer landing on the storefront.
  const productsRes = http.get(`${BASE_URL}/products?region=usa`, jsonHeaders(sid));
  check(productsRes, { 'products: 200': (r) => r.status === 200 });

  const products = productsRes.json();
  if (!Array.isArray(products) || products.length === 0) {
    checkoutFailures.add(1);
    return;
  }
  const product = products[Math.floor(Math.random() * products.length)];
  const variant = product.options[0];

  sleep(0.5); // a human pauses before adding to cart

  // 2. Add to cart.
  const cartRes = http.post(
    `${BASE_URL}/cart/items`,
    JSON.stringify({ variantId: variant.variantId, quantity: 1 }),
    jsonHeaders(sid)
  );
  check(cartRes, { 'add to cart: 201': (r) => r.status === 201 });

  sleep(0.5);

  // 3. Checkout.
  const orderRes = http.post(
    `${BASE_URL}/checkout/create-order`,
    JSON.stringify({
      email: `loadtest-${__VU}-${__ITER}@example.com`,
      shippingAddress: {
        firstName: 'Load',
        lastName: 'Test',
        addressLine1: '123 Test St',
        city: 'Testville',
        postalCode: '00000',
        countryCode: 'US',
      },
      paymentMethod: 'card_link',
    }),
    { ...jsonHeaders(sid), headers: { ...jsonHeaders(sid).headers, 'Idempotency-Key': sid } }
  );
  const orderOk = check(orderRes, { 'checkout: 201': (r) => r.status === 201 });
  if (!orderOk) {
    checkoutFailures.add(1);
  }

  sleep(1);
}
