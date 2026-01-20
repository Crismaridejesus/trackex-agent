import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { generateMetadata as generateSEOMetadata } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Acceptable Use Policy",
  description: "TrackEx Acceptable Use Policy - Guidelines for using TrackEx employee monitoring software responsibly and legally. Employer and employee responsibilities.",
  url: "/legal/acceptable-use",
  keywords: "trackex acceptable use policy, employee monitoring guidelines, legal monitoring, employer responsibilities",
})

export default function AcceptableUsePolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <h1>TrackEx Acceptable Use Policy</h1>
            <p className="text-muted-foreground">Last Updated: January 12, 2026</p>

            <p>
              This Policy applies to all Clients and any users of our Service. Your use of our Service confirms that 
              you accept the terms of this Acceptable Use Policy alongside our Terms of Service and Privacy Policy.
            </p>

            <p>
              TrackEx (the "Service") is a workforce monitoring software used globally by businesses. To maintain a 
              superior level of service, security, and legality, we need you (the "Client") to follow this Acceptable 
              Use Policy (the "Policy"). If you choose not to follow the rules outlined in this Policy and in our 
              Terms of Service, we may suspend or terminate your service.
            </p>

            <p>
              The Policy sets out Clients' responsibilities when using our Service and confirms the steps we may take 
              to ensure and monitor compliance with this Policy.
            </p>

            <h2>1. Lawful Use</h2>
            <p>
              Clients must ensure that any use of our Service is legal and it is their sole responsibility to determine 
              what constitutes legal use in their particular jurisdiction. Although we can provide general informational 
              guidelines, we are not a law firm, so your dependence on any information provided by us is at your own 
              risk. Please seek the advice of a lawyer.
            </p>
            <p>
              All Clients agree they will not use, attempt to use or allow the Service to be used for any illegal or 
              malicious purpose. Every Client is responsible for their use of our Service, network and the operation 
              of any systems or applications accessed or used with our Service. Clients are responsible for any content 
              cached, sent, accessed or shared on or via our Service and systems.
            </p>
            <p>
              Any action that endangers any person or risks endangering or compromising the security or successful 
              operation of our network, or any of our systems or equipment (or the network, systems or equipment of 
              our suppliers), may mean access to the Service will be restricted, suspended or terminated.
            </p>
            <p>
              When using the Service, we may require users to act in accordance with rules imposed by a third party 
              from which you access content. In a situation that a supplier or third party provider considers one of 
              our Clients is in breach of this Policy, they may require we prevent the relevant Client continuing to 
              breach this Policy.
            </p>
            <p>
              The law requires us to comply with law enforcement or other lawful requests at any time without notice 
              to Clients.
            </p>

            <h2>2. Permitted Actions</h2>
            <p>The following uses of TrackEx are permitted:</p>
            <ul>
              <li>
                <strong>Installing TrackEx on company-owned devices:</strong> You may install the TrackEx desktop agent 
                on computers, laptops, and devices that are owned by your company or organization.
              </li>
              <li>
                <strong>Installing TrackEx on devices you own:</strong> For example, your own personal computer or a 
                family member's device that you own, with their knowledge and consent.
              </li>
              <li>
                <strong>Installing TrackEx with owner consent:</strong> Installing TrackEx on a computer or device that 
                you do not own if the owner provides explicit consent. It is your sole responsibility to determine what 
                counts as legal use in your particular jurisdiction. Please seek the advice of a lawyer.
              </li>
              <li>
                <strong>Employee monitoring with disclosure:</strong> Using TrackEx to monitor employees who have been 
                informed that monitoring software is installed on their work devices and have consented to such monitoring 
                as part of their employment agreement.
              </li>
              <li>
                <strong>Contractor monitoring with agreement:</strong> Monitoring independent contractors or freelancers 
                who have agreed to time tracking and productivity monitoring as part of their service agreement.
              </li>
            </ul>

            <h2>3. Prohibited Uses</h2>
            <p>
              In addition to the general responsibilities set out above, all Clients agree they will not use, attempt 
              to use or allow their account to be used:
            </p>
            <ul>
              <li>To infringe any law, industry code or standard;</li>
              <li>In any way so that the Service is interrupted, vandalized, rendered less efficient or the functionality of the Service is in any way impaired;</li>
              <li>For the transmitting, uploading or posting of any material which is defamatory, offensive, racist, vulgar, libelous or of an obscene or menacing character, or in such a way as to cause annoyance, inconvenience or needless worry;</li>
              <li>To disguise the origin of a use or communication, to access, keep track of or use any data or traffic on any systems or networks without authority;</li>
              <li>To authorize, assist, abet, encourage or incite any other person to do or attempt to do any of the above mentioned acts;</li>
              <li>As a means to threaten, stalk, harass, abuse, or otherwise insult other users or to collect or hoard personal data about other users;</li>
              <li>In any way that may vandalize or disrupt another user's computer;</li>
              <li>To transmit, upload or post any computer viruses or any harmful or deleterious files or programs;</li>
              <li>To falsify identity for the purpose of misleading others as to the identity of the sender or the origin of a message, including, but not limited to impersonating a TrackEx staff member, manager, host or another user; or</li>
              <li>For transmitting, uploading, posting or otherwise making available any solicited or unauthorized advertising, promotional materials, "junkmail", "spam", "chain letters", "pyramid schemes" or any duplicative or unsolicited messages.</li>
            </ul>

            <h2>4. Prohibited Actions</h2>
            <p>
              We do our best to maintain TrackEx's reputation as a legitimate business tool, but we rely on you, our 
              users, to do the right thing in practice. You are NOT permitted to:
            </p>
            <ul>
              <li>
                <strong>Installing without ownership or authorization:</strong> Install the TrackEx desktop agent on any 
                device or gadget you or your company does not own, and without prior explicit permission of the device 
                owner and user.
              </li>
              <li>
                <strong>Installing on public computers:</strong> Install the TrackEx agent on a public computer or device 
                which you or your company does not own, or have full legal, administrative rights to.
              </li>
              <li>
                <strong>Installing without knowledge:</strong> Installing TrackEx on any device or gadget without the 
                device owner's knowledge and authorization.
              </li>
              <li>
                <strong>Covert monitoring:</strong> Monitor device usage with intentions for the purposes of learning 
                personal information about the device user without their knowledge and consent.
              </li>
              <li>
                <strong>Stalking or spying:</strong> Install TrackEx's agent with the intention to stalk, spy on, or 
                harass the device user without their knowledge and consent.
              </li>
              <li>
                <strong>Monitoring personal activities:</strong> Using TrackEx to monitor employees' personal activities 
                outside of agreed-upon work hours without explicit consent.
              </li>
              <li>
                <strong>Violating employment laws:</strong> Using TrackEx in a manner that violates applicable employment, 
                labor, or privacy laws in your jurisdiction.
              </li>
            </ul>

            <h2>5. Employee Notification Requirements</h2>
            <p>
              As a responsible employer using TrackEx, you are required to:
            </p>
            <ul>
              <li>Inform employees that monitoring software is installed on company devices;</li>
              <li>Clearly communicate what activities are being monitored (app usage, screenshots, time tracking, etc.);</li>
              <li>Include monitoring policies in employee handbooks or employment agreements;</li>
              <li>Comply with all local, state, and national laws regarding employee monitoring and workplace privacy;</li>
              <li>Obtain necessary consents where required by law;</li>
              <li>Use collected data only for legitimate business purposes.</li>
            </ul>

            <h2>6. Limitation of Liability</h2>
            <p>Clients acknowledge that:</p>
            <ul>
              <li>We are not accountable for the content collected through the Service;</li>
              <li>Client is solely responsible for Client's use of the Service;</li>
              <li>We are not liable for any misuse of the monitoring data by Clients;</li>
              <li>Clients are responsible for ensuring their use of TrackEx complies with all applicable laws and regulations;</li>
              <li>Clients will see to the provision, configuration or maintenance of any equipment or software they need to access the Service, as well as for the security and integrity of Clients' data except where we have agreed to provide and manage certain equipment or software.</li>
            </ul>

            <h2>7. Remedies for Breach</h2>
            <p>
              We may request you change your use of the Service if we believe that an infringement of this Policy has 
              occurred.
            </p>
            <p>We reserve the right to take one or more of the following actions:</p>
            <ul>
              <li>To suspend access to the Service indefinitely or for a specific period;</li>
              <li>Terminate access to the Service and refuse to provide the Service to the Client or their associates in the future;</li>
              <li>Report to appropriate government and regulatory authorities of suspected illegal or infringing conduct;</li>
              <li>Delete or edit any of the Client's data;</li>
              <li>Override any attempt by the Client to infringe this Policy; and</li>
              <li>Take any other action we consider appropriate, including taking action against offenders to recover the money and expenses spent on identifying them.</li>
            </ul>
            <p>
              We may also carry out any of the above steps if directed to do so by a regulatory or other law 
              enforcement body.
            </p>

            <h2>8. Data Protection Compliance</h2>
            <p>
              When using TrackEx, Clients must ensure compliance with applicable data protection regulations, including 
              but not limited to:
            </p>
            <ul>
              <li><strong>GDPR (European Union):</strong> If monitoring employees in the EU, ensure proper legal basis for processing, provide appropriate notices, and respect data subject rights.</li>
              <li><strong>CCPA (California):</strong> If monitoring employees in California, provide required notices and honor consumer rights requests.</li>
              <li><strong>Local Privacy Laws:</strong> Comply with any other applicable local, state, or national privacy and employment laws.</li>
            </ul>

            <h2>9. Modifications</h2>
            <p>
              We reserve the right to update this Policy from time to time. Your continued use of Service following 
              such update(s) will constitute acceptance of the changes.
            </p>

            <h2>10. Report a Breach</h2>
            <p>
              You can report a suspected infringement of this Policy by sending an email to support@trackex.app. We 
              take all reports seriously and will investigate accordingly.
            </p>

            <hr className="my-8" />

            <h2>Best Practices for Employers</h2>
            <p>
              To use TrackEx responsibly and maintain a positive workplace culture, we recommend:
            </p>
            <ol>
              <li>
                <strong>Be Transparent:</strong> Clearly communicate your monitoring policies to all employees before 
                implementing TrackEx.
              </li>
              <li>
                <strong>Document Consent:</strong> Obtain written acknowledgment from employees that they understand 
                and consent to monitoring.
              </li>
              <li>
                <strong>Limit Scope:</strong> Only monitor what is necessary for legitimate business purposes.
              </li>
              <li>
                <strong>Respect Privacy:</strong> Avoid monitoring during breaks, after hours, or on personal devices 
                without explicit consent.
              </li>
              <li>
                <strong>Secure Data:</strong> Protect collected monitoring data with appropriate security measures.
              </li>
              <li>
                <strong>Review Regularly:</strong> Periodically review your monitoring practices to ensure they remain 
                necessary and proportionate.
              </li>
              <li>
                <strong>Consult Legal Counsel:</strong> When in doubt, consult with legal professionals familiar with 
                employment law in your jurisdiction.
              </li>
            </ol>

            <hr className="my-8" />

            <p className="text-sm text-muted-foreground">
              Thank you for taking the time to read our Acceptable Use Policy! Please also review our Terms of Service 
              and Privacy Policy to ensure you stay within our terms and avoid any account suspension or termination.
            </p>
            <p className="text-sm text-muted-foreground">
              If you have any questions about this Policy, please contact us at support@trackex.app.
            </p>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
