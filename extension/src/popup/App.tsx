import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import type {
  AnalyzedField,
  AskAIRequest,
  AskAIResult,
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
        const stored = await browser.storage.local.get(storageKey);
        const last = stored[storageKey] as AskAIResult | undefined;

        if (last) {
          setResult(last);
        }
      } catch {
        setResult(null);
      }
    }

    void restoreResult();
  }, []);

  async function handleAskAI() {
    if (!task.trim() || loading) {
      return;
    }

    setLoading(true);

    try {
      const request: AskAIRequest = {
        type: "ASK_AI",
        task: task.trim(),
      };

      const response = (await browser.runtime.sendMessage(
        request
      )) as AskAIResult;

      setResult(response);

      // A fresh analysis starts by showing all detected elements.
      setElementFilter("protected");
    } finally {
      setLoading(false);
    }
  }

  const fields = result?.analysis?.fields ?? [];

  const protectedCount = fields.filter(
    (field) => field.sensitive
  ).length;

  const unprotectedCount = fields.length - protectedCount;

  const filteredFields = fields.filter((field) => {
    if (elementFilter === "protected") {
      return field.sensitive;
    }

    if (elementFilter === "unprotected") {
      return !field.sensitive;
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
          <div className="app__logo" aria-hidden="true">
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
          onChange={(e) => setTask(e.target.value)}
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
              {result
                ? result.sensitiveItemsProtected
                : "—"}
            </dd>
            <dt>Protected</dt>
          </div>

          <div className="app__stat app__stat--privacy">
            <dd>{result ? result.rawItemsSent : "—"}</dd>
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
                {filteredFields.map((field) => (
                  <article
                    className={`app__element ${
                      field.sensitive
                        ? "app__element--sensitive"
                        : ""
                    }`}
                    key={field.id}
                  >
                    <div className="app__element-heading">
                      <strong>
                        {getElementTitle(field)}
                      </strong>

                      {field.sensitive && (
                        <span className="app__sensitive">
                          <span aria-hidden="true">●</span>
                          Protected
                        </span>
                      )}
                    </div>

                    <div className="app__element-meta">
                      <span>{field.tag}</span>
                      <span>{field.type}</span>

                      {field.role && (
                        <span>role: {field.role}</span>
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
                      {field.bbox.width} × {field.bbox.height}
                    </div>
                  </article>
                ))}
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
          <span className="app__footer-shield">◆</span>
          Sensitive data processed locally
        </footer>
      </section>
    </main>
  );
}