import { NextResponse } from 'next/server';

import { issueCsrfToken } from '@/lib/auth/csrf';

export async function GET() {
  const token = await issueCsrfToken();

  return new NextResponse(
    JSON.stringify({
      token,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    },
  );
}
