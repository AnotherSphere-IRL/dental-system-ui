**PROCESS DOCUMENTATION**

| 1\. Information |  |
| :---- | :---- |
| **Process Name:** | Service Price List Management |
| **Process Owner:** | Clinic Doctor / Clinic Owner  |
| **Department/Unit:** | Billing & Financial Management  |
| **Document Prepared By:** | Trjistan Rieniel R. Bendoy |
| **Date Prepared:** | September 23, 2026  |
| **Version Number:** | 1.0 |
| **Last Updated:** | September 23, 2026  |

| 2\. Overview |
| :---- |
| **Purpose:** To maintain the master reference data for dental service prices by category.  |
| **Process Description:** This module manages the official list of services and their corresponding prices.  |

 

| 3\. Inputs |
| :---- |
|   1\. Service Categories – Clinic Doctor / Admin 2\. Service Names – Clinic Doctor / Admin 3\. Service Prices – Clinic Doctor / Admin 4\. Effective Dates – Admin 5\. Authorization – Role-Based Access Control  |

 

| 4\. Activities |
| :---- |
|   1\. Log in as authorized user. 2\. Create or select a service category. 3\. Add or edit service name and price. 4\. Set effectivity date. 5\. Save and validate entry. 6\. Publish updated price list. 7\. Record change in audit log.  |

 

| 5\. Outputs |
| :---- |
|   1\. Master Service Price List 2\. Service Catalog by Category 3\. Price Update Audit Log  |

 

| 6\. Stakeholders Analysis |
| :---- |
| **Internal:** Doctor / Clinic Owner, IT Department |
| **External:** Patients, Payment Gateway Provider, Accountant / Auditor  |

| 7\. Flow Summary |
| :---- |
|   **Start** → Authorized user logs in → Create/update service category → Encode service name and price → Save → Validate → Publish price list → Audit log → **End**  |

 

| 8\. Performance Metrics |  |
| :---- | :---- |
| **Price Update Time:** | Manual (Target: Less than 5 min)  |
| **Price Accuracy:**  | Prone to outdated entries (Target: 99%+)  |
| **Unauthorized Changes:** | Difficult to track (Target: 0% via RBAC \+ Audit Log) |

 

| 9\. Issues and Challenges |
| :---- |
| No centralized price reference, Prices may be outdated or inconsistent, Manual references are prone to errors, Limited audit trail for price changes. |

 

| 10\. Improvement Opportunities |
| :---- |
|   Centralized digital price catalog. Role-Based Access Control for price editing, Version history and audit logs, Integration with Payment Processing Module.  |

| 11\. Automation Potential |
| :---- |
| Master data management for services and prices, Automatic price retrieval during payment processing, Audit logging of all price changes. |

| 12\. Business Process Lifecycle Analysis |  |
| :---- | :---- |
| **Design** | Define service categories and price structure.  |
| **Execution** | Admin encodes and updates service prices.  |
| **Monitoring** | Track price changes and usage. |
| **Analysis** | Identify outdated or missing services |
| **Optimization** | Automate price updates and integration with billing |

 

| 13\. Evaluation and Recommendation |
| :---- |
|   This module is the foundation of the billing process. It should be implemented first to ensure that all payment and reporting modules reference a single, accurate, and secure price list. |

## **Prepared By:                                                  	Approved By:**

   
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_                   	\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_   	\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Trjistan Rieniel R. Bendoy               Dra. Rocsanne Kathleen Beltran               Sam Espino Jr. 

      Project Member                                          Dentist Professor 

**PROCESS DOCUMENTATION**

| 1\. Information |  |
| :---- | :---- |
| **Process Name:** | Payment Processing Management |
| **Process Owner:** | Clinic Doctor / Clinic Owner |
| **Department/Unit:** | Billing & Financial Management |
| **Document Prepared By:** | Trjistan Rieniel R. Bendoy |
| **Date Prepared:** | September 23, 2026 |
| **Version Number:** | 1.0 |
| **Last Updated:** | September 23, 2026 |

| 2\. Overview |
| :---- |
| **Purpose:** To process and record patient payments, including online reservation fees and in-clinic payments, and to update the patient’s financial ledger.  |
| **Process Description:** This module records and manages patient payments by retrieving the applicable amount, processing online or manual payments, validating transactions, and updating patient balances and sends transaction data to the Income & Expense Reporting module.  |

| 3\. Inputs |
| :---- |
|  1\. Appointment / Reservation \- Appointment & Scheduling Module 2\. Service Price List \- Service Price List Management Module 3\. Payment Amount \- Patient 4\. Payment Method \- Cash, GCash, Maya & Bank Transfer 5\. Payment Gateway Response \-GCash/Maya Business, Merchant 6\. Authorization \- Role-Based Access Control |

| 4\. Activities |
| :---- |
| 1\. Retrieve applicable service price or reservation fee 2\. Select payment method 3\. Process payment online  4\. Update patient balance 5\. Log transaction in audit trail 6\. Send payment confirmation to patient |

| 5\. Outputs |
| :---- |
|  1\. Payment Record 2\. Updated Patient Balance 3\. Transaction Audit Log 4\. Payment Data for Income and Expense Reporting |

| 6\. Stakeholders Analysis |
| :---- |
| **Internal:** Doctor / Clinic Owner, IT Department, Admin / Staff |
| **External:** Patients, Payment Gateway Provider, Accountant / Auditor |

| 7\. Flow Summary |
| :---- |
| **Start** → Patient avails service or books appointment → System retrieves amount → Patient pays → System processes payment → Update patient balance → Notify patient → **End**  |

| 8\. Performance Metrics |  |
| :---- | :---- |
| **Payment Processing time:** | 5-10 mins (Target: less than 2 mins) |
| **Payment Recording Accuracy:** | 90% (Target: 99%+) |
| **Reconciliation Errors:** | Common (Target: less than 1%) |

| 9\. Issues and Challenges |
| :---- |
|  Payments are recorded manually on paper, Difficulty in reconciling payments, Risk of unverified or lost payments,  Limited remote visibility of payment status.  |

| 10\. Improvement Opportunities |
| :---- |
|  Online payment for reservation fees, Integration with payment gateways.  |

| 11\. Automation Potential |
| :---- |
|  Merchant, Maya/GCash Business integration, Automated payment validation, Real-time balance updates  |

| 12\. Business Process Lifecycle Analysis |  |
| :---- | :---- |
| **Design** | Define payment rules, methods, validation flow |
| **Execution** | Process online and in-clinic payments |
| **Monitoring** | Track payment success, failures, and balances. |
| **Analysis** | Identify payment bottlenecks and reconciliation issues |
| **Optimization** | Automate payment validation and reporting. |

| 13\. Evaluation and Recommendation |
| :---- |
| This module is a priority for automation because it directly replaces manual payment recording. It should support both online and manual payments to accommodate all patient types. |

## 

## **Prepared By:				Approved By:**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_		\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_	\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Trjistan Rieniel R. Bendoy               Dra. Rocsanne Kathleen Beltran               Sam Espino Jr. 

      Project Member                                          Dentist Professor 

**PROCESS DOCUMENTATION**

| 1\. Information |  |
| :---- | :---- |
| **Process Name:** | Expense Recording |
| **Process Owner:** | Clinic Doctor / Clinic Owner |
| **Department/Unit:** | Billing & Financial Management |
| **Document Prepared By:** | Trjistan Rieniel R. Bendoy |
| **Date Prepared:** | September 23, 2026 |
| **Version Number:** | 1.0 |
| **Last Updated:** | September 23, 2026 |

| 2\. Overview |
| :---- |
| **Purpose:** To record business expenses and store entry details for financial monitoring and reporting.  |
| **Process Description:** This module allows authorized staff to digitally record clinic expenses such as supplies, utilities, rent, and other operational costs. Each entry includes date, category, amount, payee, payment method, and supporting receipt. The data feeds into the Income & Expense Reporting module.  |

| 3\. Inputs |
| :---- |
|  1\. Expense Name/Description  2\. Expense Category 3\. Expense Date 4\. Amount 5\. Payee/Supplier 6\. Payment Method 7\. Receipt/ Supporting Document 8\. Authorization  |

| 4\. Activities |
| :---- |
| 1\. Log in as an authorized user. 2\. Enter expense details and select expense category 3\. Attach receipt or supporting document. 4\. Select expense category. 5\. Save entry. 6\. System records expense in ledger. 7\. Include in income and expense reports 8\. Log change in audit trail.  |

| 5\. Outputs |
| :---- |
|  1\. Expense Entry Record 2\. Expense Data for Income and Expense  Reporting 3\. Digital Receipt Attachment |

| 6\. Stakeholders Analysis |
| :---- |
| **Internal:** Doctor  /Clinic Owner, IT Department, Finance Staff, Accountant |
| **External:** Suppliers, Government Agencies, Auditor |

| 7\. Flow Summary |
| :---- |
| **Start** → Staff logs in → Enter expense details and select category → Attach receipt → Save → System records → Include in reports → Audit log → **End**  |

| 8\. Performance Metrics |  |
| :---- | :---- |
| **Expense Entry Time:** | 5-10 mins (Target: less than 2 mins) |
| **Reporting Accuracy** | Manual (Target: 99%+) |

| 9\. Issues and Challenges |
| :---- |
| Manual aggregation is slow, No centralized expense record, Difficulty in tracking expenses by category |

| 10\. Improvement Opportunities |
| :---- |
|  Digital Expense Log, Auto-categorization, Integration with reporting. |

| 11\. Automation Potential |
| :---- |
|  Digital expense entry, Automated report integration |

| 12\. Business Process Lifecycle Analysis |  |
| :---- | :---- |
| **Design** | Define expense categories and entry fields |
| **Execution** | Staff records expenses |
| **Monitoring** | Track expense by category |
| **Analysis** | Identify spending trends |
| **Optimization** | Automate expense reporting |

| 13\. Evaluation and Recommendation |
| :---- |
| This module improves financial visibility. It should be implemented with proper RBAC and audit logging to prevent unauthorized expense entries.   |

## **Prepared By:				Approved By:**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_		\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_	\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Trjistan Rieniel R. Bendoy               Dra. Rocsanne Kathleen Beltran               Sam Espino Jr. 

      Project Member                                          Dentist Professor 

**PROCESS DOCUMENTATION**

| 1\. Information |  |
| :---- | :---- |
| **Process Name:** | Refund and Fee Adjustment |
| **Process Owner:** | Clinic Doctor / Clinic Owner  |
| **Department/Unit:** | Billing & Financial Management  |
| **Document Prepared By:** | Trjistan Rieniel R. Bendoy |
| **Date Prepared:** | September 23, 2026 |
| **Version Number:** | 1.0 |
| **Last Updated:** | September 23, 2026 |

 

| 2\. Overview |
| :---- |
| **Purpose:** To record manual financial adjustments and adjust patient balance post-billing.  |
| **Process Description:** This module handles refunds and fee adjustments when a patient cancels, overpays, or is granted a discount or correction. It requires authorization, reason, and supporting documentation. It updates the patient’s balance and maintains an audit trail.  |

| 3\. Inputs |
| :---- |
|   1\. Patient Record – System 2\. Original Payment Record – Payment Processing Module 3\. Reason for Adjustment – Doctor / Staff 4\. Adjustment Amount – Doctor / Staff 5\. Supporting Document – Staff 6\. Authorization – Role-Based Access Control |

 

| 4\. Activities |
| :---- |
|   1\. Request refund or fee adjustment. 2\. Review original payment and reason. 3\. Approve or reject request. 4\. Record adjustment. 5\. Update patient balance. 6\. Generate adjustment receipt or record. 7\. Log in audit trail. 8\. Notify patient if applicable. |

 

| 5\. Outputs |
| :---- |
|   1\. Refund / Adjustment Record 2\. Updated Patient Balance 3\. Supporting Documentation 4\. Audit Log |


| 6\. Stakeholders Analysis |
| :---- |
| **Internal:** Doctor / Clinic Owner, IT Department, Finance Staff |
| **External:** Patients, Payment Gateway Provider, Auditor  |

| 7\. Flow Summary |
| :---- |
|   **Start** → Request adjustment → Review → Approve/Reject → Record adjustment → Update balance → Notify → Audit log → **End**  |

 

| 8\. Performance Metrics |  |
| :---- | :---- |
| **Processing Time:** | 10-20 minsl (Target: less than 5 mins) |
| **Approval Accuracy:** | Manual (Target: 99%+) |
| **Audit Compliance:** | Low(Target: 100%) |

 

| 9\. Issues and Challenges |
| :---- |
|   Manual adjustments are hard to track, No standard approval workflow, Risk of unauthorized adjustments, Disputes due to lack of records.   |

 

| 10\. Improvement Opportunities |
| :---- |
|   Digital approval workflow, RBAC for approvals, Automatic balance update, Audit trail for all adjustments. |

 

| 11\. Automation Potential |
| :---- |
|   Approval workflow automation, Balance recalculation, Audit logging, Notification to patient.  |

| 12\. Business Process Lifecycle Analysis |  |
| :---- | :---- |
| **Design** | Define adjustment rules and approval levels.  |
| **Execution** | Process refunds and adjustments.  |
| **Monitoring** | Track adjustments and approvals.  |
| **Analysis** | Identify frequent adjustment causes.  |
| **Optimization** | Automate approval and balance updates.  |

 

| 13\. Evaluation and Recommendation |
| :---- |
|   This module ensures financial corrections are properly documented. It should be integrated with Payment Processing and Outstanding Balance Monitoring.  |

## **Prepared By:                                                  	Approved By:**

   
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_                   	\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_   	\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Trjistan Rieniel R. Bendoy               Dra. Rocsanne Kathleen Beltran               Sam Espino Jr. 

      Project Member                                          Dentist Professor 

**PROCESS DOCUMENTATION**

| 1\. Information |  |
| :---- | :---- |
| **Process Name:** | Outstanding Balance Monitoring Process  |
| **Process Owner:** | Clinic Doctor / Clinic Owner  |
| **Department/Unit:** | Billing & Financial Management  |
| **Document Prepared By:** | Trjistan Rieniel R. Bendoy |
| **Date Prepared:** | September 12, 2026 |
| **Version Number:** | 2.0 |
| **Last Updated:** | September 23, 2026 |

 

| 2\. Overview |
| :---- |
| **Purpose:** To auto-flag accounts with overdue balances, show patients if they have an amount due within the day, and automatically send reminders to patients about their outstanding balance.  |
| **Process Description:** This module continuously monitors patient ledgers and due dates. When a balance becomes overdue, the system flags the account and alerts authorized staff. It also provides a patient-visible view where the patient can see if they have an amount to pay within the current day.  |

| 3\. Inputs |
| :---- |
|   1\. Patient Ledger \- Payment Processing Module 2\. Payment Records \- Payment Processing Module 3\. Due Dates \- Billing Rules |

 

| 4\. Activities |
| :---- |
|   1\. Monitor patient balances 2\. Compare due dates 3\. Flag overdue accounts. 4\. Generate alerts for staff 5\. Display patient-visible due amount for the current day 6\. Update balance upon payment |

| 5\. Outputs |
| :---- |
|   1\. Overdue Account List 2\. Alerts/Notification 3\. Patient-visible balance due within the day |

| 6\. Stakeholders Analysis |
| :---- |
| **Internal:** Doctor / Clinic Owner, IT Department, Finance Staff |
| **External:** Patients, Auditor |

| 7\. Flow Summary |
| :---- |
|   **Start** → System monitors ledger → Detect overdue or due today → Flag account → Show patient their due amount within the day → Auto-send reminder to patient → Notify staff and patient → Patient pays → Update balance → **End**  |

 

| 8\. Performance Metrics |  |
| :---- | :---- |
| **Collection Time:** | Long (Target: Reduced) |
| **Overdue detection:** | Manual(Target: Real-time) |
| **Alert Accuracy:** | Low (Target: 99%) |

 

| 9\. Issues and Challenges |
| :---- |
|   Manual tracking of balances, Missed overdue accounts, No automated reminders, Patients are unaware of balances due within the day. |

 

| 10\. Improvement Opportunities |
| :---- |
|   Automated alerts, Dashboard for outstanding balances, Patient-facing due-today notification, Integration with Payment Processing. |

 

| 11\. Automation Potential |
| :---- |
|   Rule-based overdue detection, Automated alerts, Real-time dashboard, Patient portal or SMS showing amount due today, Auto-reminder system for due and overdue balances. |

| 12\. Business Process Lifecycle Analysis |  |
| :---- | :---- |
| **Design** | Define due dates, patient notification preferences, and reminder templates.  |
| **Execution** | Monitor balances, display due amounts, and send automated reminders.  |
| **Monitoring** | Track overdue accounts, patient views, and reminder delivery.  |
| **Analysis** | Identify collection issues and reminder effectiveness.  |
| **Optimization** | Automate alerts, patient notifications, and reporting.  |

 

| 13\. Evaluation and Recommendation |
| :---- |
|   This module improves cash flow and reduces manual follow-up. It should be integrated with Payment Processing and Income & Expense Reporting.  |

## **Prepared By:                                                  	Approved By:**

   
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_                   	\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_   	\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Trjistan Rieniel R. Bendoy               Dra. Rocsanne Kathleen Beltran               Sam Espino Jr. 

      Project Member                                          Dentist Professor 

**PROCESS DOCUMENTATION**

| 1\. Information |  |
| :---- | :---- |
| **Process Name:** | Income, Expense and Revenue Reporting  |
| **Process Owner:** | Clinic Doctor / Clinic Owner  |
| **Department/Unit:** | Billing & Financial Management  |
| **Document Prepared By:** | Trjistan Rieniel R. Bendoy |
| **Date Prepared:** | September 12, 2026  |
| **Version Number:** | 2.0 |
| **Last Updated:** | September 23, 2026  |

 

| 2\. Overview |
| :---- |
| **Purpose:** To record income, expenses, and revenue in a centralized financial module and generate automated reports that show total income, itemized expenses by category, and computed revenue  |
| **Process Description:** This module serves as the central recording and reporting hub for the clinic’s finances. It records income data from the Payment Processing Module, records expense data from the Expense Recording Module, and computes and records revenue. |

 

| 3\. Inputs |
| :---- |
|   1\. Payment Records \- Payment Processing Module 2\. Expense Entries \- Expense Recording Module |

 

| 4\. Activities |
| :---- |
|   Collect income data from Payment Processing Module. Collect expense data from Expense Recording Module (grouped by category: Doctor’s Fee, Rent, Water, Electricity, Supplies, Others). Record total income for the period. Record total expenses  Compute and record revenue  Generate daily, monthly, or on-demand reports. Display reports on the Operations Dashboard. Export report (PDF / Excel). Log report generation and access to the audit trail.  |

 

| 5\. Outputs |  |
| :---- | :---- |
|   1\. Recorded Income Summary 2\. Recorded Expense Summary (itemized by category: Doctor’s Fee, Rent, Water, Electricity, Supplies, Others) 3.Recorded Revenue  4.Daily, Monthly Income, Expense Report 5\. Revenue Summary 6\. Financial Dashboard showing income, expense breakdown, and revenue 7.Exportable report (PDF / Excel)  |  |

 

| 6\. Stakeholders Analysis |
| :---- |
| **Internal:** Doctor / Clinic Owner, IT Department, Finance Staff |
| **External:** BIR (if applicable), Auditor |

 

| 7\. Flow Summary |
| :---- |
|   **Start** → Collect income and expense data → Record income → Record expenses by category → Compute and record revenue → Generate report → Display on dashboard → Export → **End**  |

 

| 8\. Performance Metrics |  |
| :---- | :---- |
| **Recoding Time for Income / Expense** | Hours (Target: less than 5 mins) |
| **Reporting Accuracy** | Manual  (Target: 99%+) |
| **Revenue Calculation:** | Manual (Target: Automatic) |

 

| 9\. Issues and Challenges |
| :---- |
|  Doctor identifies daily income computation as a repeated task, Daily/monthly income and expense calculations are manually done and are tasks the doctor wants to eliminate.  |

 

| 10\. Improvement Opportunities |
| :---- |
|   Centralized recording of income, expenses, and revenue, Automated reporting with expense categorization, real-time dashboard showing income, expenses, and revenue, Scheduled daily / monthly reports, Export to PDF / Excel, Integration with Payment Processing and Expense Recording for automatic data capture. |

 

| 11\. Automation Potential |
| :---- |
|   Automated recording of income and expenses from source modules, Real-time computation and recording of revenue, Scheduled daily / monthly reports,  |

| 12\. Business Process Lifecycle Analysis |  |
| :---- | :---- |
| **Design** | Define report formats, expense categories, revenue formula, and recording rules.  |
| **Execution** | Record income, expenses, and revenue from source data.  |
| **Monitoring** | Track income, expenses, and revenue.  |
| **Analysis** | Identify financial trends and high-expense categories.  |
| **Optimization** | Automate recording, categorization, and reporting.  |

 

| 13\. Evaluation and Recommendation |
| :---- |
|   This module is a priority for automation because it directly replaces manual income calculation and provides the doctor with a clear financial picture. It should be integrated with all billing and expense modules.     |

## **Prepared By:                                                  	Approved By:**

   
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_                   	\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_   	\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Trjistan Rieniel R. Bendoy               Dra. Rocsanne Kathleen Beltran               Sam Espino Jr. 

      Project Member                                          Dentist Professor 