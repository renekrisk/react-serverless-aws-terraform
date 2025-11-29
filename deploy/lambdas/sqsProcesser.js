// Improved sqsProcesser Lambda:
// - uses async/await
// - parses message body safely
// - logs structured JSON instead of raw text
// - returns per-record result
// - prepares for future business logic extension

exports.handler = async function (event, context) {
  console.log("sqsProcesser invoked with event:", JSON.stringify(event));

  const results = [];

  for (const record of event.Records || []) {
    try {
      const rawBody = record.body;
      let parsedBody;

      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody; // fallback if body isn’t valid JSON
      }

      console.log("🟦 SQS Message Received:", {
        messageId: record.messageId,
        receiptHandle: record.receiptHandle,
        content: parsedBody,
      });

      // Extendable area:
      // — insert into DB
      // — trigger another Lambda
      // — notify client through WebSocket
      // — send push/email etc.
      // For now, just return acknowledgment.

      results.push({
        messageId: record.messageId,
        success: true,
      });
    } catch (err) {
      console.error("❗ Failed processing record:", err);

      results.push({
        messageId: record.messageId,
        success: false,
        error: err.message,
      });
    }
  }

  return {
    processed: results.length,
    results,
  };
};
