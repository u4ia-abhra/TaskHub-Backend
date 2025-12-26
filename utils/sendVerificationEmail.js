const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(toEmail, token) {
  const verificationUrl = `${process.env.VERIFICATION_URL}?token=${token}`;

  try {
    const response = await resend.emails.send({
      from: "noreply@taskhub.digital", 
      to: toEmail, 
      subject: "Verify your email for TaskHub",
      html: `
        <p>Welcome to TaskHub!</p>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationUrl}" target="_blank">Verify Email</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });
    console.log("Verification email sent:", response);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("Could not send verification email");
  }
}

module.exports = sendVerificationEmail;
