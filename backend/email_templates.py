import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
import html
import os
import smtplib
import ssl
from typing import Tuple

DEFAULT_SUPPORT_EMAIL = "hivetveterinary3@gmail.com"
DEFAULT_APP_PWD = os.getenv("EMAIL_APP_PWD", "dpan oejd uzvs tepw")


def build_forgot_password_email(
    first_name: str | None,
    otp_code: str,
    support_email: str = DEFAULT_SUPPORT_EMAIL,
) -> Tuple[str, str]:
    """
    Builds a responsive, accessible, table-based HTML email and plain-text fallback
    for the Hi-Vet forgot password verification code.

    Follows email best practices:
    - Pure table layout with inline styles (max-width: 600px, fluid width 100%).
    - Safe font stack: 'Plus Jakarta Sans', Arial, Helvetica, sans-serif.
    - Continuous 6-digit code block selectable with double-tap.
    - Hidden preheader snippet with non-breaking spacers.
    - Warm cream background (#FAF9F6), white rounded card, brand orange (#EE651B).
    - Clear safety notes, validity notes, support contact, and dynamic copyright year.
    - High contrast text (WCAG AA/AAA compliant).
    - Total HTML size well under 100KB (no Gmail clipping).
    """
    # Clean and determine greeting
    clean_name = (first_name or "").strip()
    if clean_name:
        # Sanitize any HTML characters in user's name
        safe_name = html.escape(clean_name)
        greeting = f"Hi {safe_name},"
        text_greeting = f"Hi {clean_name},"
    else:
        greeting = "Hi there,"
        text_greeting = "Hi there,"

    safe_otp = html.escape(str(otp_code).strip())
    safe_support = html.escape(support_email.strip())
    current_year = datetime.datetime.utcnow().year

    # Preheader text + spacer hack (prevents body text from leaking into inbox snippet)
    preheader_text = "Use this code to reset your password. It expires in 10 minutes."
    preheader_spacer = "&nbsp;&zwnj;" * 25

    html_content = f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>Reset your password</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Progressive mobile styling for supporting clients */
    @media only screen and (max-width: 600px) {{
      .email-container {{
        width: 100% !important;
        max-width: 100% !important;
      }}
      .card-cell {{
        padding: 32px 20px !important;
      }}
      .otp-display {{
        font-size: 34px !important;
        letter-spacing: 4px !important;
        padding: 16px 12px !important;
      }}
      .main-title {{
        font-size: 24px !important;
      }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF9F6; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <!-- Hidden Preview Snippet (Preheader) -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-width: 0px; opacity: 0; color: #FAF9F6;">
    {preheader_text}
    {preheader_spacer}
  </div>

  <!-- Page Wrapper Table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF9F6; table-layout: fixed; min-width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Center Email Card (Max 600px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #EFECE6; overflow: hidden; box-shadow: 0 4px 20px rgba(44, 24, 16, 0.04);">
          
          <!-- Top Accent Line (Brand Orange) -->
          <tr>
            <td height="6" style="height: 6px; line-height: 6px; font-size: 6px; background-color: #EE651B;">&nbsp;</td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="card-cell" style="padding: 44px 44px 36px 44px; text-align: left;">

              <!-- Hi-Vet Brand Header -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td>
                    <!-- Brand Typography with fallback-safe styling -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="display: inline-block; width: 34px; height: 34px; line-height: 34px; text-align: center; background-color: #FDF2E9; border-radius: 10px; font-size: 18px; color: #EE651B; margin-right: 10px; font-weight: 800;">
                            &#128062;
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 22px; font-weight: 900; color: #EE651B; letter-spacing: -0.5px; line-height: 1;">Hi-Vet</span>
                          <span style="display: block; font-size: 11px; font-weight: 700; color: #8C827A; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px;">Veterinary Care</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Email Title -->
              <h1 class="main-title" style="margin: 0 0 16px 0; font-size: 26px; font-weight: 800; color: #262626; line-height: 1.25; letter-spacing: -0.5px;">
                Reset your password
              </h1>

              <!-- Greeting & Explanation -->
              <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #262626; line-height: 1.5;">
                {greeting}
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; font-weight: 500; color: #4A4A4A; line-height: 1.6;">
                We received a request to reset the password for your Hi-Vet account. Enter the code below on the password reset screen to continue.
              </p>

              <!-- Code Block Container -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="background-color: #FAF9F6; border: 1px solid #EAE6DF; border-radius: 16px; padding: 26px 20px;">
                    <span style="display: block; font-size: 12px; font-weight: 700; color: #EE651B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 10px;">
                      Your verification code
                    </span>
                    <!-- Continuous 6-digit text (easy double-tap select & copy) -->
                    <span class="otp-display" style="display: block; font-family: 'Courier New', Consolas, Monaco, monospace; font-size: 42px; font-weight: 800; color: #1F1F1F; letter-spacing: 6px; line-height: 1; user-select: all; -webkit-user-select: all;">
                      {safe_otp}
                    </span>
                    <!-- Validity Note -->
                    <span style="display: block; font-size: 13px; font-weight: 600; color: #555555; margin-top: 14px; line-height: 1.4;">
                      This code expires in 10 minutes.
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Safety Notice Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; background-color: #FFFDF9; border-left: 3px solid #EE651B; border-radius: 6px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; font-size: 13px; font-weight: 500; color: #555555; line-height: 1.6;">
                      If you didn't ask for this, you can ignore this email. Your password will stay the same. Never share this code with anyone. Hi-Vet will never ask you for it.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Support Help Line -->
              <p style="margin: 0; font-size: 13px; font-weight: 500; color: #666666; line-height: 1.5;">
                Need help? Contact us at <a href="mailto:{safe_support}" style="color: #EE651B; font-weight: 600; text-decoration: underline;">{safe_support}</a>.
              </p>

            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #F8F6F1; padding: 24px 32px; text-align: center; border-top: 1px solid #EFECE6;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #777777; line-height: 1.4;">
                Hi-Vet &middot; Your companion in health
              </p>
              <p style="margin: 0; font-size: 11px; font-weight: 500; color: #888888; line-height: 1.4;">
                &copy; {current_year} Hi-Vet. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Center Email Card -->

      </td>
    </tr>
  </table>

</body>
</html>"""

    # Plain text matching version
    text_content = f"""Hi-Vet: Reset your password

Use this code to reset your password. It expires in 10 minutes.

{text_greeting}

We received a request to reset the password for your Hi-Vet account. Enter the code below on the password reset screen to continue.

Your verification code:
{safe_otp}

This code expires in 10 minutes.

If you didn't ask for this, you can ignore this email. Your password will stay the same. Never share this code with anyone. Hi-Vet will never ask you for it.

Need help? Contact us at {support_email}.

Hi-Vet · Your companion in health
© {current_year} Hi-Vet. All rights reserved.
"""

    return html_content, text_content


def send_forgot_password_email(
    email: str,
    otp_code: str,
    first_name: str | None = None,
    sender_email: str | None = None,
    sender_app_pwd: str | None = None,
) -> bool:
    """
    Sends the redesigned forgot-password verification code email with both
    responsive HTML and matching plain-text alternative via SMTP.
    """
    from_addr = sender_email or os.getenv("EMAIL_SENDER", DEFAULT_SUPPORT_EMAIL)
    pwd = sender_app_pwd or os.getenv("EMAIL_APP_PWD", DEFAULT_APP_PWD)

    if not from_addr or not pwd:
        print("[EMAIL LOG] Missing email credentials (EMAIL_SENDER or EMAIL_APP_PWD)")
        raise RuntimeError("Email service not configured.")

    html_body, text_body = build_forgot_password_email(
        first_name=first_name,
        otp_code=otp_code,
        support_email=from_addr,
    )

    msg = MIMEMultipart("alternative")
    # Subject without code for privacy and lock-screen security
    msg["Subject"] = "Your Hi-Vet verification code"
    msg["From"] = f'"Hi-Vet" <{from_addr}>'
    msg["To"] = email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="gmail.com")
    msg["X-Auto-Response-Suppress"] = "All"
    msg["Auto-Submitted"] = "auto-generated"
    msg["X-Priority"] = "1 (Highest)"
    msg["Importance"] = "High"

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(from_addr, pwd)
            server.send_message(msg)
        print(f"[EMAIL LOG] Successfully sent forgot-password verification email to {email}")
        return True
    except Exception as exc:
        print(f"[EMAIL LOG] Failed to send email to {email}: {exc}")
        raise RuntimeError(f"Failed to send email: {str(exc)}")
