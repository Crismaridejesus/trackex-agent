import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Check if user is Super Admin
  const sessionCookie = cookies().get("simple-session")
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

  // Redirect if not logged in
  if (!session) {
    redirect("/login")
  }

  // Redirect if not Super Admin
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/app")
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
            SUPER ADMIN
          </div>
          <span className="text-sm text-muted-foreground">
            Platform administration
          </span>
        </div>
      </div>
      {children}
    </div>
  )
}
