# Source profile: Review and test Viva Glint surveys before launch

[Context entry](https://raw.githubusercontent.com/microsoft/glintlabs/main/skills/people-science-knowledge-vault/references/README.md) | [Source priority](https://raw.githubusercontent.com/microsoft/glintlabs/main/skills/people-science-knowledge-vault/references/source-priority.md)

Index review: 2026-11-10. These editorial themes route retrieval; they are not a substitute for the full public source. L locators are extraction lines, p locators are PDF pages, and s locators are reviewed audio segments. Hashes do not prove freshness.

<a id="survey-qa"></a>
## Review and test Viva Glint surveys before launch

`survey-qa` | catalog | reviewed

**Priority:** Original vault; retained tier `low`.

**Source:** https://learn.microsoft.com/en-us/viva/glint/setup/survey-qa

Complete launch-readiness checklist and testing workflow. Themes preserve distinct operational checks and irreversible constraints; they do not replace the field-by-field checklist or linked live-edit instructions.

**Reviewed asset scope:** Complete freshly retrieved public Microsoft Learn article text reviewed, including substantive tables. Sign-in notices and page chrome excluded as evidence. Linked pages, courses, downloads, recordings and image-only details were not reviewed; no refreshed comprehensive figure or media review is claimed.

1. **Company identity and participant notices** (documentation) - Verify organization name in surveys/invites, optional company privacy-policy link, and company participant message/translations. For survey-specific messaging use Program Setup.
   Topics: glint-admin, privacy-confidentiality. Evidence: `L29`, "The organization name is correct; it appears in surveys and email invites and reminders.".
2. **Time zones and tenant channel switches** (documentation) - Verify the client default time zone, whether communications use users' time zones, and the tenant-level Teams switch governing availability of survey notifications and Nudges.
   Topics: glint-admin. Evidence: `L31`, "The correct default time zone that Viva Glint uses to send communications is selected.".
3. **Alert attributes and report hierarchies** (documentation) - Select alert population attributes; leaving Attributes for Alerts blank generates no alerts. Verify primary and secondary hierarchies for default report views.
   Topics: glint-admin, survey-interpretation. Evidence: `L43`, "Attributes are selected to use for populations in the  Alerts Report .  When blank, no alerts are generated .".
4. **Authentication and deskless access** (documentation) - Confirm whether Entra ID is required for email/Teams survey links or personalized links are allowed. Configure attribute-based alternate survey access when needed for deskless workers.
   Topics: glint-admin, privacy-confidentiality. Evidence: `L50`, "This setting is switched to:   Yes  to require survey participants to authenticate with Entra ID to access surveys.    No  to allow survey participant".
5. **Post-survey learning and data import** (documentation) - Employee Post-Survey Action Taking controls recommended LinkedIn Learning videos on the Thank you page for all surveys. If employee data imports use SFTP, confirm its setup is complete.
   Topics: glint-admin, learning-enablement. Evidence: `L55`, "This setting is set to Yes or No to determine if survey participants see recommended LinkedIn Learning videos on their survey Thank you page. This set".
6. **Comment-analysis languages before launch** (documentation) - Select languages to translate into English for comment analysis before launch; otherwise non-English comment analysis will not succeed as intended.
   Topics: glint-admin, survey-interpretation. Evidence: `L61`, "Languages that should be translated to English for comment analysis are selected.  Languages must be selected before a survey launches to successfully".
7. **Survey and dashboard localization** (documentation) - Verify supported/default survey and dashboard languages. Program additional languages depend on General Settings supported survey languages; review translated participant messaging as well.
   Topics: glint-admin, survey-design. Evidence: `L65`, "Correct languages for survey participants are selected.".
8. **Confidentiality thresholds are locked at launch** (documentation) - Confirm Advanced configuration thresholds for rated scores, response rates and comments before enabling a survey. Admins cannot change confidentiality settings after launch.
   Topics: privacy-confidentiality, glint-admin. Evidence: `L77`, "Viva Glint Admins can't change confidentiality settings after a survey launches. Select and confirm thresholds before enabling a survey.".
9. **Program ownership and notifications** (documentation) - Check program name, program-admin User Roles, and the recipient of admin notification emails. The notification-recipient check is listed for Recurring/Ad Hoc programs.
   Topics: glint-admin. Evidence: `L92`, "The correct User Roles are selected as program admins.".
10. **Action-taking feature gates** (documentation) - Confirm Suggested Actions for Focus Area creation, manager Nudges where supported, Team Conversations and sharing for Recurring programs, and comment-input auto-expansion. Program type and enabled features determine which settings appear.
   Topics: action-taking, glint-admin. Evidence: `L108`, "This setting is set to Yes or No correctly to allow or disallow users to create Focus Areas based on suggestion action templates.".
11. **Lifecycle and Always-On repeat windows** (documentation) - For Lifecycle and Always-On, verify the response window and the waiting period/next availability before a participant can submit again.
   Topics: survey-design, glint-admin. Evidence: `L112`, "The number of days the survey is open for responses is correct.".
12. **Resubmission and identifiable responses** (documentation) - Check survey resubmission for Recurring, Ad Hoc and Lifecycle programs. Confidential Responses can be switched to No only for Employee Lifecycle surveys; do not generalize nonconfidential response support to other program types.
   Topics: privacy-confidentiality, glint-admin. Evidence: `L124`, "This setting is set to Yes or No correctly to allow or disallow users to reset their own surveys and resubmit during live surveys.".
13. **Raw-response export authorization** (documentation) - Explicitly verify whether Enable Export of Raw Survey Responses permits or disallows raw respondent-data export for the program; do not infer export rights from ordinary report access.
   Topics: privacy-confidentiality, glint-admin. Evidence: `L144`, "This setting is set to Yes or No correctly to allow or disallow the export of raw respondent data for this program.".
14. **Included and excluded populations** (documentation) - Confirm both inclusion and exclusion Distribution Lists. Download Recipients is unavailable for Lifecycle surveys; use the separate Lifecycle recipient procedure rather than assuming this preview is available.
   Topics: glint-admin. Evidence: `L157`, "The correct Distribution Lists are selected to include users.".
15. **Schedule and response/conversation windows** (documentation) - Verify recurring frequency and schedule preview, Recurring/Ad Hoc start date and response window, and the Recurring Team Conversation window.
   Topics: survey-design, glint-admin. Evidence: `L176`, "The survey start date is accurate.".
16. **Question inventory and cycle assignment** (documentation) - Check all intended questions are present and assigned to the correct upcoming cycle, in the right order with accurate text and translations. Validate welcome/thank-you text, section translations and the distinction between scrolling breaks and persistent section headers.
   Topics: survey-design, glint-admin. Evidence: `L201`, "All questions are part of the survey and that the upcoming cycle number is selected for the right questions.".
17. **Targeting and display-logic validation** (documentation) - Verify Distribution Lists targeting specific questions and rules displaying questions only after qualifying prior responses. These are separate checks, not interchangeable audience mechanisms.
   Topics: survey-design, glint-admin. Evidence: `L213`, "Distribution lists selected to target questions are accurate.".
18. **Report roles and phased versus live access** (documentation) - Confirm program roles, live/phased reporting access, report template permissions and question-level reporting access. Review the dashboard default and manager-report defaults, not only the survey invite population.
   Topics: privacy-confidentiality, glint-admin. Evidence: `L237`, "Roles who should be added to the program are present and that they're granted live or phased access correctly.".
19. **Reporting experience and Copilot controls** (documentation) - Check Concierge, Broader Team Insights, Copilot comment summarization and role-level Team Conversations settings for applicable programs. Role-level Team Conversations appears only if enabled in Program Setup.
   Topics: glint-admin, survey-interpretation. Evidence: `L253`, "This setting is set to On or Off to allow users to access Copilot comment summarization.".
20. **Irreversible aggregate setup and outcomes** (documentation) - Check aggregate labels/items before setup: aggregate indices cannot be deleted once set up. Verify key outcome, Driver Impact outcomes, manager-report items and PowerPoint templates separately.
   Topics: glint-admin, survey-interpretation. Evidence: `L298`, "Aggregate Indices can't be deleted after they're set up.".
21. **Notification timing, channels and translations** (documentation) - Validate email delivery timeframe, survey-start/reminder/results schedules, Recurring conversation-start/reminder/overdue schedules and translations. Teams channels require tenant enablement; personal email options require the Personal Email Optional System Attribute and are recommended for exiting employees.
   Topics: glint-admin, learning-enablement. Evidence: `L317`, "Survey start, reminder, and results emails follow the correct schedule.".
22. **Coaching content checks** (documentation) - Confirm Interpretation Guide, Top Strengths and Top Opportunities content. When Recurring Team Conversations is enabled, also check presentation and resource guidance.
   Topics: learning-enablement, action-taking. Evidence: `L338`, "The correct content is selected for the Interpretation Guide.".
23. **Report preview requires imported data** (documentation) - After reviewing setup and importing employee data, Generate Report Preview lets admins inspect attributes and questions in reports. This option is available only for Recurring and Ad Hoc surveys.
   Topics: glint-admin, survey-interpretation. Evidence: `L360`, "After reviewing your survey setup and confirming that employee data is imported to Viva Glint, use the  Generate Report Preview  option to preview how".
24. **Representative testing before first launch** (documentation) - Start testing at least two to three weeks before the first launch with core project staff and approval stakeholders. Include testers for every selected language and assign checks for invite/reminder delivery, alternate access, targeting and display logic.
   Topics: glint-admin, survey-design. Evidence: `L366`, "At least two to three weeks before launching your first Viva Glint survey, conduct testing with a group of users on your project team. Include your Vi".
25. **Test a duplicate program, not a production cycle** (documentation) - Always duplicate the survey program for testing: admins can delete test programs but not test cycles inside a program. Limit distribution to testers, set dates/response window, verify communications, then approve and enable the test.
   Topics: glint-admin. Evidence: `L377`, "To launch a test survey, always create a copy of your survey program. Viva Glint Admins can delete test survey programs, but not test survey cycles in".
26. **Resolve defects and remove test data** (documentation) - Collect tester feedback and track issues with category, description, owner/tester, date, status and resolution. Update setup, delete the completed test program, and only after review/testing approve and enable the real survey.
   Topics: glint-admin. Evidence: `L390`, "Collect feedback from survey testers and update your survey setup based on feedback.".

## Shared research context

No registered study-family link; this is not proof of independent evidence.
