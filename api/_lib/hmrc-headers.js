/**
 * HMRC Fraud Prevention Headers generator.
 *
 * HMRC requires these headers on EVERY MTD API request. This utility
 * builds them from the client-supplied context (browser info, timezone,
 * window size) and server-side constants.
 *
 * Spec: https://developer.service.hmrc.gov.uk/api-documentation/docs/fraud-prevention
 */

const VENDOR_VERSION = 'InvoiceSaga=1.0.0';
const VENDOR_PRODUCT = 'InvoiceSaga';
const CONNECTION_METHOD = 'WEB_APP_VIA_SERVER';

/**
 * Build the Gov-* fraud prevention headers object.
 *
 * @param {{ userAgent?: string, timezone?: string, windowSize?: string, ip?: string }} ctx
 * @returns {Record<string, string>}
 */
export function buildFraudPreventionHeaders(ctx = {}) {
  return {
    'Gov-Client-Connection-Method': CONNECTION_METHOD,
    'Gov-Client-Browser-JS-User-Agent': ctx.userAgent || '',
    'Gov-Client-Browser-Plugins': '',
    'Gov-Client-Timezone': ctx.timezone || 'UTC+00:00',
    'Gov-Client-Window-Size': ctx.windowSize || '',
    'Gov-Client-Public-IP': ctx.ip || '',
    'Gov-Vendor-Version': VENDOR_VERSION,
    'Gov-Vendor-Product-Name': VENDOR_PRODUCT,
  };
}
