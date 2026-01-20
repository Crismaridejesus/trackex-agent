import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { AppSidebar } from "@/components/app/app-sidebar"
import { AppHeader } from "@/components/app/app-header"
import { ConditionalTopbar } from "@/components/app/conditional-topbar"

// Disable caching for app routes to ensure fresh authentication checks
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    // Simple session check
    const sessionCookie = cookies().get('simple-session')
    let session = null

    if (sessionCookie) {
        try {
            session = JSON.parse(sessionCookie.value)
            if (new Date(session.expires) <= new Date()) {
                session = null
            }
        } catch {
            session = null
        }
    }

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="flex h-screen">
                <AppSidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <AppHeader user={session.user} />
                    <ConditionalTopbar />
                    <main className="flex-1 overflow-auto p-6">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}
