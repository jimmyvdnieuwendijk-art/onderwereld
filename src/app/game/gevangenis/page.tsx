import { prisma } from "@/lib/prisma";
import { requireUserIdOrRedirect } from "@/lib/actions/helpers";
import { jailOccupantWhere } from "@/lib/hospital";
import { JailClient } from "./jail-client";

export default async function JailPage() {
  await requireUserIdOrRedirect();
  const occupantCount = await prisma.user.count({ where: jailOccupantWhere() });
  return <JailClient occupantCount={occupantCount} />;
}
