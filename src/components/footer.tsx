export function Footer() {
  return (
    <footer className="mt-12 py-6 px-6 border-t-2 border-border text-center text-sm text-foreground/60">
      <p>
        Weather data provided by{" "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Open-Meteo
        </a>
      </p>
    </footer>
  );
}
