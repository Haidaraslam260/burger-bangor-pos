import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DEFAULT_REDIRECT } from "@/constants";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    // Redirect berdasarkan role
    redirect(DEFAULT_REDIRECT[session.user.role]);
  }

  // Redirect ke login jika belum login
  redirect("/login");
}
