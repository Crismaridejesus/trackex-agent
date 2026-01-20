'use client'

import { useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react'

interface EmployeeActionsMenuProps {
    employee: {
        id: string
        name: string
        email: string
        isActive: boolean
    }
    onEdit?: (employeeId: string) => void
    onDelete?: (employeeId: string) => void
}

export function EmployeeActionsMenu({
    employee,
    onEdit,
    onDelete
}: Readonly<EmployeeActionsMenuProps>) {
    const [isLoading, setIsLoading] = useState(false)

    const handleDelete = () => {
        if (!onDelete) return;
        if (confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
            setIsLoading(true)
            try {
                onDelete(employee.id)
            } finally {
                setIsLoading(false)
            }
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={isLoading}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Employee Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(employee.id);
                }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Details
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                    }}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Employee
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
