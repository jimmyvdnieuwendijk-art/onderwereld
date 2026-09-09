import { Suspense } from "react";
import { ensureLiveBootstrap } from "@/lib/ensure-catalog";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Inloggen",
};

export default async function LoginPage() {
  await ensureLiveBootstrap();
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
