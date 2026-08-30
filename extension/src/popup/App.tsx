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

  return (
    <main className="app">
      <header className="app__header">
        <h1>Browser Agent</h1>
        <p className="app__subtitle">
          Local perception. Privacy-preserving AI.
        </p>
      </header>

      <section className="app__task">
        <label htmlFor="task-input">
          What should the agent do on this page?
        </label>

        <textarea
          id="task-input"
          placeholder="e.g. Fill in the shipping form with my saved address"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={3}
        />

        <button
          onClick={handleAskAI}
          disabled={loading || !task.trim()}
        >
          {loading ? "Analyzing…" : "Ask AI"}
        </button>
      </section>

      <section className="app__dashboard">
        <h2>Results</h2>

        {result?.error && (
          <p className="app__error">
            Error: {result.error}
          </p>
        )}

        <dl>
          <div className="app__stat">
            <dt>Elements detected</dt>
            <dd>{result ? fields.length : "—"}</dd>
          </div>

          <div className="app__stat">
            <dt>Sensitive items protected</dt>
            <dd>
              {result
                ? result.sensitiveItemsProtected
                : "—"}
            </dd>
          </div>

          <div className="app__stat">
            <dt>Raw PII sent</dt>
            <dd>{result ? result.rawItemsSent : "—"}</dd>
          </div>
        </dl>

        {result?.analysis && (
          <div className="app__page-info">
            <strong>{result.analysis.title || "Current Page"}</strong>
            <span>
              {fields.length} interactive elements detected
            </span>
          </div>
        )}

        {fields.length > 0 && (
          <div className="app__elements">
            <h2>Page Elements</h2>

            <div className="app__element-list">
              {fields.map((field) => (
                <article
                  className="app__element"
                  key={field.id}
                >
                  <div className="app__element-heading">
                    <strong>
                      {getElementTitle(field)}
                    </strong>

                    {field.sensitive && (
                      <span className="app__sensitive">
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
                    x:{field.bbox.x} y:{field.bbox.y} ·{" "}
                    {field.bbox.width}×{field.bbox.height}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {result?.serverInstruction && (
          <p className="app__instruction">
            Server: {result.serverInstruction}
          </p>
        )}
      </section>
    </main>
  );
}