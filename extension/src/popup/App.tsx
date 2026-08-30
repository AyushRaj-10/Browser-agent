import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import type {
  AnalyzedField,
  AskAIRequest,
  AskAIResult,
  UserProtectedFieldIds,
} from "../shared/messages";

type ElementFilter = "all" | "protected" | "unprotected";

function getStorageKey(tabId: number): string {
  return `browserAgent.lastResult.${tabId}`;
}

function getElementTitle(field: AnalyzedField): string {
  return (
    field.label ||
    field.text ||
    field.name ||
    field.placeholder ||
    field.id
  );
}

export default function App() {
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskAIResult | null>(null);

  const [elementFilter, setElementFilter] =
    useState<ElementFilter>("protected");

  const [userProtectedFieldIds, setUserProtectedFieldIds] =
    useState<UserProtectedFieldIds>([]);

  const [protectionChanged, setProtectionChanged] =
    useState(false);

  // Restore the analysis belonging to the currently active tab.
  useEffect(() => {
    async function restoreResult() {
      try {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (tab?.id === undefined) {
          return;
        }

        const storageKey = getStorageKey(tab.id);
        const stored =
          await browser.storage.local.get(storageKey);

        const last = stored[storageKey] as
          | AskAIResult
          | undefined;

        if (last) {
          setResult(last);
          setUserProtectedFieldIds(
            last.userProtectedFieldIds ?? []
          );
        }
      } catch {
        setResult(null);
        setUserProtectedFieldIds([]);
      }
    }

    void restoreResult();
  }, []);

  function isUserProtected(
    field: AnalyzedField
  ): boolean {
    return userProtectedFieldIds.includes(field.id);
  }

  function isEffectivelyProtected(
    field: AnalyzedField
  ): boolean {
    return field.sensitive || isUserProtected(field);
  }

  function protectField(fieldId: string) {
    setUserProtectedFieldIds((current) => {
      if (current.includes(fieldId)) {
        return current;
      }

      return [...current, fieldId];
    });

    setProtectionChanged(true);
  }

  function undoUserProtection(fieldId: string) {
    setUserProtectedFieldIds((current) =>
      current.filter((id) => id !== fieldId)
    );

    setProtectionChanged(true);
  }

  /**
   * Ask the content script, through the background worker,
   * to highlight the webpage element represented by this card.
   *
   * Highlight failures are intentionally ignored because this is
   * visual assistance and should never break the popup itself.
   */
  function highlightField(fieldId: string) {
    void browser.runtime
      .sendMessage({
        type: "HIGHLIGHT_ELEMENT",
        elementId: fieldId,
      })
      .catch(() => undefined);
  }

  /**
   * Remove any browser-agent highlight currently visible
   * on the webpage.
   */
  function clearHighlight() {
    void browser.runtime
      .sendMessage({
        type: "CLEAR_HIGHLIGHT",
      })
      .catch(() => undefined);
  }

  async function handleAskAI() {
    if (!task.trim() || loading) {
      return;
    }

    setLoading(true);

    try {
      const request: AskAIRequest = {
        type: "ASK_AI",
        task: task.trim(),
        userProtectedFieldIds,
      };

      const response = (await browser.runtime.sendMessage(
        request
      )) as AskAIResult;

      setResult(response);

      // Use the exact protection state accepted by the background.
      setUserProtectedFieldIds(
        response.userProtectedFieldIds ?? []
      );

      setProtectionChanged(false);

      // Privacy-first default view.
      setElementFilter("protected");
    } finally {
      setLoading(false);
    }
  }

  const fields = result?.analysis?.fields ?? [];

  const protectedCount = fields.filter((field) =>
    isEffectivelyProtected(field)
  ).length;

  const unprotectedCount =
    fields.length - protectedCount;

  const filteredFields = fields.filter((field) => {
    const protectedField =
      isEffectivelyProtected(field);

    if (elementFilter === "protected") {
      return protectedField;
    }

    if (elementFilter === "unprotected") {
      return !protectedField;
    }

    return true;
  });

  const analysisSuccessful = Boolean(
    result?.analysis && !result?.error
  );

  return (
    <main className="app">
      {/* Product header */}
      <header className="app__header">
        <div className="app__brand">
          <div
            className="app__logo"
            aria-hidden="true"
          >
            ◈
          </div>

          <div>
            <h1>Browser Agent</h1>
            <p className="app__subtitle">
              Privacy-preserving browser intelligence
            </p>
          </div>
        </div>

        <span className="app__local-status">
          <span className="app__status-dot" />
          LOCAL
        </span>
      </header>

      {/* User task */}
      <section className="app__task">
        <label htmlFor="task-input">
          What should the agent do?
        </label>

        <textarea
          id="task-input"
          placeholder="e.g. Analyze this form and identify the fields"
          value={task}
          onChange={(event) =>
            setTask(event.target.value)
          }
          rows={3}
        />

        <button
          onClick={handleAskAI}
          disabled={loading || !task.trim()}
        >
          {loading ? (
            <>
              <span className="app__spinner" />
              Processing…
            </>
          ) : (
            <>
              <span aria-hidden="true">✦</span>
              Ask Agent
            </>
          )}
        </button>
      </section>

      {/* Analysis result */}
      <section className="app__dashboard">
        {result?.error && (
          <p className="app__error">
            Error: {result.error}
          </p>
        )}

        {analysisSuccessful && result?.analysis && (
          <div className="app__success">
            <div className="app__success-icon">✓</div>

            <div>
              <strong>Analysis complete</strong>
              <span>
                {result.analysis.title || "Current page"} ·{" "}
                {fields.length} interactive elements
              </span>
            </div>
          </div>
        )}

        <h2>Privacy &amp; Perception</h2>

        <dl className="app__stats">
          <div className="app__stat">
            <dd>{result ? fields.length : "—"}</dd>
            <dt>Elements</dt>
          </div>

          <div className="app__stat app__stat--protected">
            <dd>
              {result ? protectedCount : "—"}
            </dd>
            <dt>Protected</dt>
          </div>

          <div className="app__stat app__stat--privacy">
            <dd>
              {result ? result.rawItemsSent : "—"}
            </dd>
            <dt>Raw PII sent</dt>
          </div>
        </dl>

        {result?.analysis && (
          <div className="app__page-info">
            <div>
              <span className="app__page-label">
                CURRENT PAGE
              </span>

              <strong>
                {result.analysis.title || "Current Page"}
              </strong>
            </div>

            <span className="app__page-count">
              {fields.length} elements
            </span>
          </div>
        )}

        {protectionChanged && (
          <div className="app__protection-notice">
            <span aria-hidden="true">◆</span>

            <p>
              Protection preferences changed. They will
              apply to your next agent request.
            </p>
          </div>
        )}

        {fields.length > 0 && (
          <div className="app__elements">
            <div className="app__section-heading">
              <h2>Page Perception</h2>

              <span>
                {elementFilter === "all"
                  ? `${fields.length} detected`
                  : `${filteredFields.length} of ${fields.length} shown`}
              </span>
            </div>

            <div className="app__filter">
              <label htmlFor="element-filter">
                Show
              </label>

              <select
                id="element-filter"
                value={elementFilter}
                onChange={(event) =>
                  setElementFilter(
                    event.target.value as ElementFilter
                  )
                }
              >
                <option value="all">
                  All elements ({fields.length})
                </option>

                <option value="protected">
                  Protected ({protectedCount})
                </option>

                <option value="unprotected">
                  Unprotected ({unprotectedCount})
                </option>
              </select>
            </div>

            {filteredFields.length > 0 ? (
              <div className="app__element-list">
                {filteredFields.map((field) => {
                  const userProtected =
                    isUserProtected(field);

                  const protectedField =
                    isEffectivelyProtected(field);

                  return (
                    <article
                      className={`app__element ${
                        protectedField
                          ? "app__element--sensitive"
                          : ""
                      }`}
                      key={field.id}
                      onMouseEnter={() =>
                        highlightField(field.id)
                      }
                      onMouseLeave={clearHighlight}
                    >
                      <div className="app__element-heading">
                        <strong>
                          {getElementTitle(field)}
                        </strong>

                        {field.sensitive ? (
                          <div className="app__protection-badge-wrapper">
                            <span
                              className="app__sensitive app__sensitive--locked"
                              tabIndex={0}
                              aria-label="Automatically protected sensitive field"
                              onMouseDown={(event) =>
                                event.preventDefault()
                              }
                            >
                              <span aria-hidden="true">
                                🔒
                              </span>
                              Auto-protected
                              <span
                                className="app__info-icon"
                                aria-hidden="true"
                              >
                                ⓘ
                              </span>
                            </span>

                            <div
                              className="app__privacy-tooltip"
                              role="tooltip"
                            >
                              This field was automatically
                              identified as sensitive.
                              Protection cannot be disabled.
                            </div>
                          </div>
                        ) : userProtected ? (
                          <div className="app__manual-protection">
                            <span className="app__sensitive app__sensitive--manual">
                              <span aria-hidden="true">
                                ◆
                              </span>
                              Protected by you
                            </span>

                            <button
                              type="button"
                              className="app__protection-action app__protection-action--undo"
                              onClick={() =>
                                undoUserProtection(
                                  field.id
                                )
                              }
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="app__protection-action"
                            onClick={() =>
                              protectField(field.id)
                            }
                          >
                            Protect
                          </button>
                        )}
                      </div>

                      <div className="app__element-meta">
                        <span>{field.tag}</span>
                        <span>{field.type}</span>

                        {field.role && (
                          <span>
                            role: {field.role}
                          </span>
                        )}

                        {field.required && (
                          <span>required</span>
                        )}

                        {field.disabled && (
                          <span>disabled</span>
                        )}

                        {field.checked !== null && (
                          <span>
                            {field.checked
                              ? "checked"
                              : "unchecked"}
                          </span>
                        )}
                      </div>

                      <div className="app__element-position">
                        <span>POSITION</span>
                        {field.bbox.x}, {field.bbox.y}

                        <span className="app__position-divider">
                          •
                        </span>

                        <span>SIZE</span>
                        {field.bbox.width} ×{" "}
                        {field.bbox.height}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="app__filter-empty">
                No elements match this filter.
              </div>
            )}
          </div>
        )}

        {result?.serverInstruction && (
          <div className="app__instruction">
            <span>AGENT RESPONSE</span>
            <p>{result.serverInstruction}</p>
          </div>
        )}

        <footer className="app__footer">
          <span className="app__footer-shield">
            ◆
          </span>
          Sensitive data processed locally
        </footer>
      </section>
    </main>
  );
}