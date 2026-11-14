import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/queries";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "設定" };

export default async function SettingsPage() {
  const st = await getSettings();
  return (
    <div className="page">
      <div className="head"><div><h1>設定</h1><div className="sub">印表機、校正、紙色、工作室</div></div></div>
      <SettingsForm settings={st} storageKind={env.storageDriver} />
    </div>
  );
}
