import { EmployeeDetailView } from '@/components/app/employee-detail-view'

export default function EmployeeDetailPage({
  params,
}: Readonly<{
  params: { id: string }
}>) {
  return <EmployeeDetailView employeeId={params.id} />
}