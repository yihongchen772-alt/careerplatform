import { withExtensionUser } from "@/lib/extension-auth";
import { POST as desktopPOST } from "@/app/api/desktop-browser/record-application/route";
export async function POST(request: Request) { return withExtensionUser(request, () => desktopPOST(request)); }
