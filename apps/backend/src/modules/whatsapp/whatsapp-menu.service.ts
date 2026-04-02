import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AiCoreClient } from '../../core/ai/ai-core.client';

const MENU_SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const ROOT_SENTINEL = 'ROOT';

import { WhatsAppSender } from './whatsapp.sender';
import { ProviderManager } from './providers/provider-manager.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CustomerLifecycle, PartyType } from '@prisma/client';

export interface MenuNodeDto {
  parentId?: string | null;
  triggerKey: string;
  menuLabel: string;
  replyText?: string;
  replyMode?: 'STATIC' | 'AI';
  aiSystemPrompt?: string;
  fallbackReply?: string;
  isLeaf?: boolean;
  sortOrder?: number;
  enabled?: boolean;
  actionType?: string | null;
}

@Injectable()
export class WhatsAppMenuService {
  private readonly logger = new Logger(WhatsAppMenuService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiCoreClient,
    private readonly jwtService: JwtService,
    private readonly sender: WhatsAppSender,
    private readonly providerManager: ProviderManager,
  ) {}

  // ── Tree CRUD ──────────────────────────────────────────────────────────────

  async getTree(tenantId: string) {
    const allNodes = await this.prisma.whatsAppMenuItem.findMany({
      where: { tenantId },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    });
    return this.buildTree(allNodes);
  }

  private buildTree(nodes: any[], parentId: string | null = null): any[] {
    return nodes
      .filter((n) => n.parentId === parentId)
      .map((n) => ({ ...n, children: this.buildTree(nodes, n.id) }));
  }

  async createNode(tenantId: string, dto: MenuNodeDto) {
    if (dto.parentId) {
      const parent = await this.prisma.whatsAppMenuItem.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent) throw new NotFoundException('Parent node not found');
    }
    return this.prisma.whatsAppMenuItem.create({
      data: {
        tenantId,
        parentId: dto.parentId ?? null,
        triggerKey: dto.triggerKey.trim().toLowerCase(),
        menuLabel: dto.menuLabel.trim(),
        replyText: dto.replyText ?? null,
        replyMode: dto.replyMode ?? 'STATIC',
        aiSystemPrompt: dto.aiSystemPrompt ?? null,
        fallbackReply: dto.fallbackReply ?? null,
        isLeaf: dto.isLeaf ?? false,
        sortOrder: dto.sortOrder ?? 0,
        enabled: dto.enabled ?? true,
        actionType: dto.actionType ?? null,
      },
    });
  }

  async updateNode(tenantId: string, nodeId: string, dto: Partial<MenuNodeDto>) {
    const node = await this.prisma.whatsAppMenuItem.findFirst({ where: { id: nodeId, tenantId } });
    if (!node) throw new NotFoundException('Menu node not found');

    const data: any = {};
    if (dto.triggerKey !== undefined) data.triggerKey = dto.triggerKey.trim().toLowerCase();
    if (dto.menuLabel !== undefined) data.menuLabel = dto.menuLabel.trim();
    if (dto.replyText !== undefined) data.replyText = dto.replyText;
    if (dto.replyMode !== undefined) data.replyMode = dto.replyMode;
    if (dto.aiSystemPrompt !== undefined) data.aiSystemPrompt = dto.aiSystemPrompt;
    if (dto.fallbackReply !== undefined) data.fallbackReply = dto.fallbackReply;
    if (dto.isLeaf !== undefined) data.isLeaf = dto.isLeaf;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.actionType !== undefined) data.actionType = dto.actionType;

    return this.prisma.whatsAppMenuItem.update({ where: { id: nodeId }, data });
  }

  async deleteNode(tenantId: string, nodeId: string) {
    const node = await this.prisma.whatsAppMenuItem.findFirst({ where: { id: nodeId, tenantId } });
    if (!node) throw new NotFoundException('Menu node not found');
    // Cascade handled by DB (onDelete: Cascade on self-relation)
    await this.prisma.whatsAppMenuItem.delete({ where: { id: nodeId } });
  }

  async reorderNodes(tenantId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, idx) =>
        this.prisma.whatsAppMenuItem.updateMany({
          where: { id, tenantId },
          data: { sortOrder: idx },
        }),
      ),
    );
  }

  async updateConfig(tenantId: string, dto: { menuBotEnabled?: boolean; aiReplyEnabled?: boolean }) {
    return this.prisma.whatsAppBotConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });
  }

  async getConfig(tenantId: string) {
    return this.prisma.whatsAppBotConfig.findUnique({ where: { tenantId } });
  }

  // ── Menu Processing ────────────────────────────────────────────────────────

  /**
   * Main entry point called by WhatsAppCapabilityRouter for every inbound text.
   * Returns the reply string to send, or null if menu bot is inactive / no match.
   */
  async processMenuInput(tenantId: string, jid: string, userText: string): Promise<string | null> {
    const config = await this.prisma.whatsAppBotConfig.findUnique({ where: { tenantId } });
    if (!config?.menuBotEnabled) return null;

    const phoneKey = jid; // use jid as the conversation key

    // Load or create conversation state
    let state = await this.prisma.whatsAppConversationState.findFirst({
      where: { tenantId, phoneNumber: phoneKey },
    });

    // Check session timeout
    const now = new Date();
    if (
      state?.currentMenuNodeId &&
      state.menuEnteredAt &&
      now.getTime() - state.menuEnteredAt.getTime() > MENU_SESSION_TIMEOUT_MS
    ) {
      await this.resetMenuSession(tenantId, phoneKey);
      state = state ? { ...state, currentMenuNodeId: null, menuEnteredAt: null } : null;
    }

    const trimmed = userText.trim().toLowerCase();

    // Handle "back" / "0" — go up one level
    if ((trimmed === '0' || trimmed === 'back') && state?.currentMenuNodeId && state.currentMenuNodeId !== ROOT_SENTINEL) {
      const currentNode = await this.prisma.whatsAppMenuItem.findUnique({
        where: { id: state.currentMenuNodeId },
      });
      if (currentNode?.parentId) {
        const parentNode = await this.prisma.whatsAppMenuItem.findUnique({
          where: { id: currentNode.parentId },
        });
        const siblingMenu = await this.getChildMenuText(tenantId, parentNode?.parentId ?? null);
        await this.setMenuSession(tenantId, phoneKey, parentNode?.parentId ?? ROOT_SENTINEL, now);
        return siblingMenu;
      } else {
        await this.resetMenuSession(tenantId, phoneKey);
        return null;
      }
    }

    // Handle "Back to Root" jump (Home Style)
    if (['home', 'main', 'menu', 'root', '*', '#'].includes(trimmed)) {
      await this.resetMenuSession(tenantId, phoneKey);
      const rootItems = await this.prisma.whatsAppMenuItem.findMany({
        where: { tenantId, parentId: null, enabled: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (rootItems.length === 0) return null;
      return this.formatMenuText(config.welcomeMessage ?? 'Home Menu', rootItems);
    }

    // Not in a session — start if root items exist
    if (!state?.currentMenuNodeId) {
      const rootItems = await this.prisma.whatsAppMenuItem.findMany({
        where: { tenantId, parentId: null, enabled: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (rootItems.length === 0) return null;

      const menuText = this.formatMenuText(
        config.welcomeMessage ?? 'How can we help you?',
        rootItems,
      );
      await this.setMenuSession(tenantId, phoneKey, ROOT_SENTINEL, now);
      return menuText;
    }

    // In a session — find child matching user input
    const parentId = state.currentMenuNodeId === ROOT_SENTINEL ? null : state.currentMenuNodeId;
    const children = await this.prisma.whatsAppMenuItem.findMany({
      where: { tenantId, parentId, enabled: true },
      orderBy: { sortOrder: 'asc' },
    });

    const matched = children.find(c => c.triggerKey === trimmed);

    if (!matched) {
      // Invalid option — resend current level menu
      const header = parentId
        ? (await this.prisma.whatsAppMenuItem.findUnique({ where: { id: parentId } }))?.menuLabel ?? 'Menu'
        : 'Menu';
      return `❌ Invalid option.\n\n` + this.formatMenuText(header, children);
    }

    if (!matched.isLeaf) {
      // Navigate deeper
      const subChildren = await this.prisma.whatsAppMenuItem.findMany({
        where: { tenantId, parentId: matched.id, enabled: true },
        orderBy: { sortOrder: 'asc' },
      });
      const subMenuText = this.formatMenuText(matched.menuLabel, subChildren);
      await this.setMenuSession(tenantId, phoneKey, matched.id, now);
      return subMenuText;
    }

    // Leaf node — generate reply
    await this.resetMenuSession(tenantId, phoneKey);

    // Handle System Actions (e.g. Lead Generation)
    if (matched.actionType) {
      await this.handleMenuAction(
        tenantId,
        phoneKey,
        matched.actionType,
        matched.menuLabel,
      );
    }

    if (matched.replyMode === 'AI' && config.aiReplyEnabled) {
      const aiReply = await this.callAiCore(
        tenantId,
        matched.aiSystemPrompt ?? '',
        userText,
      );
      if (aiReply) return aiReply;
      // Fall through to fallback
      if (matched.fallbackReply) return matched.fallbackReply;
    }

    return matched.replyText ?? matched.fallbackReply ?? null;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private formatMenuText(header: string, items: any[]): string {
    // Premium "Boxed Style" for better readability on WhatsApp
    const BOXED_NUMS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    const lines = items.map((i, idx) => {
      const prefix = idx < 10 ? BOXED_NUMS[idx] : `${idx + 1}.`;
      return `${prefix} *${i.menuLabel}*`;
    });
    
    return `*${header}*\n\n${lines.join('\n')}\n\n_Reply with a number._\n_Type 0 to go back._\n_Type * for Home._`;
  }

  private async getChildMenuText(tenantId: string, parentId: string | null): Promise<string> {
    const items = await this.prisma.whatsAppMenuItem.findMany({
      where: { tenantId, parentId, enabled: true },
      orderBy: { sortOrder: 'asc' },
    });
    const header = parentId
      ? (await this.prisma.whatsAppMenuItem.findUnique({ where: { id: parentId } }))?.menuLabel ?? 'Menu'
      : 'How can we help you?';
    return this.formatMenuText(header, items);
  }

  private async setMenuSession(tenantId: string, phoneNumber: string, nodeId: string, now: Date) {
    await this.prisma.whatsAppConversationState.upsert({
      where: { tenantId_phoneNumber: { tenantId, phoneNumber } },
      create: {
        tenantId,
        phoneNumber,
        step: 'MENU',
        expiresAt: new Date(now.getTime() + MENU_SESSION_TIMEOUT_MS),
        currentMenuNodeId: nodeId,
        menuEnteredAt: now,
      },
      update: {
        currentMenuNodeId: nodeId,
        menuEnteredAt: now,
        expiresAt: new Date(now.getTime() + MENU_SESSION_TIMEOUT_MS),
      },
    });
  }

  private async resetMenuSession(tenantId: string, phoneNumber: string) {
    await this.prisma.whatsAppConversationState.updateMany({
      where: { tenantId, phoneNumber },
      data: { currentMenuNodeId: null, menuEnteredAt: null },
    });
  }

  // ── AI Core Call ───────────────────────────────────────────────────────────

  private async callAiCore(tenantId: string, systemPrompt: string, userText: string): Promise<string | null> {
    try {
      // Short-lived internal JWT — no real user in this context, use tenantId as sub
      const tenantJwt = this.jwtService.sign({ tenantId, userId: tenantId }, { expiresIn: '2m' });

      const result = await this.aiClient.sendTask({
        tenantJwt,
        agentRole: 'UTILITY',
        message: userText,
        context: {
          systemPromptOverride: systemPrompt || undefined,
        },
      });

      // AiTaskResult.response is the final text reply
      return result.response ?? null;
    } catch (err) {
      this.logger.warn(`ai-core call failed for tenant ${tenantId}: ${(err as any)?.message}`);
      return null;
    }
  }

  // ── Actions Processor ──────────────────────────────────────────────────────

  private async handleMenuAction(
    tenantId: string,
    phone: string,
    actionType: string,
    label: string,
  ) {
    this.logger.log(
      `Processing action ${actionType} for ${phone} (Tenant: ${tenantId})`,
    );

    if (actionType === 'CREATE_LEAD') {
      try {
        // 1. Normalize phone (strip country code for consistency as requested)
        const localPhone = this.normalizePhoneToLocal(phone);

        // 2. Store in mb_party as a PROSPECT
        const party = await this.prisma.party.upsert({
          where: { tenantId_phone: { tenantId, phone: localPhone } },
          create: {
            tenantId,
            phone: localPhone,
            name: 'WhatsApp Prospect',
            normalizedPhone: localPhone,
            partyType: 'CUSTOMER',
            customerLifecycle: 'PROSPECT',
          },
          update: {
            customerLifecycle: 'PROSPECT', // Ensure they are marked as prospect if already existing
          },
        });

        // 2. Alert the owner
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { contactPhone: true, name: true },
        });

        if (tenant?.contactPhone) {
          const alertMsg = `🚀 *New Lead Alert!*\n\nCustomer *${phone}* just expressed interest in *${label}* via WhatsApp Menu.\n\nCRM: https://app.mobibix.io/customers/${party.id}`;

          await this.sender.sendTextMessage(
            tenantId,
            tenant.contactPhone,
            alertMsg,
            undefined,
            true,
          );
        }

        // ── 🎯 META CONVERSIONS API (CAPI) ──
        try {
          const config = await this.prisma.whatsAppNumber.findFirst({
            where: { tenantId, isEnabled: true, provider: 'META_CLOUD' },
          });

          if (config && config.wabaId) {
            await this.providerManager.sendEvent(
              config as any,
              'LEAD',
              phone,
              tenantId,
            );
          }
        } catch (capiErr) {
          this.logger.error(
            `Meta CAPI failed: ${(capiErr as any)?.message}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to create lead for ${phone}: ${(err as any)?.message}`,
        );
      }
    }
  }

  /**
   * Normalizes a WhatsApp JID/Phone to a local 10-digit format (strips country code).
   * Specifically handles '91' prefix for India by default.
   */
  private normalizePhoneToLocal(phone: string): string {
    // Remove any non-numeric characters
    let clean = phone.replace(/\D/g, '');

    // Strip '91' if it's 12 digits (Indian international format)
    if (clean.length === 12 && clean.startsWith('91')) {
      clean = clean.slice(2);
    }

    return clean;
  }
}
