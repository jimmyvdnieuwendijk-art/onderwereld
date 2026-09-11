import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Inloggen",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
