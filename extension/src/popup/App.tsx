import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import type {
  AnalyzedField,
  AskAIRequest,
  AskAIResult,
} from "../shared/messages";

const STORAGE_KEY = "browserAgent.lastResult";

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

  useEffect(() => {
    browser.storage.local.get(STORAGE_KEY).then((stored) => {
      const last = stored[STORAGE_KEY] as AskAIResult | undefined;

      if (last) {
        setResult(last);
      }
    });
  }, []);

  async function handleAskAI() {
    if (!task.trim() || loading) return;

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
    } finally {
      setLoading(false);
    }
  }

  const fields = result?.analysis?.fields ?? [];
  const analysisSuccessful = Boolean(result?.analysis && !result?.error);

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
              <span>{fields.length} detected</span>
            </div>

            <div className="app__element-list">
              {fields.map((field) => (
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