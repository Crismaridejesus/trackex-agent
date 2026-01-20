import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Key } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const adminLinks = [
    {
      title: "Organizations",
      description:
        "Manage all organizations, beta testers, and payment bypasses",
      href: "/app/admin/organizations",
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: "Licenses",
      description: "Manually activate or deactivate employee licenses",
      href: "/app/admin/licenses",
      icon: Key,
      color: "text-green-600",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Platform Administration
        </h1>
        <p className="text-muted-foreground">
          Manage organizations, licenses, and platform settings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <link.icon className={`h-5 w-5 ${link.color}`} />
                  {link.title}
                </CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Enable Beta for Organization:</strong> Go to Organizations →
            Click menu → Enable Beta
          </p>
          <p>
            <strong>Activate Licenses Manually:</strong> Go to Licenses → Enter
            employee IDs → Activate
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
