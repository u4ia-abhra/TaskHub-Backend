const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendChatClosureThankYouEmail({
  uploaderEmail,
  freelancerEmail,
  taskTitle,
}) {
  try {
    await resend.emails.send({
      from: "TaskHub@taskhub.digital",
      to: [uploaderEmail, freelancerEmail],
      subject: `Thank you for using TaskHub`,
      html: `
        <p>Thank you for collaborating on the task:</p>
        <p><strong>${taskTitle}</strong></p>
        <p>We hope your experience on TaskHub was smooth and productive.</p>
        <p>— TaskHub Team</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send chat closure email:", error);
    throw new Error("Could not send chat closure email");
  }
}

module.exports = sendChatClosureThankYouEmail;
