import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { generateMetadata as generateSEOMetadata } from "@/lib/seo"

export const metadata = generateSEOMetadata({
  title: "Terms of Service",
  description: "TrackEx Terms of Service - Read our terms and conditions for using TrackEx employee monitoring software. Includes data processing addendum and service level agreement.",
  url: "/legal/terms",
  keywords: "trackex terms of service, employee monitoring terms, software agreement, data processing terms",
})

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <h1>TrackEx Terms of Service</h1>
            <p className="text-muted-foreground">Last Updated: January 12, 2026</p>
            
            <p>
              TrackEx Technologies Ltd ("TrackEx," "we," "us," or "our") provides the Service to You in accordance 
              with and subject to the following Terms of Service (these "Terms").
            </p>
            
            <p>
              By accessing or using this Service, you signify that you acknowledge, accept, and agree with all 
              the terms of service as well as our acceptable use policy and privacy policy. Please do not use 
              or access this Service if you disagree with any part of these terms.
            </p>
            
            <p>
              TrackEx will provide the Service, and you may access and use the Service, in accordance with this 
              Agreement. If you order the Service through an online registration page or an order form (each an 
              "Order Form"), the Order Form may contain additional terms and conditions and information regarding 
              the Service you are ordering.
            </p>

            <h2>1. Definitions</h2>
            <p>The following definitions apply to these Terms:</p>
            <ul>
              <li><strong>"Affiliate"</strong> means any entity that directly or indirectly controls, is controlled by, or is under common control with the subject entity.</li>
              <li><strong>"Authorized Affiliate"</strong> means any of Customer's Affiliate(s) which (a) is subject to the data protection laws and regulations of the European Union, the European Economic Area and/or their member states, Switzerland and/or the United Kingdom, and (b) is permitted to use the Services pursuant to the Agreement between Customer and TrackEx.</li>
              <li><strong>"Control"</strong> for purposes of this definition, means direct or indirect ownership or control of more than 50% of the voting interests of the subject entity.</li>
              <li><strong>"Controller"</strong> means the natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of Personal Data.</li>
              <li><strong>"Customer Data"</strong> means what is defined in the Agreement as "Customer Data" or "Your Data."</li>
              <li><strong>"Data Protection Laws and Regulations"</strong> means all laws and regulations, including laws and regulations of the European Union, the European Economic Area and their member states, Switzerland and the United Kingdom, applicable to the Processing of Personal Data under the Agreement.</li>
              <li><strong>"Data Subject"</strong> means the identified or identifiable person to whom Personal Data relates.</li>
              <li><strong>"Personal Data"</strong> means any information relating to (i) an identified or identifiable natural person and, (ii) an identified or identifiable legal entity (where such information is protected similarly as personal data or personally identifiable information under applicable Data Protection Laws and Regulations), where for each (i) or (ii), such data is Customer Data.</li>
              <li><strong>"Processing"</strong> means any operation or set of operations which is performed upon Personal Data, whether or not by automatic means, such as collection, recording, organization, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure or destruction.</li>
              <li><strong>"Processor"</strong> means the entity which Processes Personal Data on behalf of the Controller.</li>
              <li><strong>"Service"</strong> refers to all software, websites, desktop applications, and related services provided to you by TrackEx.</li>
              <li><strong>"Sub-processor"</strong> means any Processor engaged by TrackEx or a member of the TrackEx Group.</li>
              <li><strong>"Supervisory Authority"</strong> means an independent public authority which is established by an EU Member State pursuant to the GDPR.</li>
              <li><strong>"You," "Your," or "User"</strong> refers to anyone accessing or subject to the Service.</li>
            </ul>

            <h2>2. License for Use of the Service; Identity Authentication</h2>
            <p>
              The Service is licensed for use only under these Terms. TrackEx reserves all rights not expressly 
              granted to you, including title and exclusive ownership of the Service, any and all software or 
              updates thereto and source code for the Service. Upon registering for the Service, TrackEx gives 
              you the right to install the Service for use by the total number of Users you identify and authorize.
            </p>
            <p>
              The Service may not be used or accessed by (a) individuals who are not named individuals; or (b) 
              any other software or hardware device that does not require a named individual to use or access it. 
              A named individual means an individual identified by you by name who is authorized to use the Service, 
              regardless of how such access occurs or if such individual uses any hardware or software that reduces 
              the apparent number of users who are using the Service.
            </p>
            <p>
              TrackEx reserves the right at any time to require you to provide a list of the named individual(s). 
              You may not rent, lease, lend, sell, redistribute or sublicense the Service. These Terms will govern 
              any upgrades provided by TrackEx that replace and/or supplement the original Service. You agree to 
              use your best efforts to protect the Service and upgrades from unauthorized use, reproduction, 
              distribution, publication or alteration.
            </p>

            <h2>3. Installation, Customization, and Updates</h2>
            <p>
              Installation of the Service and any required modification of the Service to accommodate your computer 
              system must be performed by you. All updates, upgrades, enhancements and modifications to the Service 
              MUST be performed by TrackEx. Such updates include any changes or improvements to the Service, whether 
              arising out of the Service's particular configuration for your use or otherwise.
            </p>
            <p>
              At all times while these Terms are in effect, you shall allow TrackEx to install all updates. Failure 
              to allow TrackEx to install updates may affect the functionality of the Service and may terminate 
              certain warranties for any purpose related to the Service.
            </p>

            <h2>4. Fees</h2>
            <h3>4.1 License Fees</h3>
            <p>
              In consideration for the right to use the Service under the terms herein, you will pay license fees 
              in the amount and payment terms under the applicable Order Form (the "License Fees"). You agree that 
              in the event TrackEx is unable to collect the License Fees owed to TrackEx for the Service, TrackEx 
              may take any other steps it deems necessary to collect such fees from you and that you will be 
              responsible for all costs and expenses incurred by TrackEx in connection with such collection activity, 
              including collection fees, court costs and attorneys' fees.
            </p>
            <p>
              Except to the extent otherwise expressly stated in this Agreement or in an order form, all obligations 
              to pay License Fees are non-cancelable and all payments are non-refundable.
            </p>
            
            <h3>4.2 Taxes</h3>
            <p>
              Your License Fees are exclusive of taxes, levies, duties or similar governmental assessments of any 
              kind (excluding taxes based on TrackEx's income, property and employees). You will be responsible 
              for paying any and all such taxes.
            </p>
            
            <h3>4.3 Price Changes</h3>
            <p>
              TrackEx reserves the right to modify the License Fees for the Service under one or more Order Forms, 
              effective upon commencement of the next renewal subscription term of the relevant Order Form(s), by 
              notifying you of such change in writing at least 30 days before the end of the then-current 
              Subscription Term.
            </p>

            <h2>5. Term & Termination</h2>
            <h3>5.1 Initial Term</h3>
            <p>
              The initial subscription term of the Agreement will be as set forth and agreed by the parties in 
              the Order Form.
            </p>
            
            <h3>5.2 Termination for Cause</h3>
            <p>
              Either of you and TrackEx may terminate this Agreement if the other party (i) materially breached 
              this Agreement and has not cured such breach within 30 days after receiving notice (if curable), 
              without prejudice and in addition to any right or remedy that the non-defaulting party may have 
              under this Agreement or the applicable law, or (ii) becomes the subject of a petition in bankruptcy 
              or any other proceeding relating to insolvency, receivership, liquidation or assignment for the 
              benefit of creditors.
            </p>
            
            <h3>5.3 Automatic Renewal</h3>
            <p>
              At the end of the initial subscription term, all your TrackEx subscriptions (including any additional 
              subscriptions added to your account) will renew automatically for an additional term length equal to 
              your initial subscription term unless you or TrackEx notifies the other in writing, at least 30 days 
              prior to the end of the then-current subscription term, that it chooses not to renew.
            </p>
            
            <h3>5.4 Effect of Termination</h3>
            <p>
              Upon termination or expiration of this Agreement: (a) you will cease use of the Service and all 
              rights granted to you under this Agreement will terminate; (b) upon written request, we will make 
              your data available for you to download or export within 30 days following such termination. 
              Thereafter, TrackEx will be under no obligation to maintain your data, or make it available to 
              you and TrackEx may delete any of your Content.
            </p>
            
            <h3>5.5 Refunds</h3>
            <p>
              In the event of a termination due to uncured breach by TrackEx, TrackEx will refund the remaining 
              Subscription Fees until the end of the Subscription Term.
            </p>

            <h2>6. Proprietary Nature of the Service</h2>
            <p>
              The Service and Platform are proprietary to, and valuable trade secrets of TrackEx. You acknowledge 
              the Service contains proprietary content, information and material that is protected by applicable 
              intellectual property and other laws, including, but not limited to, copyright, trademark, and 
              service marks, and that you will only use such proprietary content, information, or materials for 
              permitted uses under these Terms.
            </p>
            <p>
              The Service is entrusted to you only for the purposes set forth in these Terms. You will not reverse 
              engineer, duplicate, translate, modify, copy, printout, disassemble, decompile or otherwise tamper 
              with the Service or any software provided therewith. The parties acknowledge that any violation of 
              this provision will cause irreparable harm to TrackEx.
            </p>

            <h2>7. Confidentiality</h2>
            <h3>7.1 Confidential Information</h3>
            <p>
              "Confidential Information" means all information provided by a party to other party, whether orally 
              or in writing, that is designated as confidential or that reasonably should be understood to be 
              confidential given the nature of the information and the circumstances of disclosure, and excluding 
              any information that was or has become publicly available without the receiving party's actions or 
              inactions. TrackEx confidential information includes, without limitation, the Service's features, 
              functionality and performance. Your Confidential Information includes, without limitation, the Content.
            </p>
            
            <h3>7.2 Protection of Confidential Information</h3>
            <p>
              Each party will hold the other party's Confidential Information in strict confidence, use it only 
              subject to the terms of this Agreement, allow its use only by the receiving party's employees and 
              consultants who have signed in advance a confidentiality agreement containing terms similar to this 
              Agreement and on a need-to-know basis, not make the other party's Confidential Information available 
              to any third party unless to the extent required by applicable law, implement adequate security 
              measures to ensure against unauthorized access, and notify the other party in writing of any misuse 
              or misappropriation.
            </p>

            <h2>8. Consent to Use of Data</h2>
            <p>
              You agree that TrackEx may collect and use technical data and User information as described in its 
              Privacy Policy, including, but not limited to, technical information about your device, system and 
              application software, and peripherals, that is gathered periodically to facilitate the provision of 
              customization, updates, and other services to you related to the Service.
            </p>
            <p>
              TrackEx may use this information to improve the Service or to provide services or technologies to 
              you. TrackEx treats personally identifiable information differently from general information. 
              TrackEx may convert personally identifiable information into general information by excluding 
              information that is personally identifiable.
            </p>

            <h2>9. Content and Linking to Other Websites</h2>
            <p>
              The Service may enable access to third-party websites (collectively, the "Websites"). By using the 
              Service, you acknowledge and agree that TrackEx is not responsible for examining or evaluating the 
              content, accuracy, completeness, timeliness, validity, copyright or trademark compliance, legality, 
              decency, quality or any other aspect of the Websites.
            </p>
            <p>
              TrackEx does not warrant or endorse and does not assume and will not have any liability or 
              responsibility to you or any other person for any data and materials on the Websites. To the extent 
              you choose to access such Websites, you do so at your own initiative and are responsible for 
              compliance with any applicable laws.
            </p>

            <h2>10. User Content</h2>
            <p>
              You agree that all information, data, text, sound, photographs, graphics, video, software, or other 
              materials submitted, posted or displayed by you on or through the Service ("User Content") is your 
              sole responsibility. TrackEx claims no ownership or control over any User Content. By submitting, 
              posting or displaying User Content on or through the Service, you grant TrackEx a worldwide, 
              non-exclusive, royalty-free, transferable license to use, reproduce, and adapt such User Content 
              to provide the Service to you.
            </p>

            <h2>11. Intellectual Property Rights</h2>
            <h3>Trademarks</h3>
            <p>
              The trademarks, trade names, trade dress, logos, and service marks (collectively, the "Trademarks") 
              displayed on trackex.app are the registered and/or unregistered Trademarks of TrackEx Technologies Ltd, 
              or such other third party that may own the displayed Trademarks. Nothing contained on this website or 
              in these terms of service grants to you, by implication or otherwise, any license or right to use any 
              Trademarks displayed on this website without the written permission of TrackEx Technologies Ltd.
            </p>
            
            <h3>Copyright</h3>
            <p>
              The text, Trademarks, logos, images, graphics, photos, video files, application functionality, or any 
              other digital media, and their arrangement on this Website ("Website Content") are all subject to 
              patent, copyright, trademark and other intellectual property protection. Website Content may not be 
              copied for commercial use or redistribution, nor may Website Content be modified, processed, or 
              reposted to other websites.
            </p>

            <h2>12. Disclaimer of Warranty</h2>
            <p>
              YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT USE OF THE SERVICE IS AT YOUR SOLE RISK. TRACKEX CANNOT AND 
              DOES NOT WARRANT THE SERVICE WILL MEET YOUR REQUIREMENTS, THAT THE OPERATION OF THE SERVICE WILL BE 
              UNINTERRUPTED OR ERROR-FREE, OR THAT DEFECTS IN THE SERVICE WILL BE CORRECTED. AS SUCH, YOU SHALL NOT 
              RELY EXCLUSIVELY ON THE SERVICE FOR ANY REASON.
            </p>
            <p>
              THE SERVICE AND ANYTHING RELATED THERETO ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITH ALL FAULTS AND 
              WITHOUT WARRANTY OF ANY KIND, AND TRACKEX HEREBY DISCLAIMS ALL WARRANTIES AND CONDITIONS WITH RESPECT 
              TO THE SERVICE AND ANYTHING RELATED THERETO, EITHER EXPRESS, IMPLIED OR STATUTORY, INCLUDING, BUT NOT 
              LIMITED TO, THE IMPLIED WARRANTIES AND/OR CONDITIONS OF MERCHANTABILITY, OF SATISFACTORY QUALITY, OF 
              FITNESS FOR A PARTICULAR PURPOSE, OF ACCURACY, OF QUIET ENJOYMENT, AND NON-INFRINGEMENT OF THIRD PARTY 
              RIGHTS.
            </p>

            <h2>13. Privacy and Cybersecurity Indemnification</h2>
            <p>
              You agree that the TrackEx Services and Platform are used to process information and Personal Data 
              that you provide on an individual basis or by way of a transfer by a business entity under these Terms, 
              and for purposes of these Terms you are designated the data Controller and TrackEx is designated as 
              Processor as those terms are defined in the General Data Protection Regulation (EU) 2016/679 of the 
              European Parliament and of the Council ("GDPR").
            </p>
            <p>
              To the fullest extent permitted by law for all Personal Data that you collect, process via the Services 
              or maintain on the Platform, you shall indemnify and hold TrackEx, its affiliates, and their respective 
              officers, directors, trustees, shareholders, employees, and agents harmless from and against any and 
              all damages and liabilities or third party claims.
            </p>

            <h2>14. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY LAW, (i) UNDER NO CIRCUMSTANCES WILL EITHER PARTY BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY OR CONSEQUENTIAL DAMAGES; IN EACH CASE, INCLUDING BUT NOT 
              LIMITED TO, DAMAGES FOR LOSS OF PROFITS, EVEN IF THE PARTIES HAVE BEEN ADVISED OF THE POSSIBILITY OF 
              SUCH DAMAGES, WHETHER BASED ON CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY OR OTHERWISE; AND (ii) 
              EITHER PARTY'S AGGREGATE LIABILITY TO THE OTHER PARTY ARISING OUT OF OR RELATED TO THIS AGREEMENT OR 
              THE SERVICE WILL NOT EXCEED THE FEES ACTUALLY RECEIVED BY TRACKEX FROM YOU UNDER THIS AGREEMENT DURING 
              THE 12 MONTHS PRECEDING THE APPLICABLE CLAIM.
            </p>

            <h2>15. Consent to Electronic Communications</h2>
            <p>
              By registering to use the Service or Platform, or by sending us emails, faxes, push notifications, or 
              text or voice messages, you are communicating with us electronically. And in doing so, you expressly 
              consent to receive communications from us electronically via email, fax, push notification, or voice 
              or text message. We will communicate with you by the aforementioned means, or by posting notices on 
              the Services or Platform.
            </p>

            <h2>16. International Users Consent to Cross-Border Transfers</h2>
            <p>
              For those TrackEx users located outside the United States, you acknowledge and expressly consent to 
              TrackEx's use of your Personal Data and further acknowledge that TrackEx's processing of Personal Data 
              is required to perform the Services or use the Platform. By providing us with your Personal Data, you 
              are consenting to our use of it in accordance with these Terms, including the transfer of your 
              information across international boundaries.
            </p>

            <h2>17. No Rights Granted; Non-Assignability</h2>
            <p>
              These Terms do not constitute a grant or an intention or commitment to grant any right, title, or 
              interest in the Service or TrackEx's trade secrets to you. You may not sell or transfer any portion 
              of the Service to any third party. You shall not identify the Service as coming from any source other 
              than TrackEx. These Terms are exclusive and personal to you. You shall not assign or otherwise 
              transfer any rights or obligations under these Terms.
            </p>

            <h2>18. Jurisdiction & Choice of Law</h2>
            <h3>Jurisdiction</h3>
            <p>
              This Agreement will be governed by laws of the State of Delaware, USA without regard to its choice of 
              law or conflicts of law principles. You and TrackEx consent to the exclusive jurisdiction and venue in 
              the courts in Delaware, USA, except that temporary relief to enjoin infringement of intellectual 
              property rights may be sought in any court where such infringement has occurred.
            </p>
            
            <h3>Choice of Law</h3>
            <p>
              Regardless of the place of execution, delivery, performance or any other aspect of these Terms, these 
              Terms and all of the rights of the parties under these Terms shall be governed by, construed under, 
              and enforced in accordance with the procedural and substantive law of the State of Delaware, United 
              States of America.
            </p>
            
            <h3>General Indemnity</h3>
            <p>
              You agree to indemnify and hold TrackEx and (as applicable) its related entities, affiliates, and 
              TrackEx's and their respective officers, directors, agents, and employees, harmless from and against 
              any and all claims, demands, proceedings, losses and damages of every kind and nature, including 
              reasonable attorney fees, made by any third party due to or arising out of your breach of these Terms 
              or your violation of any law or the rights of any third party.
            </p>

            <h2>19. Suggestions and Feedback</h2>
            <p>
              TrackEx welcomes feedback or inquiries about the Service. If you elect to provide any feedback or 
              comments of any nature to TrackEx, all feedback and comments shall be the sole and exclusive property 
              of TrackEx, and TrackEx shall have the right to use such feedback in any manner and for any purpose in 
              its exclusive discretion without remuneration, compensation, or attribution to you.
            </p>

            <h2>20. Legal Notice</h2>
            <p>
              TrackEx may modify these Terms or any additional terms, and such modification shall be effective and 
              binding on you upon notice by TrackEx via email to the email account provided by you upon registration 
              for the Service. If you do not agree to any modification of these Terms, you should discontinue your 
              use of the Service.
            </p>
            <p>
              You may provide notice to TrackEx at:<br />
              TrackEx Technologies Ltd<br />
              www.trackex.app<br />
              support@trackex.app
            </p>

            <h2>21. Minimum Age of Users</h2>
            <p>
              All Users of TrackEx's Service must be at least 18 years of age and older than the age of legal 
              majority in your jurisdiction (if it is over 18). By using the Service you promise that you are over 
              18 years of age and are a competent legal adult in your jurisdiction.
            </p>

            <h2>22. Use of Client Logos and Business Names</h2>
            <p>
              Your use of our website, software and services is your consent to allow TrackEx to use your business 
              name and business logos for TrackEx promotional purposes, unless you explicitly opt-out by contacting 
              us. TrackEx will only use this information as it relates to your use of our services within the scope 
              of this Terms of Use.
            </p>

            <hr className="my-8" />

            <h2>Personal Data Processing Addendum</h2>
            <p>
              This Personal Data Processing Addendum ("PDPA") addresses Personal Data Processing, privacy and cyber 
              security obligations in addition to those expressed in the Terms as between TrackEx and Customer for 
              subscriptions to the TrackEx Services and Platform. By agreeing to these Terms, Customer acknowledges 
              that it and its Authorized Affiliates qualify as the "Controller" as defined under General Data 
              Protection Regulation (EU) 2016/679 of the European Parliament and of the Council ("GDPR") to the 
              extent that TrackEx processes Personal Data in connection with Customer's subscription to Platform.
            </p>

            <h3>Processing of Personal Data</h3>
            <p>
              The parties acknowledge and agree that with regard to the Processing of Personal Data, Customer is the 
              Controller, TrackEx is the Processor and that TrackEx may engage Sub-processors in connection with the 
              provision of the Services. TrackEx shall treat Personal Data as Confidential Information and shall only 
              Process Personal Data on behalf of and in accordance with Customer's documented instructions.
            </p>

            <h3>Rights of Data Subjects</h3>
            <p>
              TrackEx shall, to the extent legally permitted, promptly notify Customer if TrackEx receives a request 
              from a Data Subject to exercise the Data Subject's rights. Taking into account the nature of the 
              Processing, TrackEx shall assist Customer by appropriate technical and organizational measures, insofar 
              as this is possible, for the fulfilment of Customer's obligation to respond to a Data Subject Request 
              under Data Protection Laws and Regulations.
            </p>

            <h3>Security</h3>
            <p>
              Customer shall be responsible for obtaining and maintaining any equipment and ancillary services needed 
              to connect to, access or otherwise use the Services. Customer shall also be responsible for maintaining 
              the security of the Equipment, Customer account, passwords and files. TrackEx will maintain reasonable 
              physical and technical safeguards to prevent unauthorized disclosure of or access to Content, in 
              accordance with industry standards.
            </p>

            <h3>Return and Deletion of Customer Data</h3>
            <p>
              TrackEx shall return Customer Data to Customer and, to the extent allowed by applicable law, delete 
              Customer Data upon request within 30 days following such request.
            </p>

            <h3>Limitation of Liability</h3>
            <p>
              Each party's and all of its Affiliates' liability, taken together in the aggregate, arising out of or 
              related to this PDPA is subject to the 'Limitation of Liability' section of Terms.
            </p>

            <h3>GDPR Compliance</h3>
            <p>
              TrackEx will Process Personal Data in accordance with the GDPR requirements directly applicable to 
              TrackEx's provision of its Services. Upon Customer's request, TrackEx shall provide Customer with 
              reasonable cooperation and assistance needed to fulfill Customer's obligation under the GDPR to carry 
              out a data protection impact assessment related to Customer's use of the Services.
            </p>

            <hr className="my-8" />

            <p className="text-sm text-muted-foreground">
              If you have any questions about these Terms of Service, please contact us at support@trackex.app.
            </p>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
