import { API_ORIGIN } from "@equalens/shared/config";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNavigationHandler, openOptionsPage, openReportPage } from "./navigation";

describe("Phase 8 navigation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens extension settings and accepts only canonical report URLs", async () => {
    const openOptions = vi.fn().mockResolvedValue(undefined);
    const createTab = vi.fn().mockResolvedValue({});
    const handler = createNavigationHandler(openOptions, createTab);
    const respond = vi.fn();

    expect(handler({ type: "unrelated" }, {} as chrome.runtime.MessageSender, respond)).toBeUndefined();
    expect(handler({ type: "equalens:open-options" }, {} as chrome.runtime.MessageSender, respond)).toBe(true);
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: true }));
    expect(openOptions).toHaveBeenCalledOnce();

    respond.mockClear();
    const reportUrl = `${API_ORIGIN}/report/012345abcdef`;
    expect(handler({ type: "equalens:open-report", url: reportUrl }, {} as chrome.runtime.MessageSender, respond)).toBe(true);
    await vi.waitFor(() => expect(createTab).toHaveBeenCalledWith({ url: reportUrl, active: true }));
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: true }));
  });

  it.each([
    "https://attacker.example/report/012345abcdef",
    `${API_ORIGIN}/report/012345abcdef?print=true`,
    `${API_ORIGIN}/report/not-an-id`,
  ])("rejects an unsafe report URL: %s", async (url) => {
    const createTab = vi.fn().mockResolvedValue({});
    const respond = vi.fn();
    const handler = createNavigationHandler(vi.fn(), createTab);

    handler({ type: "equalens:open-report", url }, {} as chrome.runtime.MessageSender, respond);

    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({
      ok: false,
      error: "EquaLens rejected an invalid report URL",
    }));
    expect(createTab).not.toHaveBeenCalled();
  });

  it("checks background responses for client navigation requests", async () => {
    const sendMessage = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: "Tab creation failed" })
      .mockResolvedValueOnce({ unexpected: true });
    vi.stubGlobal("chrome", { runtime: { sendMessage } });

    await expect(openOptionsPage()).resolves.toBeUndefined();
    await expect(openReportPage(`${API_ORIGIN}/report/012345abcdef`)).rejects.toThrow("Tab creation failed");
    await expect(openOptionsPage()).rejects.toThrow("invalid navigation response");
  });
});
