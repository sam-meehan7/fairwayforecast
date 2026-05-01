"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X, Star, Bell, Wind, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

type Status = "idle" | "submitting" | "success" | "error";

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  { Icon: Star, label: "Favourite course" },
  { Icon: Bell, label: "Follow-up notifications" },
  { Icon: Wind, label: "Accurate hole-by-hole wind info" },
];

export function ComingSoonModal({ open, onClose }: ComingSoonModalProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(onClose, 1500);
    return () => clearTimeout(t);
  }, [status, onClose]);

  if (!open) return null;

  async function submit() {
    if (status === "submitting") return;

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(
          data?.error === "Invalid email"
            ? "That email doesn't look right."
            : "Something went wrong. Try again?"
        );
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Network error. Try again?");
      setStatus("error");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-overlay p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="relative w-full max-w-md">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-base p-1 text-foreground/60 transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <CardHeader>
          <CardTitle id={titleId} className="text-xl">
            Coming soon to FairwayForecast
          </CardTitle>
          <CardDescription>
            Be the first to know when these land.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {FEATURES.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="font-base">{label}</span>
              </li>
            ))}
          </ul>

          {status === "success" ? (
            <div className="flex items-center gap-2 rounded-base border-2 border-border bg-main px-3 py-2 text-main-foreground">
              <Check className="size-4" />
              <span className="font-base">Thanks — you&apos;re on the list.</span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex flex-col gap-2"
            >
              <label htmlFor="interest-email" className="text-sm font-base">
                Want a heads-up? Drop your email.
              </label>
              <input
                ref={inputRef}
                id="interest-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="you@example.com"
                disabled={status === "submitting"}
                className="h-10 rounded-base border-2 border-border bg-secondary-background px-3 text-foreground placeholder:text-foreground/40 focus:outline-hidden focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              {errorMsg && (
                <span className="text-sm text-red-600">{errorMsg}</span>
              )}
            </form>
          )}
        </CardContent>

        {status !== "success" && (
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="neutral"
              onClick={onClose}
              disabled={status === "submitting"}
            >
              Maybe later
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={status === "submitting" || !email}
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending
                </>
              ) : (
                "Notify me"
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
