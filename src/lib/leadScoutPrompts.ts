/**
 * Self-contained Lead Scout playbook prompts for the onboard OF Assistant.
 * Because the verification rules are embedded directly in the prompt AND reinforced
 * in ai-chat's system prompt, these work immediately even across model switches.
 */
export interface LeadScoutPlaybook {
  id: string;
  label: string;
  shortDesc: string;
  /** Prompt placed into the chat composer (editable before sending, e.g. to swap city or paste leads). */
  template: string;
}

const LEAD_SCOUT_RULES = `Follow these strict verification rules for every lead:
1. Use web_search to find the company's real website, then use web_scrape on their homepage and /contact page.
2. ONLY include an email if you saw it verbatim on their live site or verified search snippet. NEVER guess or invent info@ or hello@ addresses.
3. REJECT staging/junk emails (sg-host.com, wixpress.com, sentry.io, noreply@, example.com). If no real email is published, set "email": null and put their Instagram handle and website contact URL in notes.
4. Put Category, Website, Instagram (@handle), and "Email Status: Verified (On Website)" or "No Public Email (Web Form / IG Only)" inside notes.
5. Emit one \`\`\`action create_contact block per company right away (type: "Lead", status: "Pending") — do not ask me to confirm first.`;

export const LEAD_SCOUT_PLAYBOOKS: LeadScoutPlaybook[] = [
  {
    id: 'scout-city',
    label: 'Scout 5 verified leads in a city',
    shortDesc: 'Finds luxury custom builders / designers & scrapes real contact emails',
    template: `Find 5 luxury custom home builders or high-end interior design firms in [CITY, STATE] that would be great fits for Organic Finishes LLC (Venetian plaster, limewash, tadelakt, microcement).\n\n${LEAD_SCOUT_RULES}`,
  },
  {
    id: 'verify-pasted',
    label: 'Verify & save pasted leads (1–5)',
    shortDesc: 'Checks pasted Gemini leads on live sites & saves clean contacts',
    template: `Verify these leads and save them to Contacts as Leads (replace the list below with up to 5 companies from Gemini or notes):\n- [Company 1, City]\n- [Company 2, City]\n\n${LEAD_SCOUT_RULES}`,
  },
];
