#!/usr/bin/env node
/*
 Simple e2e smoke test for the email/password + phone OTP flows.
 Requires the auth server running on PORT (default 4000) and a clean test email/phone.
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const TEST_EMAIL = process.env.TEST_EMAIL || `fractal-test-${Date.now()}@example.com`;
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'A-very-strong-password-123!';
const TEST_NEW_PASSWORD = process.env.TEST_NEW_PASSWORD || 'Another-strong-password-123!';
const TEST_PHONE = process.env.TEST_PHONE || '+15551234567';

async function json(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text, status: res.status }; }
}

async function main() {
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`EMAIL: ${TEST_EMAIL}`);
  console.log(`PHONE: ${TEST_PHONE}`);

  // 1) Register
  let res = await fetch(`${BASE_URL}/auth/register/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, phone: TEST_PHONE })
  });
  let body = await json(res);
  if (!(res.status === 201 || (res.status === 409 && body?.error?.includes('already')))) {
    console.error('Register failed', res.status, body);
    process.exit(1);
  }
  console.log('Register: OK', res.status);

  // 2) Login
  res = await fetch(`${BASE_URL}/auth/login/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });
  body = await json(res);
  if (res.status !== 200 || !body?.token) {
    console.error('Login failed', res.status, body);
    process.exit(1);
  }
  const token = body.token;
  console.log('Login: OK');

  // 3) Request OTP
  res = await fetch(`${BASE_URL}/auth/password/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: TEST_PHONE })
  });
  body = await json(res);
  if (res.status !== 200 || !('demoOtp' in body || 'message' in body)) {
    console.error('Request OTP failed', res.status, body);
    process.exit(1);
  }
  const otp = body.demoOtp || process.env.TEST_OTP;
  if (!otp) {
    console.log('OTP requested; set TEST_OTP from your SMS provider to continue.');
    process.exit(0);
  }
  console.log('Request OTP: OK', otp ? '(using demoOtp)' : '');

  // 4) Reset password
  res = await fetch(`${BASE_URL}/auth/password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: TEST_PHONE, otp, newPassword: TEST_NEW_PASSWORD })
  });
  body = await json(res);
  if (res.status !== 200) {
    console.error('Reset failed', res.status, body);
    process.exit(1);
  }
  console.log('Reset password: OK');

  // 5) Login with new password
  res = await fetch(`${BASE_URL}/auth/login/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_NEW_PASSWORD })
  });
  body = await json(res);
  if (res.status !== 200 || !body?.token) {
    console.error('Login (new password) failed', res.status, body);
    process.exit(1);
  }
  console.log('Login with new password: OK');

  console.log('\nE2E auth smoke test: PASS');
}

main().catch((e) => {
  console.error('E2E smoke test crashed', e);
  process.exit(1);
});
