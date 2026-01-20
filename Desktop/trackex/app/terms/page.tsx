import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { APP_NAME } from "@/lib/constants"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-xl text-muted-foreground">
              Terms and conditions for using {APP_NAME}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: January 1, 2024
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>1. Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  By accessing and using {APP_NAME}, you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to abide by the above, 
                  please do not use this service.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Service Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {APP_NAME} is a time tracking and productivity monitoring service designed to help 
                  organizations track employee work hours and productivity metrics. The service 
                  includes desktop applications, web dashboard, and analytics tools.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Acceptable Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">You agree to use the service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                    <div>Use the service in any way that violates applicable laws or regulations</div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                    <div>Attempt to gain unauthorized access to any portion of the service</div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                    <div>Use the service to transmit viruses, malware, or other harmful code</div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                    <div>Reverse engineer, decompile, or disassemble the software</div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Data and Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Data collection and usage are governed by our Privacy Policy. By using the service, 
                  you consent to the collection and use of information as described in our Privacy Policy. 
                  You are responsible for ensuring compliance with applicable employment laws regarding 
                  employee monitoring.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Account Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You are responsible for maintaining the confidentiality of your account credentials 
                  and for all activities that occur under your account. You agree to notify us immediately 
                  of any unauthorized use of your account or any other breach of security.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Service Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We strive to maintain high service availability but do not guarantee uninterrupted 
                  service. We may temporarily suspend service for maintenance, updates, or other 
                  operational reasons. We are not liable for any damages resulting from service 
                  interruptions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  In no event shall {APP_NAME} be liable for any indirect, incidental, special, 
                  consequential, or punitive damages, including without limitation, loss of profits, 
                  data, use, goodwill, or other intangible losses, resulting from your use of the service.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Modifications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We reserve the right to modify these terms at any time. We will notify users of 
                  significant changes via email or through the service. Continued use of the service 
                  after changes constitutes acceptance of the new terms.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  If you have questions about these Terms of Service, please contact us at 
                  legal@{APP_NAME.toLowerCase()}.com
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
