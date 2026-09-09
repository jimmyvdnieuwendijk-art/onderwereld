import { ensureLiveBootstrap } from "@/lib/ensure-catalog";
import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Registreren",
};

export default async function RegisterPage() {
  await ensureLiveBootstrap();
  return <RegisterForm />;
}
