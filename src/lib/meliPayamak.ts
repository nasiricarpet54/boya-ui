/**
 * MeliPayamak (ملی پیامک) SMS Gateway Service
 * Supporting live console logging for development & test modes
 */

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode: 'live_api' | 'test_logged';
}

export async function sendMeliPayamakSms(phone: string, text: string): Promise<SendSmsResult> {
  const username = process.env.MELIPAYAMAK_USERNAME;
  const password = process.env.MELIPAYAMAK_PASSWORD;
  const fromNumber = process.env.MELIPAYAMAK_FROM_NUMBER || '50004000';

  // Never log recipient numbers or SMS text: messages may contain OTPs and personal data.
  console.info('[SMS] request received', { configured: Boolean(username && password) });

  if (!username || !password) {
    return {
      success: true,
      mode: 'test_logged',
    };
  }

  try {
    const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        to: phone,
        from: fromNumber,
        text,
        isFlash: false,
      }),
    });

    const data: any = await response.json();
    if (data && data.Value && Number(data.Value) > 15) {
      return {
        success: true,
        messageId: String(data.Value),
        mode: 'live_api',
      };
    } else {
      return {
        success: false,
        error: data?.RetStatus ? `کد خطا ملی پیامک: ${data.RetStatus}` : 'خطا در ارسال پیامک',
        mode: 'live_api',
      };
    }
  } catch (err: any) {
    console.error('[SMS] provider request failed', { message: err?.message || 'network error' });
    return {
      success: false,
      error: err.message || 'خطای شبکه در اتصال به پنل ملی پیامک',
      mode: 'live_api',
    };
  }
}
