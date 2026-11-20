import { redirect } from "next/navigation";
import { getSessionPayload, HOME_BY_ROLE } from "@/lib/session";

export default async function Home() {
  const session = await getSessionPayload();
  redirect(session ? HOME_BY_ROLE[session.role] : "/login");
}
