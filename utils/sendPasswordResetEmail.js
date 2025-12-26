const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPasswordResetEmail(toEmail, token) {
  const resetLink = `${process.env.RESET_PASSWORD_URL}?token=${token}`;
  try {
    const response = await resend.emails.send({
      from: "noreply@taskhub.digital", 
      to: toEmail,
      subject: "Reset Your TaskHub Password",
      html: `
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
      `,
    });
    console.log("Password reset email sent:", response);
  } catch (error) {
    console.error("Failed to send reset email:", error);
    throw new Error("Could not send reset email");
  }
}

module.exports = sendPasswordResetEmail;
