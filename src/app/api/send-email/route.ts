import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html } = body;

    console.log('\n========================================');
    console.log('📧 MOCK EMAIL NOTIFICATION');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: \n${html.replace(/<[^>]*>?/gm, '')}`); // Strip HTML for console logging
    console.log('========================================\n');

    return NextResponse.json({ success: true, message: 'Email sent (mock)' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
