"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <Button
      size="lg"
      onClick={() => signIn("google")}
      className="text-base px-8 py-6 cursor-pointer"
    >
      Sign in with Google
    </Button>
  );
}
