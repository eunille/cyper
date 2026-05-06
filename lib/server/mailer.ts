import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER ?? '';
const SMTP_PASS = process.env.SMTP_PASS ?? '';
const SMTP_FROM = process.env.SMTP_FROM ?? `CyberTutor AI <${SMTP_USER}>`;

if (!SMTP_USER || !SMTP_PASS) {
  console.warn('[mailer] SMTP_USER or SMTP_PASS not set — email sending disabled');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS, // Gmail App Password (16-char)
  },
});

function otpEmailHtml(code: string, expiresMinutes: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your CyberTutor AI login code</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;padding:32px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;background:#ffffff;border-radius:8px;text-align:center;vertical-align:middle;padding:6px;">
                    <span style="font-size:18px;">🛡️</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.3px;">CyberTutor AI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a0a0a;letter-spacing:-0.4px;">
                Your login code
              </p>
              <p style="margin:0 0 32px;font-size:14px;color:#737373;line-height:1.6;">
                Use the code below to complete your sign-in. It expires in <strong>${expiresMinutes} minutes</strong>.
              </p>

              <!-- OTP Code box -->
              <div style="background:#f5f5f5;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
                <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#0a0a0a;font-family:'Courier New',monospace;">
                  ${code}
                </span>
              </div>

              <p style="margin:0 0 6px;font-size:13px;color:#a3a3a3;line-height:1.6;">
                If you didn't request this, you can safely ignore this email — your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #f0f0f0;padding:20px 40px;">
              <p style="margin:0;font-size:11px;color:#c4c4c4;text-align:center;">
                © 2025 CyberTutor AI · This is an automated message, please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOtpEmail(to: string, code: string, expiresMinutes = 10): Promise<void> {
  if (!SMTP_USER || !SMTP_PASS) {
    // Dev fallback — log to console instead of failing
    console.info(`[mailer:dev] OTP for ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: `${code} — your CyberTutor AI login code`,
    html: otpEmailHtml(code, expiresMinutes),
    text: `Your CyberTutor AI login code is: ${code}\n\nIt expires in ${expiresMinutes} minutes.`,
  });
}
