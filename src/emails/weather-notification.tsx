import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { WeatherForecast } from "@/lib/types";

interface WeatherNotificationProps {
  userName: string;
  clubName: string;
  eventDate: string;
  eventTime: string | null;
  weather: WeatherForecast | null;
  windDirection: string;
  notificationType: "morning" | "evening";
  unsubscribeUrl: string;
}

export function WeatherNotification({
  userName,
  clubName,
  eventDate,
  eventTime,
  weather,
  windDirection,
  notificationType,
  unsubscribeUrl,
}: WeatherNotificationProps) {
  const previewText =
    notificationType === "evening"
      ? `Weather for ${clubName} tomorrow`
      : `Today's weather at ${clubName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>Golf Weather Update</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi {userName},</Text>

            {notificationType === "evening" ? (
              <Text style={paragraph}>
                Here&apos;s the weather forecast for your round at{" "}
                <strong>{clubName}</strong> tomorrow ({eventDate})
                {eventTime ? ` at ${eventTime}` : ""}:
              </Text>
            ) : (
              <Text style={paragraph}>
                Good morning! Here&apos;s the latest forecast for your round at{" "}
                <strong>{clubName}</strong> today
                {eventTime ? ` at ${eventTime}` : ""}:
              </Text>
            )}

            {weather ? (
              <Section style={weatherBox}>
                <WeatherRow
                  label="Temperature"
                  value={`${weather.temp_min}° - ${weather.temp_max}°${weather.units.temperature}`}
                />
                <WeatherRow
                  label="Feels like"
                  value={`${weather.feels_like_min}° - ${weather.feels_like_max}°${weather.units.temperature}`}
                />
                <WeatherRow
                  label="Rain chance"
                  value={`${weather.rain_chance}%`}
                />
                <WeatherRow
                  label="Wind"
                  value={`${weather.wind_speed} ${weather.units.wind_speed} ${windDirection}`}
                />
              </Section>
            ) : (
              <Text style={paragraphMuted}>
                Weather data unavailable — we don&apos;t have coordinates for
                this club yet.
              </Text>
            )}

            <Text style={paragraph}>Have a great round!</Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Link href={unsubscribeUrl} style={footerLink}>
              Unsubscribe
            </Link>{" "}
            from these notifications
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function WeatherRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={weatherItem}>
      <span style={weatherLabel}>{label}</span>
      <span style={weatherValue}>{value}</span>
    </div>
  );
}

// Styles
const body = {
  backgroundColor: "#f9f9f9",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px",
};

const header = {
  backgroundColor: "#2d5a27",
  padding: "20px",
  borderRadius: "8px 8px 0 0",
};

const headerTitle = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0",
};

const content = {
  backgroundColor: "#ffffff",
  padding: "20px",
  borderRadius: "0 0 8px 8px",
};

const greeting = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#333",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#333",
};

const paragraphMuted = {
  fontSize: "14px",
  fontStyle: "italic" as const,
  color: "#666",
};

const weatherBox = {
  backgroundColor: "#f9f9f9",
  padding: "15px",
  borderRadius: "8px",
  margin: "15px 0",
};

const weatherItem = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid #eee",
};

const weatherLabel = {
  color: "#666",
  fontSize: "14px",
};

const weatherValue = {
  fontWeight: "700" as const,
  fontSize: "14px",
  color: "#333",
};

const hr = {
  borderColor: "#eee",
  margin: "20px 0",
};

const footer = {
  fontSize: "12px",
  color: "#999",
};

const footerLink = {
  color: "#999",
};
