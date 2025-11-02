// utils/sanitize.ts

/**
 * Sanitizes a string to prevent XSS attacks by escaping HTML characters.
 * This function should be used on any user-provided input before it is rendered in the DOM.
 * @param str The input string to sanitize.
 * @returns The sanitized string.
 */
export function sanitizeInput(str: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  const reg = /[&<>"'/]/gi;
  return str.replace(reg, match => map[match]);
}
