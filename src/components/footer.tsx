export function Footer() {
  return (
    <footer className="mt-12 py-6 px-6 border-t-2 border-border text-center text-sm text-foreground/60 space-y-1">
      <p>
        Weather data provided by{" "}
        <a
          href="https://www.tomorrow.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Tomorrow.io
        </a>
      </p>
      <p>
        Created by{" "}
        <a
          href="https://www.linkedin.com/in/sam-meehan/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Sam Meehan
        </a>
      </p>
    </footer>
  );
}
