const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendDeadlineReminderEmail({
  freelancerEmail,
  freelancerName,
  taskTitle,
  taskId,
  deadline,
}) {
  const taskLink = `${process.env.FRONTEND_URL}/tasks/${taskId}`;

  try {
    await resend.emails.send({
      from: "TaskHub@taskhub.digital",
      to: freelancerEmail,
      subject: `Reminder: Deadline approaching for ${taskTitle}`,
      html: `
        <p>Hi ${freelancerName},</p>
        <p>This is a reminder that the deadline for your task:</p>
        <p><strong>${taskTitle}</strong></p>
        <p>is approaching on <strong>${deadline}</strong>.</p>
        <p>
          <a href="${taskLink}">Go to Task</a>
        </p>
        <p>— TaskHub Team</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send deadline reminder email:", error);
    throw new Error("Could not send deadline reminder email");
  }
}

module.exports = sendDeadlineReminderEmail;
