/**
 * WhatsApp Interactive Message Builder
 *
 * Converts a buttonType + buttonConfig stored in DB into a valid
 * Meta Cloud API interactive message payload.
 *
 * buttonType: 'QUICK_REPLY' | 'LIST' | 'CTA_URL'
 *
 * buttonConfig shapes:
 *
 * QUICK_REPLY:
 *   { buttons: [{ id: string, title: string }] }  — max 3 buttons
 *
 * LIST:
 *   { buttonLabel: string, sections: [{ title: string, rows: [{ id: string, title: string, description?: string }] }] }
 *
 * CTA_URL:
 *   { buttonLabel: string, url: string }
 */

export type ButtonType = 'QUICK_REPLY' | 'LIST' | 'CTA_URL';

export interface QuickReplyConfig {
  buttons: { id: string; title: string }[];
}

export interface ListConfig {
  buttonLabel: string;
  sections: {
    title: string;
    rows: { id: string; title: string; description?: string }[];
  }[];
}

export interface CtaUrlConfig {
  buttonLabel: string;
  url: string;
}

export type ButtonConfig = QuickReplyConfig | ListConfig | CtaUrlConfig;

/**
 * Builds a Meta Cloud API interactive message object.
 * Returns null if buttonType is not set (plain text fallback).
 */
export function buildInteractivePayload(
  bodyText: string,
  buttonType: string | null | undefined,
  buttonConfig: unknown,
): Record<string, unknown> | null {
  if (!buttonType || !buttonConfig) return null;

  const cfg = buttonConfig as any;

  switch (buttonType) {
    case 'QUICK_REPLY': {
      const qr = cfg as QuickReplyConfig;
      if (!qr.buttons?.length) return null;
      return {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: qr.buttons.slice(0, 3).map((b) => ({
              type: 'reply',
              reply: { id: b.id, title: b.title.slice(0, 20) },
            })),
          },
        },
      };
    }

    case 'LIST': {
      const list = cfg as ListConfig;
      if (!list.sections?.length) return null;
      return {
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: bodyText },
          action: {
            button: (list.buttonLabel || 'View Options').slice(0, 20),
            sections: list.sections.map((s) => ({
              title: s.title?.slice(0, 24) || 'Options',
              rows: s.rows.slice(0, 10).map((r) => ({
                id: r.id,
                title: r.title.slice(0, 24),
                ...(r.description && { description: r.description.slice(0, 72) }),
              })),
            })),
          },
        },
      };
    }

    case 'CTA_URL': {
      const cta = cfg as CtaUrlConfig;
      if (!cta.url) return null;
      return {
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          body: { text: bodyText },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: (cta.buttonLabel || 'Open Link').slice(0, 20),
              url: cta.url,
            },
          },
        },
      };
    }

    default:
      return null;
  }
}
