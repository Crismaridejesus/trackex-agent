import { AddEmployeeModal } from '@/components/app/add-employee-modal'
import { EmployeeList } from '@/components/app/employee-list'
import { CreateTeamModal } from '@/components/app/create-team-modal'

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">
            Manage your team members and their access.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <CreateTeamModal />
          <AddEmployeeModal />
        </div>
      </div>

      <EmployeeList />
    </div>
  )
}
