export async function sendReleaseNotification(result) {
  if (!result?.email) {
    return {
      sent: false,
      reason: "Recipient email is missing",
    };
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const certificateUrl = result.certificateFile
    ? `${baseUrl}/certificates/${result.certificateFile}`
    : null;

  const payload = {
    to: result.email,
    subject: `Your exam result is released: ${result.examName}`,
    body: [
      `Hello ${result.candidateName},`,
      "",
      `Your result for \"${result.examName}\" has been released.`,
      `Status: ${result.status}`,
      `Score: ${result.score} / ${result.maxScore} (${result.percentage}%)`,
      `Grade: ${result.grade}`,
      "",
      certificateUrl
        ? `Download your certificate: ${certificateUrl}`
        : "A certificate has not been generated yet.",
      "",
      `View your result: ${baseUrl}/candidate-results/${result.candidateId}/view`,
      "",
      "Thank you for using our learning platform.",
    ].join("\n"),
  };

  try {
    const notification = await import("@f10/notification");
    const api = notification.default || notification;
    const sendFn = api.sendEmail || api.sendNotification || api.notify;

    if (typeof sendFn !== "function") {
      throw new Error(
        "F10 notification utility does not expose sendEmail/sendNotification/notify"
      );
    }

    await sendFn(payload);
    return {
      sent: true,
      provider: "F10",
    };
  } catch (error) {
    console.warn("F10 notification utility error:", error.message);
    return {
      sent: false,
      provider: "F10",
      reason: error.message,
    };
  }
}
