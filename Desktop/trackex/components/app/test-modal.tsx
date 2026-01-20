'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function TestModal() {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => {
                    console.log('Button clicked, setting open to true')
                    setOpen(true)
                }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Test Modal
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Test Modal</DialogTitle>
                    <DialogDescription>
                        This is a simple test modal.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-4">
                    <p>Modal content goes here</p>
                    <Button onClick={() => setOpen(false)}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
