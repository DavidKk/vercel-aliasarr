import { redirect } from 'next/navigation'

/** Legacy entry — configuration is split into top-level Admin pages. */
export default function LegacyConfigPage() {
  redirect('/admin/services')
}
