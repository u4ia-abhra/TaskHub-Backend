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
      from: "noreply@taskhub.digital",
      to: uploaderEmail,
      subject: `New submission received for ${taskTitle}`,
      html: `
        <div style="
          margin: 0;
          padding: 40px 20px;
          font-family: 'Segoe UI', Arial, sans-serif;
          background: linear-gradient(135deg, #2b1055, #6a1b9a);
        ">
          <div style="
            max-width: 540px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.96);
            border-radius: 18px;
            padding: 36px 32px;
            box-shadow: 0 20px 45px rgba(0,0,0,0.25);
          ">
            <h1 style="
              margin: 0 0 6px;
              font-size: 28px;
              color: #4a148c;
              font-weight: 800;
              text-align: center;
            ">
              TaskHub
            </h1>

            <p style="
              margin: 0 0 28px;
              font-size: 14px;
              color: #777;
              text-align: center;
            ">
              For and by students
            </p>

            <p style="
              font-size: 15px;
              color: #444;
              margin-bottom: 14px;
            ">
              Hi <strong>${uploaderName}</strong>,
            </p>

            <p style="
              font-size: 15px;
              color: #555;
              line-height: 1.6;
              margin-bottom: 18px;
            ">
              <strong>${freelancerName}</strong> has submitted work for your task:
            </p>

            <div style="
              background: #f5f0fa;
              border-left: 4px solid #6a1b9a;
              padding: 14px 16px;
              border-radius: 10px;
              margin-bottom: 24px;
            ">
              <p style="
                margin: 0;
                font-size: 15px;
                color: #333;
                font-weight: 600;
              ">
                ${taskTitle}
              </p>
              <p style="
                margin: 4px 0 0;
                font-size: 13px;
                color: #666;
              ">
                Submission version: v${version}
              </p>
            </div>

            <div style="text-align: center; margin-bottom: 28px;">
              <a
                href="${taskLink}"
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
                Review Submission
              </a>
            </div>

            <p style="
              font-size: 13px;
              color: #777;
              text-align: center;
            ">
              Please review the submission and take the next action on TaskHub.
            </p>

            <hr style="
              margin: 32px 0 20px;
              border: none;
              border-top: 1px solid #eee;
            " />

            <p style="
              font-size: 12px;
              color: #999;
              text-align: center;
            ">
              — TaskHub Team
            </p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send submission email:", error);
    throw new Error("Could not send submission email");
  }
}

module.exports = sendTaskSubmissionEmail;
