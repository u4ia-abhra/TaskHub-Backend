const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTaskSubmissionEmail({
  uploaderEmail,
  uploaderName,
  freelancerName,
  taskTitle,
  taskId,
  version,
}) {
  const taskLink = `${process.env.FRONTEND_URL}/tasks/${taskId}/submissions`;

  try {
    await resend.emails.send({
      from: "TaskHub@taskhub.digital",
      to: uploaderEmail,
      subject: `New submission received for ${taskTitle}`,
      html: `
        <p>Hi ${uploaderName},</p>
        <p><strong>${freelancerName}</strong> has submitted work for your task:</p>
        <p><strong>${taskTitle}</strong> (Submission v${version})</p>
        <p>
          <a href="${taskLink}">Review Submission</a>
        </p>
        <p>— TaskHub Team</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send submission email:", error);
    throw new Error("Could not send submission email");
  }
}

module.exports = sendTaskSubmissionEmail;
