import DOMPurify from 'dompurify';

/**
 * Sanitizes an HTML string using DOMPurify to prevent XSS attacks.
 * @param dirty HTML string to sanitize
 * @returns Clean HTML string safe for innerHTML rendering
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['target', 'rel', 'class'],
    USE_PROFILES: { html: true }
  });
}
