import { redirect } from 'next/navigation'

export default function LegacyApplicationsConfigPage() {
  redirect('/admin/applications')
}
