import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { setDefaultChannelPluginRegistryForTests } from "./channel-test-helpers.js";
import { setupChannels } from "./onboard-channels.js";
import { createExitThrowingRuntime, createWizardPrompter } from "./test-wizard-helpers.js";

function createPrompter(overrides: Partial<WizardPrompter>): WizardPrompter {
  return createWizardPrompter(
    {
      progress: vi.fn(() => ({ update: vi.fn(), stop: vi.fn() })),
      ...overrides,
    },
    { defaultSelect: "__done__" },
  );
}

vi.mock("./onboarding/plugin-install.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    reloadOnboardingPluginRegistry: vi.fn(() => {}),
  };
});

describe("setupChannels installation", () => {
  beforeEach(() => {
    setDefaultChannelPluginRegistryForTests();
  });

  it("installs and configures Discord when selected", async () => {
    let selectCount = 0;
    const select = vi.fn(async ({ message }: { message: string }) => {
      if (message === "Select a channel") {
        selectCount++;
        return selectCount === 1 ? "discord" : "__done__";
      }
      return "__done__";
    });

    const text = vi.fn(async ({ message }: { message: string }) => {
      if (message.includes("Enter Discord bot token")) {
        return "discord-token-123";
      }
      return "";
    });

    const prompter = createPrompter({
      select: select as unknown as WizardPrompter["select"],
      text: text as unknown as WizardPrompter["text"],
      confirm: vi.fn(async () => true),
    });

    const runtime = createExitThrowingRuntime();
    const initialCfg = {} as OpenClawConfig;

    const finalCfg = await setupChannels(initialCfg, runtime, prompter, {
      skipConfirm: true,
      skipDmPolicyPrompt: true,
    });

    expect(finalCfg.channels?.discord?.enabled).toBe(true);
    expect(finalCfg.plugins?.entries?.discord?.enabled).toBe(true);
    expect((finalCfg.channels?.discord as Record<string, unknown>)?.token).toBe(
      "discord-token-123",
    );
  });

  it("installs and configures Telegram when selected", async () => {
    let selectCount = 0;
    const select = vi.fn(async ({ message }: { message: string }) => {
      if (message === "Select a channel") {
        selectCount++;
        return selectCount === 1 ? "telegram" : "__done__";
      }
      return "__done__";
    });

    const text = vi.fn(async ({ message }: { message: string }) => {
      if (message.includes("Enter Telegram bot token")) {
        return "telegram-token-456";
      }
      return "";
    });

    const prompter = createPrompter({
      select: select as unknown as WizardPrompter["select"],
      text: text as unknown as WizardPrompter["text"],
      confirm: vi.fn(async () => true),
    });

    const runtime = createExitThrowingRuntime();
    const initialCfg = {} as OpenClawConfig;

    const finalCfg = await setupChannels(initialCfg, runtime, prompter, {
      skipConfirm: true,
      skipDmPolicyPrompt: true,
    });

    expect(finalCfg.channels?.telegram?.enabled).toBe(true);
    expect(finalCfg.plugins?.entries?.telegram?.enabled).toBe(true);
    expect((finalCfg.channels?.telegram as Record<string, unknown>)?.botToken).toBe(
      "telegram-token-456",
    );
  });

  it("handles multiple channels (Discord and Telegram)", async () => {
    let selectCount = 0;
    const select = vi.fn(async ({ message }: { message: string }) => {
      if (message === "Select a channel") {
        selectCount++;
        if (selectCount === 1) {
          return "discord";
        }
        if (selectCount === 2) {
          return "telegram";
        }
        return "__done__";
      }
      return "__done__";
    });

    const text = vi.fn(async ({ message }: { message: string }) => {
      if (message.includes("Enter Discord bot token")) {
        return "discord-token-abc";
      }
      if (message.includes("Enter Telegram bot token")) {
        return "telegram-token-def";
      }
      return "";
    });

    const prompter = createPrompter({
      select: select as unknown as WizardPrompter["select"],
      text: text as unknown as WizardPrompter["text"],
      confirm: vi.fn(async () => true),
    });

    const runtime = createExitThrowingRuntime();
    const initialCfg = {} as OpenClawConfig;

    const finalCfg = await setupChannels(initialCfg, runtime, prompter, {
      skipConfirm: true,
      skipDmPolicyPrompt: true,
    });

    expect(finalCfg.channels?.discord?.enabled).toBe(true);
    expect(finalCfg.plugins?.entries?.discord?.enabled).toBe(true);
    expect((finalCfg.channels?.discord as Record<string, unknown>)?.token).toBe(
      "discord-token-abc",
    );

    expect(finalCfg.channels?.telegram?.enabled).toBe(true);
    expect(finalCfg.plugins?.entries?.telegram?.enabled).toBe(true);
    expect((finalCfg.channels?.telegram as Record<string, unknown>)?.botToken).toBe(
      "telegram-token-def",
    );
  });
});
