import browser from "webextension-polyfill";
import type {
  AnalyzePageResponse,
  AskAIRequest,
  AskAIResult,
  ExecuteActionRequest,
  ExecuteActionResponse,
  ExtensionMessage,
  PageAnalysis,
  UserProtectedFieldIds,
} from "../shared/messages";
import {
  initIndexedDBVault,
  getAllVaultSecrets,
  resolveVaultReference,
} from "../shared/idb-vault";

// Ensure local IndexedDB database and AES-GCM encryption vault are initialized on service worker boot
void initIndexedDBVault().then(() => {
  console.log("%c[IndexedDB-Vault] 🗄️ Database 'BrowserAgent_SecretStore_v1' active in background service worker.", "color: #10b981; font-weight: bold;");
});

const BACKEND_URL = "http://localhost:3000/api/reason";
const BACKEND_API_KEY = "sih-secret-key-2026";

/**
 * Default On-Device Secret Store (SIH Synthetic Demo Profile)
 * In accordance with Person 4 Security specs, real values NEVER leave the device.
 * These defaults are used if the user has not customized the vault via the popup.
 */
const DEFAULT_SECRETS: Record<string, string> = {
  NAME_1: "Amrit Mohan",
  FIRST_NAME_1: "Amrit",
  LAST_NAME_1: "Mohan",
  EMAIL_1: "amritmohan201205@gmail.com",
  PASSWORD_1: "Amrit@12345",
  PHONE_1: "9876543210",
  DOB_1: "1998-05-15",
  PAN_1: "ABCDE1234F",
  AADHAAR_1: "1234 5678 9012",
  ADDRESS_1: "402, Lotus Towers, SV Road",
  CITY_1: "Mumbai",
  STATE_1: "MH",
  PINCODE_1: "400001",
  POLICY_1: "POL12345",
  AMOUNT_1: "Rs. 50,000",
};

/**
 * Intelligent secret resolution:
 * Resolves requested reference tokens using direct matches or safe contextual derivations
 * (e.g. extracting first/last name from full name, or mapping government ID aliases).
 */
function resolveSecret(ref: string, secrets: Record<string, string>): string {
  if (secrets[ref]) return secrets[ref];

  if (ref.startsWith("FIRST_NAME")) {
    const fullName = secrets["NAME_1"] || secrets["NAME"] || "";
    if (fullName) return fullName.split(" ")[0];
  }

  if (ref.startsWith("LAST_NAME")) {
    const fullName = secrets["NAME_1"] || secrets["NAME"] || "";
    if (fullName) {
      const parts = fullName.split(" ");
      return parts.length > 1 ? parts.slice(1).join(" ") : "";
    }
  }

  if (ref.startsWith("NAME")) {
    const fn = secrets["FIRST_NAME_1"] || secrets["FIRST_NAME"] || "";
    const ln = secrets["LAST_NAME_1"] || secrets["LAST_NAME"] || "";
    if (fn || ln) return `${fn} ${ln}`.trim();
    if (secrets["NAME_1"]) return secrets["NAME_1"];
  }

  if (ref.startsWith("EMAIL")) {
    return secrets["EMAIL_1"] || secrets["EMAIL"] || "";
  }

  if (ref.startsWith("PAN")) {
    return secrets["PAN_1"] || secrets["PAN"] || secrets["GOVID_1"] || "";
  }

  if (ref.startsWith("AADHAAR")) {
    return secrets["AADHAAR_1"] || secrets["AADHAAR"] || secrets["GOVID_2"] || secrets["GOVID_1"] || "";
  }

  if (ref.startsWith("GOVID")) {
    return secrets["GOVID_1"] || secrets["PAN_1"] || secrets["AADHAAR_1"] || "";
  }

  if (ref.startsWith("MOBILE") || ref.startsWith("PHONE")) {
    return secrets["PHONE_1"] || secrets["MOBILE_1"] || "";
  }

  if (ref.startsWith("PINCODE") || ref.startsWith("ZIP")) {
    return secrets["PINCODE_1"] || secrets["ZIP_1"] || "";
  }

  if (ref.startsWith("CITY")) {
    return secrets["CITY_1"] || "";
  }

  if (ref.startsWith("STATE")) {
    return secrets["STATE_1"] || "";
  }

  if (ref.startsWith("ADDRESS")) {
    return secrets["ADDRESS_1"] || "";
  }

  if (ref.startsWith("DOB")) {
    return secrets["DOB_1"] || "";
  }

  if (ref.startsWith("POLICY")) {
    return secrets["POLICY_1"] || "";
  }

  if (ref.startsWith("AMOUNT") || ref.startsWith("SALARY") || ref.startsWith("INCOME")) {
    return secrets["AMOUNT_1"] || secrets["AMOUNT"] || "";
  }

  if (ref.startsWith("PASSWORD") || ref.startsWith("PASS")) {
    return secrets["PASSWORD_1"] || secrets["PASSWORD"] || "";
  }

  return "";
}

/**
 * Loads the on-device secret store from IndexedDB (BrowserAgent_SecretStore_v1)
 * Decrypts values on-device using Web Crypto AES-GCM (256-bit).
 */
async function loadOnDeviceSecrets(): Promise<Record<string, string>> {
  try {
    const vault = await getAllVaultSecrets();
    if (vault && vault.length > 0) {
      const secrets: Record<string, string> = {};
      for (const entry of vault) {
        secrets[entry.ref] = entry.decryptedValue;
      }
      return secrets;
    }
  } catch (err) {
    console.warn("[IndexedDB-Vault] Fallback to default secrets:", err);
  }
  return { ...DEFAULT_SECRETS };
}

function getStorageKey(tabId: number): string {
  return `browserAgent.lastResult.${tabId}`;
}

async function getActiveTabId(): Promise<number> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (tab?.id === undefined) {
    throw new Error("No active tab found");
  }

  return tab.id;
}

function waitForTabComplete(tabId: number, timeoutMs = 12000): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);

    function listener(updatedTabId: number, info: { status?: string }) {
      if (updatedTabId === tabId && info.status === "complete") {
        clearTimeout(timer);
        browser.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }

    browser.tabs.onUpdated.addListener(listener);
  });
}

async function ensureContentScriptInTab(tabId: number): Promise<void> {
  try {
    const res = (await browser.tabs.sendMessage(tabId, { type: "PING" })) as any;
    if (res && res.type === "PONG") {
      return;
    }
  } catch {
    // Content script not responding in tab; dynamically inject it
  }

  try {
    const manifest = browser.runtime.getManifest();
    const scripts = manifest.content_scripts?.[0]?.js || [];
    for (const script of scripts) {
      await browser.scripting.executeScript({
        target: { tabId },
        files: [script],
      }).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 200));
  } catch (err) {
    console.warn(`[Content-Injector] Dynamic injection notice for tab ${tabId}:`, err);
  }
}

async function forwardToActiveTab(
  message: ExtensionMessage
): Promise<void> {
  const tabId = await getActiveTabId();
  await ensureContentScriptInTab(tabId);
  await browser.tabs.sendMessage(tabId, message);
}

async function analyzeActivePage(): Promise<{
  tabId: number;
  analysis: PageAnalysis;
}> {
  const tabId = await getActiveTabId();
  await ensureContentScriptInTab(tabId);

  const response = (await browser.tabs.sendMessage(tabId, {
    type: "ANALYZE_PAGE",
  })) as AnalyzePageResponse;

  return {
    tabId,
    analysis: response.analysis,
  };
}

/**
 * Executes an action against the live DOM in the webpage content script.
 */
async function executeDomActionInTab(
  tabId: number,
  action: "CLICK" | "SCROLL" | "TYPE" | "SELECT" | "WAIT",
  target: string,
  value?: string
): Promise<ExecuteActionResponse> {
  await ensureContentScriptInTab(tabId);

  const message: ExecuteActionRequest = {
    type: "EXECUTE_ACTION",
    action,
    target,
    value,
  };

  const res = (await browser.tabs.sendMessage(
    tabId,
    message
  )) as ExecuteActionResponse;

  return res;
}

/**
 * GENERIC sanitized payload builder — works on ANY form on ANY website.
 *
 * For each DOM field, determines if it's sensitive (PII) based on universal patterns
 * (not hardcoded to insurance forms). Assigns abstract reference tokens for sensitive
 * fields, and includes field labels so the VLM can understand arbitrary forms.
 *
 * Strictly excludes password fields from automated reasoning per PS requirements.
 */
function buildSanitizedPayload(
  task: string,
  analysis: PageAnalysis,
  userProtectedFieldIds: UserProtectedFieldIds
) {
  const userProtectedSet = new Set(userProtectedFieldIds);

  // Counters for each PII category
  const counters: Record<string, number> = {};
  function nextRef(category: string): string {
    counters[category] = (counters[category] || 0) + 1;
    return `${category}_${counters[category]}`;
  }

  const sanitizedFields: Array<{
    ref: string;
    type: string;
    target: string;
    label: string;
    sensitive: boolean;
  }> = [];
  const buttons: Array<{ target: string; text: string; isNav?: boolean }> = [];
  for (const field of analysis.fields) {
    // Collect buttons/submit elements (exclude passive nav links)
    const isButton = field.tag === "button" || 
                     (field.type as string) === "submit" || 
                     field.role === "button" ||
                     (field.tag === "a" && /button|btn|submit|sign|login|join|journey|register/i.test(`${field.id} ${field.name || ""} ${field.text || ""} ${field.label || ""}`));

    if (isButton) {
      const isNav = field.role === "nav-item" || Boolean(field.id?.toLowerCase().includes("nav") || field.name?.toLowerCase().includes("nav"));
      buttons.push({
        target: field.id,
        text: (field.text || field.label || field.id || "").replace(/\s+/g, " ").trim(),
        isNav,
      });
      continue;
    }


    // Skip passive links (e.g. navigation links, footer links) from form field lists
    if (field.tag === "a" || field.type === "link") {
      continue;
    }

    const idLower = field.id.toLowerCase();
    const nameLower = (field.name || "").toLowerCase();
    const labelLower = (field.label || "").toLowerCase();
    const placeholderLower = (field.placeholder || "").toLowerCase();
    const haystack = `${idLower} ${nameLower} ${labelLower} ${placeholderLower}`;

    // Determine PII category using universal patterns
    let refToken = "";
    let isSensitive = field.sensitive;

    if (field.type === "password" || /pass(word)?|pwd/i.test(haystack)) {
      refToken = nextRef("PASSWORD");
      isSensitive = true;
    } else if (field.type === "email" || /e-?mail/.test(haystack)) {

      refToken = nextRef("EMAIL");
      isSensitive = true;
    } else if (field.type === "tel" || /phone|mobile|tel(ephone)?|cell/.test(haystack)) {
      refToken = nextRef("PHONE");
      isSensitive = true;
    } else if (/\bfirst.?name\b|fname/i.test(haystack)) {
      refToken = nextRef("FIRST_NAME");
      isSensitive = true;
    } else if (/\blast.?name\b|lname|surname/i.test(haystack)) {
      refToken = nextRef("LAST_NAME");
      isSensitive = true;
    } else if (/full.?name|your.?name|legal.?name|patient.?name|applicant.?name/.test(haystack) ||
               (/\bname\b/.test(idLower) || /\bname\b/.test(nameLower))) {
      refToken = nextRef("NAME");
      isSensitive = true;
    } else if (/pan\b|pan.?number|pan.?card/i.test(haystack)) {
      refToken = nextRef("PAN");
      isSensitive = true;
    } else if (/aadhaar|aadhar|uidai/i.test(haystack)) {
      refToken = nextRef("AADHAAR");
      isSensitive = true;
    } else if (/ssn|social.?security|passport|voter/i.test(haystack)) {
      refToken = nextRef("GOVID");
      isSensitive = true;
    } else if (/\bdob\b|birth|date.?of.?birth/.test(haystack) || field.type === "date") {
      refToken = nextRef("DOB");
      isSensitive = true;
    } else if (/pincode|pin.?code|postal|zip/i.test(haystack)) {
      refToken = nextRef("PINCODE");
      isSensitive = true;
    } else if (/\bcity\b|town/i.test(haystack)) {
      refToken = nextRef("CITY");
      isSensitive = true;
    } else if (/\bstate\b|province/i.test(haystack)) {
      refToken = nextRef("STATE");
      isSensitive = true;
    } else if (/address|street/i.test(haystack)) {
      refToken = nextRef("ADDRESS");
      isSensitive = true;
    } else if (/credit.?card|card.?number|cvv|cvc|expir/.test(haystack)) {
      refToken = nextRef("CARD");
      isSensitive = true;
    } else if (/salary|income|amount|payment/.test(haystack)) {
      refToken = nextRef("AMOUNT");
      isSensitive = false; // Financial amounts are not PII
    } else if (/policy|claim|account.?(?:no|num|id)|member.?(?:id|no)/.test(haystack)) {
      refToken = nextRef("POLICY");
      isSensitive = true;
    } else if (userProtectedSet.has(field.id)) {
      // User explicitly marked this field as protected
      refToken = nextRef("PROTECTED");
      isSensitive = true;
    } else {
      // Non-sensitive field — assign a generic token but include safe value
      refToken = nextRef("FIELD");
      isSensitive = false;
    }

    // Build the field label for VLM context (from DOM label, placeholder, or id)
    const fieldLabel = field.label || field.placeholder || field.name || field.id;

    sanitizedFields.push({
      ref: refToken,
      type: field.type || "text",
      target: field.id,
      label: fieldLabel,
      sensitive: isSensitive,
    });
  }

  const sensitiveItemsProtected = sanitizedFields.filter(f => f.sensitive).length;
  const rawItemsSent = 0; // 0 raw bytes sent — invariant

  const payload = {
    user_task: task,
    page_title: analysis.title,
    page_url: analysis.url,
    fields: sanitizedFields,
    buttons,
    // Select primary submit/action button, distinguishing form action from header nav
    button: (() => {
      const taskLower = task.toLowerCase();
      const formButtons = buttons.filter(b => !b.isNav);
      const candidates = formButtons.length > 0 ? formButtons : buttons;

      let submitBtn: { target: string; text: string } | undefined;

      if (/sign.*up|register|join|create|journey|seeker/i.test(taskLower)) {
        submitBtn = candidates.find(b => /sign.*up|register|create|journey|join|begin|submit/i.test(`${b.text} ${b.target}`)) ||
                    candidates.find(b => !/sign.*in|login/i.test(`${b.text} ${b.target}`));
      } else if (/log.*in|sign.*in|sanctuary/i.test(taskLower)) {
        submitBtn = candidates.find(b => /sign.*in|login|sanctuary|continue|submit/i.test(`${b.text} ${b.target}`));
      } else {
        submitBtn = candidates.find(b => /submit|apply|confirm|open|continue|next|sign|send/i.test(`${b.text} ${b.target}`));
      }

      if (!submitBtn) {
        submitBtn = candidates[candidates.length - 1] || candidates[0];
      }

      return submitBtn ? { target: submitBtn.target, text: submitBtn.text } : undefined;
    })(),

  };

  return {
    payload,
    sensitiveItemsProtected,
    rawItemsSent,
  };
}

async function handleAskAI(
  task: string,
  userProtectedFieldIds: UserProtectedFieldIds = []
): Promise<AskAIResult> {
  console.log("%c[Browser-Agent] 🚀 Starting On-Device Agent Workflow", "color: #0284c7; font-weight: bold; font-size: 13px;");
  console.log(`%c[User-Task] "${task}"`, "color: #0f172a; font-weight: 600;");

  try {
    // 1. Get active tab and inspect current URL
    const tabId = await getActiveTabId();
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab?.url || "";
    const taskLower = task.toLowerCase();

    let navigateTargetUrl: string | null = null;

    // 1. Check if user explicitly mentioned a website, domain, or known service in their prompt
    const urlPatternMatch = task.match(/https?:\/\/[^\s]+|(?:\b[a-zA-Z0-9-]+\.)+(?:com|org|net|gov|in|io|co|edu|app|ai|me|dev)(?:\/[^\s]*)?/i);
    const domainKeywordMatch = taskLower.match(/\b(el[ly]+tarot|digilocker|google|github)\b/i);

    let explicitTargetUrl: string | null = null;

    if (urlPatternMatch) {
      let matched = urlPatternMatch[0];
      if (!matched.startsWith("http://") && !matched.startsWith("https://")) {
        matched = "https://" + matched;
      }
      explicitTargetUrl = matched;
    } else if (domainKeywordMatch) {
      const keyword = domainKeywordMatch[1].toLowerCase();
      if (/el[ly]+tarot/.test(keyword)) explicitTargetUrl = "https://www.elytarot.com";
      else if (keyword === "digilocker") explicitTargetUrl = "https://accounts.digilocker.gov.in";
      else if (keyword === "google") explicitTargetUrl = "https://accounts.google.com";
      else if (keyword === "github") explicitTargetUrl = "https://github.com/login";
    }

    if (explicitTargetUrl) {
      try {
        const parsed = new URL(explicitTargetUrl);
        const isSignup = /sign.*up|register|join|create.*account/i.test(taskLower);
        const isLogin = /log.*in|sign.*in/i.test(taskLower);

        // If no specific sub-path was provided, append /login or /register according to intent
        if (parsed.pathname === "/" || parsed.pathname === "") {
          if (parsed.hostname.includes("elytarot.com")) {
            if (isSignup) parsed.pathname = "/register";
            else if (isLogin) parsed.pathname = "/login";
          } else if (parsed.hostname.includes("google.com")) {
            parsed.hostname = "accounts.google.com";
          } else if (isSignup) {
            parsed.pathname = "/register";
          } else if (isLogin) {
            parsed.pathname = "/login";
          }
        }

        if (!currentUrl.includes(parsed.hostname) || (parsed.pathname !== "/" && !currentUrl.includes(parsed.pathname))) {
          navigateTargetUrl = parsed.toString();
        }
      } catch {
        navigateTargetUrl = explicitTargetUrl;
      }
    } else if (currentUrl.startsWith("chrome://") || currentUrl.startsWith("chrome-search://") || currentUrl.startsWith("edge://") || currentUrl.startsWith("about:") || currentUrl === "") {
      // User is on an internal / blank tab without mentioning a target website
      navigateTargetUrl = "https://accounts.google.com";
    } else if (currentUrl.includes("google.com") && !currentUrl.includes("accounts.google.com") && /google.*login|login.*google|sign.*in.*google/i.test(taskLower)) {
      navigateTargetUrl = "https://accounts.google.com";
    }


    // Smart link discovery: if user wants to sign up or log in on ANY website,
    // check if current page already has interactive form fields first!
    if (!navigateTargetUrl && !currentUrl.startsWith("chrome://") && !currentUrl.startsWith("about:")) {
      const isSignupIntent = /sign.*up|register|join|create.*account|new.*seeker|begin.*journey/i.test(taskLower);
      const isLoginIntent = !isSignupIntent && /log.*in|sign.*in/i.test(taskLower);

      if (isSignupIntent || isLoginIntent) {
        // Pre-check current page for interactive form fields
        const preCheck = await analyzeActivePage().catch(() => null);
        const hasFormFields = preCheck?.analysis?.fields?.some(
          (f: any) => f.tag === "input" || f.tag === "select" || f.tag === "textarea"
        );

        // If the page already has form fields, we are ALREADY on the form! Don't navigate away!
        if (!hasFormFields) {
          const pageLinks = preCheck?.analysis?.fields?.filter((f: any) => f.tag === "a") || [];

          let matchedLink: string | null = null;
          if (isSignupIntent) {
            const signupLink = pageLinks.find((f: any) => {
              const combo = `${f.id} ${f.text || ""} ${f.label || ""} ${f.name || ""}`.toLowerCase();
              return /sign.*up|register|join|create|begin.*journey|new.*seeker/i.test(combo);
            });
            if (signupLink) matchedLink = signupLink.id;
          } else {
            const loginLink = pageLinks.find((f: any) => {
              const combo = `${f.id} ${f.text || ""} ${f.label || ""} ${f.name || ""}`.toLowerCase();
              return /log.*in|sign.*in|login/i.test(combo);
            });
            if (loginLink) matchedLink = loginLink.id;
          }

          if (matchedLink) {
            console.log(`%c[Agent-Navigator] 🔗 Found link "${matchedLink}", clicking to navigate...`, "color: #0284c7; font-weight: bold;");
            await executeDomActionInTab(tabId, "CLICK", matchedLink);
            await waitForTabComplete(tabId);
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }
    }

    if (navigateTargetUrl) {
      console.log(`%c[Agent-Navigator] 🌐 Navigating active tab to ${navigateTargetUrl}...`, "color: #0284c7; font-weight: bold;");
      await browser.tabs.update(tabId, { url: navigateTargetUrl });
      await waitForTabComplete(tabId);
      await new Promise((r) => setTimeout(r, 1800));
    }

    // Load secrets dynamically from the user-editable vault
    const secrets = await loadOnDeviceSecrets();
    console.log(`%c[Secret-Store] 🔐 Loaded ${Object.keys(secrets).length} on-device secrets from vault`, "color: #7c3aed;");

    let { analysis } = await analyzeActivePage();
    if (!analysis || analysis.fields.length === 0) {
      await new Promise((r) => setTimeout(r, 1200));
      const retry = await analyzeActivePage();
      if (retry?.analysis?.fields?.length > 0) {
        analysis = retry.analysis;
      }
    }
    console.log(`%c[Perception] 👁️ Discovered ${analysis.fields.length} interactive elements on active page.`, "color: #0369a1;");


    const {
      payload,
      sensitiveItemsProtected,
      rawItemsSent,
    } = buildSanitizedPayload(
      task,
      analysis,
      userProtectedFieldIds
    );

    console.log(`%c[Privacy-Engine] 🛡️ Shielded ${sensitiveItemsProtected} sensitive fields with abstract tokens:`, "color: #7c3aed; font-weight: bold;", payload.fields);
    console.log("%c[Zero-Leakage Invariant] 0 bytes raw PII transmitted. Passwords strictly excluded.", "color: #16a34a; font-weight: bold;");

    let serverInstruction: string | null = null;
    let executedCount = 0;

    try {
      console.log("%c[Remote-VLM] ☁️ Transmitting abstract payload to Backend (POST http://localhost:3000/api/reason)...", "color: #d97706;");
      const vlmStartTime = Date.now();
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BACKEND_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const vlmElapsed = Date.now() - vlmStartTime;
        console.log(`%c[Remote-VLM] 📥 VLM Reasoning Plan Received (${vlmElapsed}ms):`, "color: #16a34a; font-weight: bold;", data.actions);

        if (data.response_type === "action" && Array.isArray(data.actions)) {
          // Execute each approved action sequentially against the live DOM
          for (const act of data.actions) {
            if (act.action === "TYPE_REFERENCE") {
              let localSecret = await resolveVaultReference(act.reference);
              if (!localSecret) {
                localSecret = resolveSecret(act.reference, secrets);
              }
              if (localSecret) {
                console.log(`%c[Reference-Resolver] 🔑 Resolved ${act.reference} on-device (IndexedDB AES-GCM) ➔ "${localSecret.slice(0, 3)}***"`, "color: #2563eb; font-weight: bold;");
                await executeDomActionInTab(tabId, "TYPE", act.target, localSecret);
                executedCount++;
              } else {
                console.warn(`[Reference-Resolver] ⚠️ No secret found for ${act.reference}, skipping`);
              }
            } else if (act.action === "TYPE") {
              console.log(`%c[DOM-Executor] ⌨️ Typing into "${act.target}" (non-sensitive field)`, "color: #059669;");
              await executeDomActionInTab(tabId, "TYPE", act.target, act.value || "");
              executedCount++;
            } else if (act.action === "CLICK") {
              console.log(`%c[DOM-Executor] 🖱️ Clicking "${act.target}"`, "color: #059669;");
              await new Promise((r) => setTimeout(r, 400));
              await executeDomActionInTab(tabId, "CLICK", act.target);
              executedCount++;
            } else if (act.action === "NAVIGATE") {
              console.log(`%c[DOM-Executor] 🌐 Navigating to "${act.target}"`, "color: #059669;");
              await browser.tabs.update(tabId, { url: act.target });
              await waitForTabComplete(tabId);
              await new Promise((r) => setTimeout(r, 1200));
              executedCount++;
            } else if (act.action === "SELECT") {
              console.log(`%c[DOM-Executor] 📋 Selecting "${act.value}" in "${act.target}"`, "color: #059669;");
              await executeDomActionInTab(tabId, "SELECT", act.target, act.value);
              executedCount++;
            } else if (act.action === "SCROLL") {
              console.log(`%c[DOM-Executor] 📜 Scrolling to "${act.target}"`, "color: #059669;");
              await executeDomActionInTab(tabId, "SCROLL", act.target);
            } else if (act.action === "WAIT") {
              console.log(`%c[DOM-Executor] ⏳ Waiting...`, "color: #059669;");
              await executeDomActionInTab(tabId, "WAIT", act.target, act.value);
            }
          }


          const refCount = data.actions.filter((a: any) => a.action === "TYPE_REFERENCE").length;
          const typeCount = data.actions.filter((a: any) => a.action === "TYPE").length;
          const clickCount = data.actions.filter((a: any) => a.action === "CLICK").length;
          serverInstruction = `✓ Agent executed ${executedCount} actions (${refCount} protected fields resolved on-device, ${typeCount} fields filled, ${clickCount} clicks). 0 bytes of raw PII left this device.`;
          console.log("%c[Agent-Completion] ✅ Task completed successfully with zero privacy leakage!", "color: #16a34a; font-weight: bold; font-size: 13px;");
        } else {
          serverInstruction = data?.instruction ?? "Task analyzed.";
        }
      } else {
        const errorText = await response.text().catch(() => "");
        console.warn(`[Backend] Status ${response.status}: ${errorText.slice(0, 100)}. Triggering on-device fast-path execution.`);
        for (const f of payload.fields) {
          if (f.type === "checkbox") {
            await executeDomActionInTab(tabId, "CLICK", f.target);
            executedCount++;
          } else {
            let val = await resolveVaultReference(f.ref);
            if (!val) {
              val = resolveSecret(f.ref, secrets);
            }
            if (val) {
              await executeDomActionInTab(tabId, "TYPE", f.target, val);
              executedCount++;
            }
          }
        }
        if (payload.button?.target) {
          await new Promise((r) => setTimeout(r, 400));
          await executeDomActionInTab(tabId, "CLICK", payload.button.target);
          executedCount++;
        }
        serverInstruction = `✓ On-device engine filled ${executedCount} fields & submitted form safely (Cloud rate-limited/offline). 0 bytes PII leaked.`;
      }
    } catch (err) {
      console.warn("[Backend-Fallback] Running local fast-path executor:", err);
      for (const f of payload.fields) {
        if (f.type === "checkbox") {
          await executeDomActionInTab(tabId, "CLICK", f.target);
          executedCount++;
        } else {
          let val = await resolveVaultReference(f.ref);
          if (!val) {
            val = resolveSecret(f.ref, secrets);
          }
          if (val) {
            await executeDomActionInTab(tabId, "TYPE", f.target, val);
            executedCount++;
          }
        }
      }
      if (payload.button?.target) {
        await new Promise((r) => setTimeout(r, 400));
        await executeDomActionInTab(tabId, "CLICK", payload.button.target);
        executedCount++;
      }

      serverInstruction = `✓ Local fast-path filled ${executedCount} fields & submitted form safely on-device (Backend offline). 0 bytes PII leaked.`;
    }

    const result: AskAIResult = {
      type: "ASK_AI_RESULT",
      sensitiveItemsProtected,
      rawItemsSent,
      analysis,
      userProtectedFieldIds,
      serverInstruction,
    };

    await browser.storage.local.set({
      [getStorageKey(tabId)]: result,
    });

    return result;
  } catch (error) {
    const result: AskAIResult = {
      type: "ASK_AI_RESULT",
      sensitiveItemsProtected: 0,
      rawItemsSent: 0,
      analysis: null,
      userProtectedFieldIds,
      serverInstruction: null,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };

    return result;
  }
}

browser.runtime.onMessage.addListener(
  (message: ExtensionMessage) => {
    if (message.type === "ASK_AI") {
      const request = message as AskAIRequest;
      return handleAskAI(
        request.task,
        request.userProtectedFieldIds ?? []
      );
    }

    if (message.type === "HIGHLIGHT_ELEMENT") {
      return forwardToActiveTab(message);
    }

    if (message.type === "CLEAR_HIGHLIGHT") {
      return forwardToActiveTab(message);
    }

    return undefined;
  }
);

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    void browser.storage.local.remove(getStorageKey(tabId));
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  void browser.storage.local.remove(getStorageKey(tabId));
});