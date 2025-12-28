const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTaskApplicationEmail({
  uploaderEmail,
  uploaderName,
  taskTitle,
  freelancerName,
  taskId,
}) {
  const taskLink = `${process.env.FRONTEND_URL}/task/${taskId}/applications`;

  try {
    Response=await resend.emails.send({
      from: "TaskHub@taskhub.digital",
      to: uploaderEmail,
      subject: `New application for your task: ${taskTitle}`,
      html: `
        <p>Hi ${uploaderName},</p>
        <p><strong>${freelancerName}</strong> has applied for your task:</p>
        <p><strong>${taskTitle}</strong></p>
        <p>
          <a href="${taskLink}">View Applications</a>
        </p>
        <p>— TaskHub Team</p>
      `,
    });
    console.log("Email send response:", Response);
    console.log("Task application email sent successfully.");
  } catch (error) {
    console.error("Failed to send task application email:", error);
    throw new Error("Could not send task application email");
  }
}

module.exports = sendTaskApplicationEmail;
