"use client";

import Link from "next/link";
import {
  Smartphone, Zap, Inbox, Bot, Settings2, BarChart3,
  ChevronRight, CheckCircle2, AlertCircle, MessageSquare,
  ArrowLeft, Hash, Layers, Users, Bell, Globe,
} from "lucide-react";

const SECTIONS = [
  {
    id: "connect",
    icon: Smartphone,
    color: "blue",
    title: "Step 1 — Connect WhatsApp",
    body: `Go to WhatsApp → Dashboard. If you have not connected yet, you will see the "Connect WhatsApp" screen. Choose between two modes:`,
    options: [
      {
        label: "Official Meta API (Recommended)",
        color: "bg-blue-500",
        desc: "Connect your existing WhatsApp Business number via Facebook. You keep using your phone normally and get the full automation suite. This is the Coexistence mode — your phone and Mobibix run side by side.",
      },
      {
        label: "Authkey (Platform Number)",
        color: "bg-violet-500",
        desc: "Use Mobibix's shared Authkey-powered number. Great for reminders and broadcasts when you do not want to connect your own number. Does not support real-time inbox or menu bot.",
      },
    ],
    tips: [
      "For Coexistence: click 'Continue with Facebook', log in to your Facebook account that manages your WhatsApp Business. Meta will ask you to select your WABA — choose your business number.",
      "You will need your Facebook Business account to have your WhatsApp Business registered under it.",
      "If you see a 6-digit PIN prompt during Meta setup, that is WhatsApp's 2-step verification code — check your WhatsApp app notifications.",
    ],
  },
  {
    id: "inbox",
    icon: Inbox,
    color: "teal",
    title: "Step 2 — Using the Inbox",
    body: `The Inbox tab shows all real-time conversations from your WhatsApp number. Messages sync automatically — no manual refresh needed.`,
    options: [
      {
        label: "Unread Badges",
        color: "bg-teal-500",
        desc: "Each conversation shows a green badge with the unread count. The Inbox tab itself shows the total across all conversations. Opening a conversation marks it as read automatically.",
      },
      {
        label: "Assigning Conversations",
        color: "bg-blue-500",
        desc: "Use the dropdown in the top-right of an active chat to assign it to a staff member. Their name appears under the conversation in the list so your team always knows who is handling what.",
      },
      {
        label: "Bot Paused Indicator",
        color: "bg-orange-500",
        desc: "When you (or a staff member) send a manual reply, the bot automatically pauses for that customer for 30 minutes. You will see a 'Bot Paused' badge in the chat header — this means the bot is silent while you handle the conversation personally.",
      },
    ],
    tips: [
      "Type a message and press Enter or tap the send button. The bot pause triggers automatically — no need to do anything extra.",
      "After 30 minutes of no agent activity, the bot resumes automatically for that customer.",
      "The inbox polls every 15 seconds as a fallback. For real-time updates, keep the tab open.",
    ],
  },
  {
    id: "keyword-bot",
    icon: Hash,
    color: "violet",
    title: "Step 3 — Set Up Keyword Bot",
    body: `Go to Automations → Keyword Bot. This bot automatically replies when a customer sends specific words. Best for instant answers to common questions.`,
    options: [
      {
        label: "Preset Modes",
        color: "bg-violet-500",
        desc: "Apply a preset for REPAIR (status, ready, price, warranty), SALES (price, offer, buy, stock), or MIXED for shops doing both. Applying a preset seeds your rules instantly — you can edit them after.",
      },
      {
        label: "Custom Rules",
        color: "bg-indigo-500",
        desc: "Create your own rules: set a trigger word (e.g. 'invoice'), a reply text, and choose exact match or contains match. Drag to reorder — rules checked top to bottom, first match wins.",
      },
      {
        label: "Business Hours Gate",
        color: "bg-blue-500",
        desc: "Enable business hours and set your open/close times. Outside those hours, the bot sends your 'out of hours' message instead of normal replies. Customers are never left without a response.",
      },
    ],
    tips: [
      "Start with a preset, then edit or delete rules that do not fit your shop.",
      "The Welcome Message is sent when no keyword matches — set it to something helpful like 'Hi! Reply 1 for repair status, 2 for pricing.'",
      "Use exact match = ON for words like '1', '2', '3' to avoid accidental triggers from messages containing those digits mid-sentence.",
    ],
  },
  {
    id: "menu-bot",
    icon: Layers,
    color: "indigo",
    title: "Step 4 — Set Up Menu Bot",
    body: `Go to Automations → Menu Bot. The Menu Bot creates an interactive numbered menu — like an IVR for WhatsApp. Customers navigate by replying with numbers.`,
    options: [
      {
        label: "Build Your Menu Tree",
        color: "bg-indigo-500",
        desc: "Add root-level options (e.g. '1. Repair Status', '2. Pricing', '3. Talk to Agent'). Each option can have sub-options or a final reply. Drag to reorder. The bot auto-numbers them with boxed emoji (1️⃣, 2️⃣).",
      },
      {
        label: "AI Smart Replies",
        color: "bg-purple-500",
        desc: "On any leaf node (deepest option with no children), enable AI Mode. Write a system prompt that tells the AI what to answer about. E.g. 'You are a repair shop assistant — answer questions about iPhone screen repair prices and timelines.' Always set a fallback reply in case AI is busy.",
      },
      {
        label: "Interactive Buttons",
        color: "bg-blue-500",
        desc: "For Meta Cloud API users: each node can have Quick Reply buttons (up to 3 tap-to-reply options), a scrollable List, or a CTA URL button that opens a link. These render as native WhatsApp interactive messages — much better tap rate than text menus.",
      },
    ],
    tips: [
      "Customers can type 'menu' or '#' at any time to jump back to the start. Type '0' or 'back' to go up one level.",
      "Menu sessions expire after 10 minutes of inactivity — the customer starts fresh on next message.",
      "Enable the Menu Bot master toggle first. The keyword bot only runs AFTER the menu bot has no match.",
      "Add a CREATE_LEAD action on your 'Sales Enquiry' node — it automatically creates a CRM prospect and sends you an alert.",
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    color: "orange",
    title: "Step 5 — Owner Notifications & CAPI",
    body: `Go to WhatsApp → Settings to configure how owner alerts are sent and how Meta ad attribution works.`,
    options: [
      {
        label: "Notification Source",
        color: "bg-orange-500",
        desc: "Choose between Mobibix Platform (shared number, always available) or Your Own Number (alerts come from your Meta Cloud number — customers see your business name, not a generic number). Own Number requires a connected Meta number.",
      },
      {
        label: "Meta Conversions API (CAPI)",
        color: "bg-blue-500",
        desc: "If you run Click-to-WhatsApp ads on Facebook or Instagram, CAPI closes the attribution gap. Enter your Dataset ID (from Meta Events Manager) and a System User token. Mobibix automatically sends a 'Contact' conversion event when a customer messages you via an ad. This teaches Meta's algorithm which ads bring real customers — reducing your ad cost over time.",
      },
    ],
    tips: [
      "CAPI is only needed if you run paid Meta/Instagram ads with a 'Send WhatsApp Message' button. Skip it if you do not run ads.",
      "For CAPI, create a System User token (not a personal token) in Meta Business Manager → System Users. System tokens never expire.",
      "Dataset ID is found in Meta Events Manager → Data Sources → your dataset → Settings.",
    ],
  },
  {
    id: "analytics",
    icon: BarChart3,
    color: "teal",
    title: "Step 6 — Bot Analytics",
    body: `Go to Automations tab. The Bot Analytics card at the top shows how your automation is performing.`,
    options: [
      {
        label: "Key Metrics",
        color: "bg-teal-500",
        desc: "Inbound messages = total received. Bot Handled = auto-replied by menu or keyword bot. Agent Handled = manually replied by staff. Bot Rate = what percentage your bot is covering without human effort.",
      },
      {
        label: "Top Keywords",
        color: "bg-violet-500",
        desc: "See which keywords trigger the most bot replies. Use this to identify what your customers are asking most — then add better menu options or AI replies for those topics.",
      },
    ],
    tips: [
      "A Bot Rate above 60% means your automation is doing real work. Below 30% usually means keywords are too specific or menu options do not match what customers type.",
      "Switch the period to Last 30 Days to see monthly trends — useful to spot if message volume is growing.",
    ],
  },
];

const COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  blue:   { bg: "bg-blue-500/8",   text: "text-blue-600 dark:text-blue-400",   border: "border-blue-500/20",   icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  teal:   { bg: "bg-teal-500/8",   text: "text-teal-600 dark:text-teal-400",   border: "border-teal-500/20",   icon: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  violet: { bg: "bg-violet-500/8", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20", icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  indigo: { bg: "bg-indigo-500/8", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20", icon: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  orange: { bg: "bg-orange-500/8", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20", icon: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
};

export default function WhatsAppGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/whatsapp"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to WhatsApp
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-500/10">
            <MessageSquare className="w-6 h-6 text-teal-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">WhatsApp Setup Guide</h1>
            <p className="text-sm text-muted-foreground font-medium">
              Connect, automate, and manage customer conversations — step by step.
            </p>
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => {
          const c = COLORS[s.color];
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${c.border} ${c.text} hover:${c.bg} transition-colors`}
            >
              {s.title.split("—")[1]?.trim() || s.title}
            </a>
          );
        })}
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => {
        const c = COLORS[section.color];
        const Icon = section.icon;
        return (
          <section key={section.id} id={section.id} className={`rounded-3xl border ${c.border} ${c.bg} p-6 space-y-5 scroll-mt-24`}>
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${c.icon}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h2 className={`text-base font-black ${c.text}`}>{section.title}</h2>
            </div>

            <p className="text-sm text-muted-foreground font-medium leading-relaxed">{section.body}</p>

            {/* Option cards */}
            {section.options && (
              <div className="space-y-3">
                {section.options.map((opt) => (
                  <div key={opt.label} className="flex gap-3 bg-background/60 border border-border rounded-2xl p-4">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${opt.color}`} />
                    <div>
                      <p className="text-sm font-black text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reasons (for step 3) */}
            {"reasons" in section && (section as any).reasons && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(section as any).reasons.map((r: any) => (
                  <div key={r.label} className="flex gap-2 items-start bg-background/60 border border-border rounded-xl p-3">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${r.color}`} />
                    <div>
                      <p className="text-xs font-black text-foreground">{r.label}</p>
                      <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tips */}
            {section.tips && section.tips.length > 0 && (
              <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 space-y-2`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${c.text}`}>Tips</p>
                <ul className="space-y-2">
                  {section.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${c.text}`} />
                      <span className="text-xs text-muted-foreground font-medium leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}

      {/* FAQ */}
      <section className="rounded-3xl border border-border bg-muted/30 p-6 space-y-4">
        <h2 className="text-base font-black text-foreground flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" /> Common Questions
        </h2>
        <div className="space-y-4">
          {[
            {
              q: "Will connecting Meta API disconnect WhatsApp on my phone?",
              a: "No — Coexistence mode keeps your WhatsApp Business App running normally on your phone. You can still reply from your phone AND from Mobibix simultaneously.",
            },
            {
              q: "Why is the bot not replying to some messages?",
              a: "Check: (1) Is the master bot toggle ON in Automations? (2) Was there a human agent reply in the last 30 minutes? The bot pauses for 30 min after any agent send. (3) Is the message type text? Buttons/images do not trigger keyword matching.",
            },
            {
              q: "My customer replied with a number but the menu did not respond.",
              a: "Make sure Menu Bot is enabled in Automations → Menu Bot → master toggle. Also check if the customer's session expired (10-min timeout after last message).",
            },
            {
              q: "Can I use both Menu Bot and Keyword Bot together?",
              a: "Yes. The Menu Bot runs first. If the customer's message does not match any menu option and they are not in an active menu session, the Keyword Bot takes over.",
            },
            {
              q: "What happens when the AI is unavailable for an AI-mode node?",
              a: "It falls back to the Fallback Reply you set on that node. If no fallback is set, it falls back to the node's static reply text. Always set a fallback.",
            },
          ].map((item) => (
            <div key={item.q} className="space-y-1">
              <p className="text-sm font-black text-foreground flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" /> {item.q}
              </p>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed pl-6">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Link
          href="/whatsapp"
          className="flex items-center gap-2 text-xs font-black text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to WhatsApp
        </Link>
        <Link
          href="/whatsapp?tab=automation"
          className="flex items-center gap-2 text-xs font-black text-teal-600 dark:text-teal-400 hover:underline uppercase tracking-widest"
        >
          Go to Automations <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
