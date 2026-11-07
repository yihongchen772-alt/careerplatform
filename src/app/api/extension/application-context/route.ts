import { withExtensionUser } from "@/lib/extension-auth";
import { GET as desktopGET } from "@/app/api/desktop-browser/application-context/route";
export async function GET(request: Request) { return withExtensionUser(request, () => desktopGET()); }
