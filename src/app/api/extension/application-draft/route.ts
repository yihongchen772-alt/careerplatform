import { withExtensionUser } from "@/lib/extension-auth";
import { GET as desktopGET, POST as desktopPOST, DELETE as desktopDELETE } from "@/app/api/desktop-browser/application-draft/route";
export async function GET(request: Request) { return withExtensionUser(request, () => desktopGET(request)); }
export async function POST(request: Request) { return withExtensionUser(request, () => desktopPOST(request)); }
export async function DELETE(request: Request) { return withExtensionUser(request, () => desktopDELETE(request)); }
