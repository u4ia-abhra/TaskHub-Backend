const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPasswordResetEmail(toEmail, token) {
  const resetLink = `${process.env.RESET_PASSWORD_URL}?token=${token}`;

  try {
    const response = await resend.emails.send({
      from: "TaskHub@taskhub.digital",
      to: toEmail,
      subject: "Reset Your TaskHub Password",
      html: `
        <div style="
          margin: 0;
          padding: 40px 20px;
          font-family: 'Segoe UI', Arial, sans-serif;
          background: linear-gradient(135deg, #2b1055, #6a1b9a);
        ">
          <div style="
            max-width: 520px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.96);
            border-radius: 18px;
            padding: 36px 32px;
            box-shadow: 0 20px 45px rgba(0,0,0,0.25);
            text-align: center;
          ">
            <h1 style="
              margin: 0 0 6px;
              font-size: 28px;
              color: #4a148c;
              font-weight: 800;
            ">
              TaskHub
            </h1>

            <p style="
              margin: 0 0 28px;
              font-size: 14px;
              color: #777;
            ">
              For and by students
            </p>

            <h2 style="
              margin-bottom: 12px;
              font-size: 22px;
              color: #333;
            ">
              Reset your password
            </h2>

            <p style="
              font-size: 15px;
              color: #555;
              line-height: 1.6;
              margin-bottom: 28px;
            ">
              We received a request to reset your <strong>TaskHub</strong> password.  
              Click the button below to set a new password.
            </p>

            <a
              href="${resetLink}"
              target="_blank"
              style="
                display: inline-block;
                padding: 14px 32px;
                background: linear-gradient(135deg, #6a1b9a, #8e24aa);
                color: #ffffff;
                text-decoration: none;
                border-radius: 999px;
                font-size: 15px;
                font-weight: 600;
                box-shadow: 0 10px 22px rgba(106, 27, 154, 0.45);
              "
            >
              Reset Password
            </a>

            <p style="
              margin-top: 28px;
              font-size: 13px;
              color: #777;
            ">
              ⏰ This link will expire in <strong>1 hour</strong>.
            </p>

            <hr style="
              margin: 32px 0 20px;
              border: none;
              border-top: 1px solid #eee;
            " />

            <p style="
              font-size: 12px;
              color: #999;
              line-height: 1.5;
            ">
              If you didn’t request a password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Password reset email sent:", response);
  } catch (error) {
    console.error("Failed to send reset email:", error);
    throw new Error("Could not send reset email");
  }
}

module.exports = sendPasswordResetEmail;
