const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendSubmissionDecisionEmail({
  freelancerEmail,
  freelancerName,
  taskTitle,
  taskId,
  decision, // "accepted" | "revision_requested"
  revisionMessage,
}) {
  const taskLink = `${process.env.FRONTEND_URL}/tasks/${taskId}`;

  const subject =
    decision === "accepted"
      ? "Your submission was accepted ✅"
      : "Revision requested for your submission";

  const decisionText =
    decision === "accepted"
      ? "<p>Your submission has been accepted. Great work!</p>"
      : `<p>A revision has been requested with the following feedback:</p>
         <blockquote>${revisionMessage || "No additional message provided."}</blockquote>`;

  try {
    await resend.emails.send({
      from: "TaskHub@taskhub.digital",
      to: freelancerEmail,
      subject,
      html: `
        <p>Hi ${freelancerName},</p>
        ${decisionText}
        <p>
          <a href="${taskLink}">View Task</a>
        </p>
        <p>— TaskHub Team</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send submission decision email:", error);
    throw new Error("Could not send submission decision email");
  }
}

module.exports = sendSubmissionDecisionEmail;
