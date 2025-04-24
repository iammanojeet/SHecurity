import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import twilio from "twilio";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE;
const client = new twilio(accountSid, authToken);

app.post("/send-alert", async (req, res) => {
  const { phone, latitude, longitude } = req.body;

  if (!phone || !latitude || !longitude) {
    return res.status(400).json({ message: "Missing required fields!" });
  }

  const messageBody = `🚨 HELP! Here is my location: https://www.google.com/maps?q=${latitude},${longitude}`;

  try {
    await client.messages.create({
      body: messageBody,
      from: twilioNumber,
      to: phone,
    });

    await client.calls.create({
      twiml: `<Response><Say>Emergency Alert! Check your SMS for the location.</Say></Response>`,
      from: twilioNumber,
      to: phone,
    });

    res.status(200).json({ message: "Alert sent successfully!" });
  } catch (error) {
    console.error("Twilio Error:", error);
    res
      .status(500)
      .json({ message: "Error sending alert", error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
