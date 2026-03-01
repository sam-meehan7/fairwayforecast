import { Resend } from "resend";
import { render } from "@react-email/render";
import { WeatherNotification } from "@/emails/weather-notification";
import { degreesToDirection } from "./weather";
import type { WeatherForecast } from "./types";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

interface SendWeatherEmailParams {
  toEmail: string;
  userName: string;
  clubName: string;
  eventDate: string;
  eventTime: string | null;
  weather: WeatherForecast | null;
  notificationType: "morning" | "evening";
  unsubscribeToken: string;
}

export async function sendWeatherEmail(
  params: SendWeatherEmailParams
): Promise<void> {
  const windDirection =
    params.weather?.wind_direction != null
      ? degreesToDirection(params.weather.wind_direction)
      : "";

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const unsubscribeUrl = `${baseUrl}/unsubscribe/${params.unsubscribeToken}`;

  const subject =
    params.notificationType === "evening"
      ? `Weather for ${params.clubName} tomorrow`
      : `Today's weather at ${params.clubName}`;

  const html = await render(
    WeatherNotification({
      userName: params.userName,
      clubName: params.clubName,
      eventDate: params.eventDate,
      eventTime: params.eventTime,
      weather: params.weather,
      windDirection,
      notificationType: params.notificationType,
      unsubscribeUrl,
    })
  );

  await getResend().emails.send({
    from: process.env.FROM_EMAIL!,
    to: [params.toEmail],
    subject,
    html,
  });

  console.log(`Email sent to ${params.toEmail}: ${subject}`);
}
