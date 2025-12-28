const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(toEmail, token) {
  const verificationUrl = `${process.env.VERIFICATION_URL}?token=${token}`;

  try {
    const response = await resend.emails.send({
      from: "TaskHub@taskhub.digital",
      to: toEmail,
      subject: "Verify your email for TaskHub",
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
              margin: 0 0 8px;
              font-size: 30px;
              color: #4a148c;
              font-weight: 800;
              letter-spacing: 0.5px;
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
              Verify your email
            </h2>

            <p style="
              font-size: 15px;
              color: #555;
              line-height: 1.6;
              margin-bottom: 30px;
            ">
              Welcome to <strong>TaskHub</strong> 👋 <br />
              Click the button below to verify your email address and activate your account.
            </p>

            <a
              href="${verificationUrl}"
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
              Verify Email
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
              If you didn’t create a TaskHub account, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Verification email sent:", response);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("Could not send verification email");
  }
}

module.exports = sendVerificationEmail;
