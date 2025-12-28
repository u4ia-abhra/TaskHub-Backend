const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendApplicationAcceptedEmail({
  freelancerEmail,
  freelancerName,
  taskTitle,
  taskId,
}) {
  const taskLink = `${process.env.FRONTEND_URL}/tasks/${taskId}`;

  try {
    await resend.emails.send({
      from: "TaskHub@taskhub.digital",
      to: freelancerEmail,
      subject: `Your application was accepted 🎉`,
      html: `
        <p>Hi ${freelancerName},</p>
        <p>Your application for the task <strong>${taskTitle}</strong> has been accepted.</p>
        <p>
          <a href="${taskLink}">Go to Task</a>
        </p>
        <p>You can now start working and communicate via chat.</p>
        <p>— TaskHub Team</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send application accepted email:", error);
    throw new Error("Could not send application accepted email");
  }
}

module.exports = sendApplicationAcceptedEmail;
