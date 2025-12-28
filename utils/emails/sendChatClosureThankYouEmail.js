const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendChatClosureThankYouEmail({
  uploaderEmail,
  freelancerEmail,
  taskTitle,
}) {
  try {
    await resend.emails.send({
      from: "noreply@taskhub.digital",
      to: [uploaderEmail, freelancerEmail],
      subject: `Thank you for using TaskHub`,
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
            text-align: center;
          ">
            <h1 style="
              margin: 0 0 6px;
              font-size: 28px;
              color: #4a148c;
              font-weight: 800;
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

            <p style="
              font-size: 15px;
              color: #555;
              line-height: 1.6;
              margin-bottom: 18px;
            ">
              Thank you for collaborating on the task:
            </p>

            <div style="
              background: #f5f0fa;
              border-left: 4px solid #6a1b9a;
              padding: 14px 16px;
              border-radius: 10px;
              margin-bottom: 22px;
            ">
              <p style="
                margin: 0;
                font-size: 15px;
                color: #333;
                font-weight: 600;
              ">
                ${taskTitle}
              </p>
            </div>

            <p style="
              font-size: 14px;
              color: #666;
              line-height: 1.6;
              margin-bottom: 28px;
            ">
              We hope your experience on <strong>TaskHub</strong> was smooth,
              productive, and rewarding 🤝
            </p>

            <hr style="
              margin: 32px 0 20px;
              border: none;
              border-top: 1px solid #eee;
            " />

            <p style="
              font-size: 12px;
              color: #999;
            ">
              — TaskHub Team
            </p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send chat closure email:", error);
    throw new Error("Could not send chat closure email");
  }
}

module.exports = sendChatClosureThankYouEmail;
