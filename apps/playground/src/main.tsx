import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { Analytics } from "@vercel/analytics/react";
import { useQueryState } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { GithubStars } from "@/components/github-stars";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import "./styles.css";

const REPO = "martinzokov/cyberpunk-bench";

/** A model app's directory name under apps/, e.g. "opus-5.5". */
type ModelName = string;

type ModelProvider = "openai" | "anthropic" | "google" | "grok" | "other";

interface ProviderOption {
  label: string;
  value: ModelProvider;
}

const providerOptions: readonly ProviderOption[] = [
  { label: "OpenAI", value: "openai" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Google", value: "google" },
  { label: "Grok", value: "grok" },
  { label: "Other", value: "other" },
] as const;

interface ModelOption {
  controls: string;
  /** Wall-clock time the model took to produce its app. */
  duration: string;
  /** Highest reasoning setting the model offers, and what it is called there. */
  effort: string;
  effortDetail: string;
  label: string;
  provider: ModelProvider;
  summary: string;
  value: ModelName;
}

// One entry per model app in apps/. See CONTRIBUTING.md for the fields.
const modelOptions: readonly ModelOption[] = [];

const defaultModel: ModelName = modelOptions[0]?.value ?? "";

function isModelName(value: string): value is ModelName {
  return modelOptions.some((model) => model.value === value);
}

function isModelProvider(value: string): value is ModelProvider {
  return providerOptions.some((provider) => provider.value === value);
}

function getModelProvider(model: ModelName): ModelProvider {
  return (
    modelOptions.find((option) => option.value === model)?.provider ?? "other"
  );
}

function ModelDetails({ model }: { model: ModelOption }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <dt className="font-bold text-muted-foreground text-xs uppercase tracking-normal">
            Reasoning
          </dt>
          <dd className="font-medium text-sm" title={model.effortDetail}>
            {model.effort}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="font-bold text-muted-foreground text-xs uppercase tracking-normal">
            Time to build
          </dt>
          <dd className="font-medium text-sm">{model.duration}</dd>
        </div>
      </dl>
      <p className="text-muted-foreground text-sm">{model.summary}</p>
    </>
  );
}

// Keyed by model at the call site, so the load state resets on every switch.
function SceneFrame({ model, src }: { model: ModelOption; src: string }) {
  const [isSceneReady, setIsSceneReady] = useState(false);

  return (
    <>
      {/* Each model app draws its own title and HUD, so the shell stays out
          of the viewport apart from the load state. */}
      {isSceneReady ? null : (
        <p
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-muted-foreground text-sm"
        >
          Loading {model.label}…
        </p>
      )}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: onLoad here is the frame's resource-load event, not a user interaction. */}
      <iframe
        className="h-full w-full border-0"
        onLoad={() => setIsSceneReady(true)}
        src={src}
        title={`${model.label} cyberpunk scene`}
      />
    </>
  );
}

function App() {
  const [modelQuery, setModelQuery] = useQueryState("model", {
    defaultValue: defaultModel,
    clearOnDefault: false,
  });
  const selectedModel = isModelName(modelQuery) ? modelQuery : defaultModel;
  const activeModel = modelOptions.find(
    (model) => model.value === selectedModel
  );
  // Follows the selected model, so a deep link opens on the right provider tab,
  // but can be moved on its own to browse other providers.
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider>(() =>
    getModelProvider(selectedModel)
  );
  const filteredModelOptions = modelOptions.filter(
    (model) => model.provider === selectedProvider
  );

  const sceneUrl = `${import.meta.env.BASE_URL}models/${selectedModel}/index.html`;

  const loadModel = (model: string) => {
    if (isModelName(model)) {
      setModelQuery(model);
      setSelectedProvider(getModelProvider(model));
    }
  };

  const filterByProvider = (provider: string) => {
    if (isModelProvider(provider)) {
      setSelectedProvider(provider);
    }
  };

  return (
    <main className="grid min-h-dvh w-full grid-cols-1 bg-background text-foreground md:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]">
      <aside className="flex h-auto min-h-[42dvh] flex-col gap-5 overflow-auto border-border border-b bg-card p-6 text-card-foreground md:h-dvh md:border-r md:border-b-0">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading font-semibold text-3xl leading-none tracking-normal">
              Cyberpunk Bench
            </h1>
            <span className="font-bold text-muted-foreground text-xs uppercase tracking-normal">
              3D scene benchmark
            </span>
          </div>
          <GithubStars repo={REPO} />
        </header>

        <Separator />

        {activeModel ? (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="font-semibold text-sm">Model</h2>
              <Tabs onValueChange={filterByProvider} value={selectedProvider}>
                <TabsList aria-label="Model provider filter">
                  {providerOptions.map((provider) => (
                    <TabsTrigger key={provider.value} value={provider.value}>
                      {provider.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <ToggleGroup
                aria-label="Model selector"
                className="grid w-full grid-cols-2"
                data-model={selectedModel}
                onValueChange={loadModel}
                size="sm"
                spacing={2}
                type="single"
                value={selectedModel}
                variant="outline"
              >
                {filteredModelOptions.map((model) => (
                  <ToggleGroupItem
                    className="w-full min-w-0 shrink truncate px-2 normal-case tracking-normal"
                    key={model.value}
                    value={model.value}
                  >
                    {model.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <ModelDetails model={activeModel} />
            </section>

            <Separator />

            <section className="flex flex-col gap-2">
              <h2 className="font-semibold text-sm">Controls</h2>
              <p className="text-muted-foreground text-sm">
                {activeModel.controls}
              </p>
            </section>

            <Button asChild className="mt-auto w-full" variant="outline">
              <a href={sceneUrl} rel="noopener" target="_blank">
                <ArrowSquareOutIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                />
                Open {activeModel.label} full screen
              </a>
            </Button>
          </>
        ) : (
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold text-sm">No scenes yet</h2>
            <p className="text-muted-foreground text-sm">
              Each model will build one cyberpunk scene from the same brief.
              They will appear here as they land.
            </p>
          </section>
        )}
      </aside>

      <section
        aria-label="Interactive 3D scene viewport"
        className="relative h-[58dvh] min-w-0 bg-background md:h-dvh"
        data-scene-stage
      >
        {activeModel ? (
          <SceneFrame
            key={activeModel.value}
            model={activeModel}
            src={sceneUrl}
          />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            No scenes yet.
          </p>
        )}
      </section>
    </main>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <NuqsAdapter>
      <App />
      <Analytics />
    </NuqsAdapter>
  </StrictMode>
);
