import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { generateMetadata as generateSEOMetadata } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Privacy Policy",
  description: "TrackEx Privacy Policy - Learn how we collect, use, and protect your personal data. GDPR and CCPA compliant. We are NOT a keylogger.",
  url: "/legal/privacy",
  keywords: "trackex privacy policy, employee monitoring privacy, data protection, GDPR compliant monitoring",
})

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <h1>TrackEx Privacy Policy</h1>
            <p className="text-muted-foreground">Last Updated: January 12, 2026</p>

            <p>
              This privacy policy explains how TrackEx Technologies Ltd (collectively, "TrackEx," "we," "us," and 
              "our") collects, uses, shares, and processes information about you. This privacy policy describes our 
              practices concerning your personal data that we process when we provide you with TrackEx's services, 
              including the services available through our website at www.trackex.app, our desktop applications for 
              macOS and Windows, and other services where we link this Policy (collectively the "Services").
            </p>

            <p>
              It also tells you about your privacy rights. Our terms of service provide further terms governing your 
              use of the Services. These terms are incorporated into this policy by this reference. It is important 
              that you read this privacy policy and our terms so that you are fully aware of how and why we are using 
              your personal data and the terms under which we provide you the Services.
            </p>

            <p>
              By accessing or using this Service, you signify that you acknowledge, accept, and agree with all the 
              terms of this privacy policy as well as our acceptable use policy and terms of service. Please do not 
              use or access this Service if you disagree with any part of this privacy policy.
            </p>

            <h2>1. Contact Information</h2>
            <p>
              If you have any questions, comments, requests, or concerns related to this privacy policy or our 
              privacy practices, or if you would like to opt-out of future communications or exercise your other 
              privacy-related rights, please feel free to contact us at:
            </p>
            <p>
              Email: support@trackex.app<br />
              Website: www.trackex.app
            </p>

            <h2>2. Applicability and Eligibility</h2>
            <p>
              We need to process your personal data to operate our organization and provide you with our Services. 
              By accepting our privacy policy and terms of service, you are confirming that you have read and 
              understood these policies, including how and why we use your personal data. If you don't want us to 
              collect or process your personal data in the ways described in this policy, you should not use the 
              Services.
            </p>
            <p>
              Please note we are not responsible for the content or the privacy policies or practices of any third 
              party organization or service that interact with our Services. We encourage you to read the privacy 
              policies of these third-party organizations before using any of the Services. The Services are not 
              directed to children under the age of 18. You may not use the Services if you are under the age of 18.
            </p>

            <h2>3. Personal Data We Collect</h2>
            <p>
              We define personal data as any information relating to an identified or identifiable natural person, 
              and an identifiable natural person is one who can be identified, directly or indirectly, in particular 
              by reference to an identifier such as a name, an identification number, location data, or an online 
              identifier.
            </p>
            
            <p>We rely on a number of legal bases to process the information we receive about you from your use of the Services, including where:</p>
            <ul>
              <li>you have consented to the processing;</li>
              <li>the processing is necessary to perform the contractual obligations in order to provide the Services to you, including those of our terms of service;</li>
              <li>necessary to comply with a legal obligation, a court order, or to exercise or defend legal claims;</li>
              <li>necessary to protect your vital interests or those of others;</li>
              <li>necessary in the public interest;</li>
              <li>necessary for the purposes of our or a third party's legitimate interests, such as those of visitors, users, or partners; and</li>
              <li>you have expressly made the information public.</li>
            </ul>

            <h3>Information We May Collect About You Includes:</h3>
            
            <h4>Account Information</h4>
            <p>
              You may register for an account with us (a "Services Account"). We do not require you to register to 
              use our Services. However, if you do register a Services Account, you will gain access to those areas 
              and features of the Services that require registration. We will collect certain information about you 
              in connection with your registration for a Services Account, which may include personal data and other 
              information such as a username and password.
            </p>
            <p>To register for a Services Account, we will ask you to provide:</p>
            <ul>
              <li>Your first and last name, email, company name, and password.</li>
              <li>You may optionally provide additional contact information.</li>
            </ul>

            <h4>Payment Transaction Information</h4>
            <p>
              We may collect information related to purchases made through the Services. You may provide certain 
              information to complete payments via the Services, including your credit or debit card number, card 
              expiration date, CVV code, and billing address (collectively, "Payment Information"). Please note we 
              work with Service Providers to handle payment transactions. We do not collect or maintain your credit 
              card or other financial account information; this information is handled for us by our Service Providers.
            </p>

            <h4>Correspondence Information</h4>
            <p>
              If you sign up, email us, subscribe to our newsletters or mailing lists, we may keep your message, 
              email address, and contact information to respond to your requests, provide the requested products or 
              Services, and to provide notifications or other correspondences to you. We do not share or sell any 
              personal data to other organizations for commercial purposes.
            </p>

            <h4>Support Information</h4>
            <p>
              You may provide information to us via a support request submitted through the Services. We will use 
              this information to assist you with your support request. Please do not submit any information to us 
              via a support submission, including confidential or sensitive information that you do not wish for our 
              Service Providers to have access to or use in the future.
            </p>

            <h2>4. Information Collected Automatically</h2>
            <p>
              We use automatic data collection and analytics technologies to collect aggregate and user-specific 
              information about your equipment, domain name, patterns of use, communication data and the resources 
              that you access and use on the Services, including your IP address, browsing, and navigation patterns. 
              This information is used to improve our Services.
            </p>

            <h3>Information We Collect Automatically Through Your Use of the Services Includes:</h3>

            <h4>Internet Browser Information</h4>
            <p>Your Internet browser automatically transmits certain information when you use certain Services. This may include:</p>
            <ul>
              <li>network or Internet protocol address and type of browser you are using;</li>
              <li>the type of operating system you are using;</li>
              <li>device identifiers;</li>
              <li>device settings;</li>
              <li>browser settings;</li>
              <li>the web pages of the Services you have visited;</li>
              <li>location information; and</li>
              <li>the content and advertisements you have accessed, seen, forwarded and/or clicked on.</li>
            </ul>

            <h4>Geo-location Information</h4>
            <p>
              If you are accessing our Services from a mobile device or through a mobile application, you may be 
              asked to share your precise (GPS level) geo-location information with us so we can customize your 
              experience on our Services. If you agree to such collection, in most cases, you will be able to turn 
              off such data collection at any time by accessing the privacy settings of your mobile device.
            </p>

            <h4>Desktop Application Information (Mac and Windows)</h4>
            <p>
              Our desktop applications may collect the following information to provide the employee monitoring services:
            </p>
            <ul>
              <li>Screenshots (when screenshot feature is enabled and at configured intervals)</li>
              <li>Applications currently being used and their window titles</li>
              <li>Web URLs visited (browser activity)</li>
              <li>Time you are active vs idle</li>
              <li>The operating system you are using</li>
              <li>Mouse and keyboard activity indicators (not keystrokes)</li>
              <li>The names of projects or tasks being worked on</li>
              <li>The amount of time worked on those tasks</li>
            </ul>
            
            <p>
              <strong>Important Note:</strong> TrackEx is NOT a keylogging program. We do not know what you are typing; 
              rather, TrackEx merely records whether your keyboard is active or inactive. All TrackEx screenshots are 
              uploaded via SSL encryption. We do not upload or store keystroke data. We only track activity indicators 
              (active/inactive status) for productivity measurement purposes.
            </p>

            <h4>Cookies</h4>
            <p>
              Under the laws of various countries, cookies may be served as long as individuals have provided their 
              consent, having been given clear and comprehensive information about the purposes for which their 
              personal data will be processed. You do not have to accept our cookies and you may set your browser to 
              restrict their use and you may delete them after they have been placed on your hard drive. If you do 
              not accept or delete our cookies, some areas of our websites may take more time to work, or may not 
              function properly.
            </p>

            <h4>Analytics Information</h4>
            <p>
              We use data analytics to ensure site functionality and improve the Services. We use analytics software 
              to allow us to understand the functionality of the Services. This software may record information such 
              as how often you use the Services, what happens within the Services, aggregated usage, performance data, 
              app errors and debugging information, and where the Services were downloaded from.
            </p>

            <h2>5. How TrackEx Shares Your Personal Data</h2>
            <p>
              We use the information we receive about you for the purposes described in this policy. We will not share, 
              sell, rent, or otherwise disclose your personal data to third parties without your consent or another 
              valid legal basis permitted by law.
            </p>

            <h3>We Will Share Your Information in the Following Circumstances:</h3>

            <h4>Service Providers</h4>
            <p>
              We use third parties to support our business and provide services such as receiving, processing and 
              fulfilling orders, encrypting credit card data, processing credit card payments, technical support, 
              and providing comparative performance information relative to our site ("Service Providers"). These 
              third parties have only limited access to your information and may use your information only to perform 
              these tasks on our behalf.
            </p>

            <h4>Business Transactions</h4>
            <p>
              We may purchase other businesses or their assets, sell our business assets, or be involved in a 
              bankruptcy, merger, acquisition, reorganization or sale of assets (a "Business Transaction"). Your 
              information, including personal data, may be among assets sold or transferred as part of a Business 
              Transaction.
            </p>

            <h4>Safety and Lawful Requests</h4>
            <p>
              We may be required to disclose Services user information pursuant to lawful requests, such as subpoenas 
              or court orders, or in compliance with applicable laws. We may share your information when we believe 
              it is necessary to comply with applicable laws, to protect our interests or property, to prevent fraud 
              or other illegal activity, or to protect the safety of any person.
            </p>

            <h4>Aggregated Non-Personal Data</h4>
            <p>
              We may disclose aggregated, non-personal data received from providing the Services, including information 
              that does not identify any individual, without restriction.
            </p>

            <h2>6. Your Rights</h2>
            <p>
              We seek to ensure all individuals are provided with the rights mandated by their governing jurisdiction. 
              You may benefit from a number of rights in relation to your information that we process. Some rights 
              apply only in certain limited cases, depending on your location.
            </p>

            <p>
              If you would like to manage, change, limit, or delete your personal data, you can do so by contacting 
              us at support@trackex.app. Upon request, we will provide you with information about whether we hold any 
              of your personal data.
            </p>

            <h3>For EU Data Subjects (GDPR Rights):</h3>
            <ul>
              <li>the right to access (GDPR, Article 15);</li>
              <li>the right to rectification (GDPR, Article 16);</li>
              <li>the right to erasure (GDPR, Article 17);</li>
              <li>the right to restrict processing (GDPR, Articles 18);</li>
              <li>the right to object (GDPR, Article 21);</li>
              <li>the right to data portability (GDPR, Article 20); or</li>
              <li>the right to lodge a complaint with an appropriate data privacy regulatory authority (GDPR, Article 77).</li>
            </ul>

            <h3>Employer Access to Employee Data</h3>
            <p>
              If you use TrackEx in your capacity as an employee, your employer has direct access to your data as 
              part of the monitoring service. If you are an independent contractor, the person or entity with whom 
              you contract has direct access to your data. TrackEx employees may have access to your data for testing 
              or the general improvement of our software, to notify you about changes to our website or any products 
              or services we offer or provide through it, or to fulfill the purpose for which you provided it.
            </p>

            <h2>7. Data Security</h2>
            <p>
              The security of your personal data is important to us. We take reasonable efforts to secure and protect 
              the privacy, accuracy, and reliability of your information and to protect it from loss, misuse, 
              unauthorized access, disclosure, alteration, and destruction. We implement security measures as we deem 
              appropriate and consistent with industry standards.
            </p>
            <p>
              As no data security protocol is impenetrable, we cannot guarantee the security of our systems or 
              databases, nor can we guarantee that personal data we collect about you will not be breached, 
              intercepted, destroyed, accessed, or otherwise disclosed without authorization. Accordingly, any 
              information you transfer to or from Services is provided at your own risk.
            </p>
            <p>
              Please do your part to help us keep your information secure. Services Account information is protected 
              by a password. It is important that you protect against unauthorized access to your account and 
              information by choosing your password carefully and by keeping your password and computer secure.
            </p>

            <h2>8. Data Integrity</h2>
            <p>
              TrackEx will only process personal data in a way that is compatible with and relevant for the purpose 
              for which it was collected or authorized by you. To the extent necessary for those purposes, TrackEx 
              will take reasonable steps to ensure that personal data is accurate, complete, current and reliable 
              for its intended use.
            </p>

            <h3>International Data Transfers</h3>
            <p>
              TrackEx operates from servers located in various jurisdictions. The United States, European Economic 
              Area ("EEA") Member States, and other countries all have different laws relating to privacy and data 
              protection. When your information is moved from your home country to another country, the laws and 
              rules that protect your personal data in the country to which your information is transferred may be 
              different from those in the country in which you live.
            </p>
            <p>
              If you are located outside the United States and choose to allow us to collect information about you, 
              please be aware that we may transfer your personal data to the United States and process and store it 
              there. We will transfer personal data only to those countries to which we are permitted by law to 
              transfer personal data, and we will take steps to ensure that your personal data continues to enjoy 
              appropriate protections.
            </p>

            <h2>9. Your California Privacy Rights</h2>
            <p>
              Under California Civil Code Section 1798.83 (known as the "Shine the Light" law), our Services users 
              and customers who are residents of California may request certain information about our disclosure of 
              personal data during the prior calendar year to third parties for their direct marketing purposes. To 
              make such a request, please write to us at support@trackex.app with "Request for California Privacy 
              Information" on the subject line and in the body of your message. We will comply with your request 
              within thirty (30) days or as otherwise required by the statute.
            </p>

            <h2>10. Children and Data Collection</h2>
            <p>
              TrackEx's websites and services are general audience services. TrackEx's website content is not directed 
              toward children who are under the age of 18. We do not knowingly collect personal data from children or 
              minors. If TrackEx or its Service Providers become aware that a child or minor has provided us with 
              personal data without parental consent, that information will be deleted from our databases. If you 
              have questions about personal data that may have been submitted by a child, please email us at 
              support@trackex.app.
            </p>

            <h2>11. Data Retention</h2>
            <p>
              We will retain your information only for as long as is necessary for the purposes set out in this policy, 
              for as long as an account is active or as needed to provide the Services to you. We will retain and use 
              your information to the extent necessary to comply with our legal obligations, resolve disputes, enforce 
              our agreements, and as otherwise described in this policy.
            </p>
            <p>
              We may delete your personal data from our systems as part of a data retention plan. Following termination 
              or deactivation of a Services Account, we may retain your information and content for a commercially 
              reasonable time for backup, archival, and audit purposes.
            </p>

            <h2>12. Updates</h2>
            <p>
              TrackEx may update this privacy policy from time to time, and you should take the time to review it each 
              time that you visit one of our Services. The most current version of this privacy policy will govern our 
              use of your information and will be located at https://www.trackex.app/legal/privacy. We will notify you 
              of material changes to this policy by posting a notice at the Services or by emailing you notifying you 
              of the changes.
            </p>

            <hr className="my-8" />

            <p className="text-sm text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at support@trackex.app.
            </p>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
