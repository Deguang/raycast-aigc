import { Action, ActionPanel, Form, showToast, Toast, Detail, useNavigation, getPreferenceValues, Clipboard, Icon } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch from "node-fetch";
import { addToHistory } from "./storage";
import { downloadToTemp } from "./utils";

interface Preferences {
  apiKey: string;
}

interface CommandProps {
  initialPrompt?: string;
  initialModel?: string;
  autoGenerate?: boolean;
}

export default function Command({ initialPrompt, initialModel = "cogview-3-flash", autoGenerate = false }: CommandProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isSubmitting = useRef(false);
  const { push } = useNavigation();
  
  // State to track if we should auto-generate (only once per mount)
  const [shouldAutoGenerate, setShouldAutoGenerate] = useState(autoGenerate);

  useEffect(() => {
    if (shouldAutoGenerate && initialPrompt) {
        handleSubmit({ prompt: initialPrompt, model: initialModel, size: "1024x1024" });
        setShouldAutoGenerate(false);
    }
  }, [shouldAutoGenerate, initialPrompt, initialModel]);

  async function handleSubmit(values: { prompt: string, model: string, size: string }) {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Generating image..." });

    try {
      const preferences = getPreferenceValues<Preferences>();
      const apiKey = preferences.apiKey;

      if (!apiKey) {
        throw new Error("API Key is missing in Extensions Preferences");
      }

      const response = await fetch("https://open.bigmodel.cn/api/paas/v4/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: values.model,
          prompt: values.prompt,
          size: values.size
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as { data: { url: string }[] };
      const imageUrl = data.data?.[0]?.url;
      
      if (!imageUrl) {
        throw new Error("No image URL returned");
      }

      // Save to history
      await addToHistory({
        id: Date.now().toString(),
        type: "image",
        prompt: values.prompt,
        url: imageUrl,
        timestamp: Date.now(),
        model: values.model
      });

      toast.style = Toast.Style.Success;
      toast.title = "Generated!";
      
      push(
        <ResultView 
          markdown={`![Generated Image](${imageUrl})`} 
          prompt={values.prompt} 
          model={values.model}
          url={imageUrl}
        />
      );

    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate";
      toast.message = String(error)
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea 
        id="prompt" 
        title="Prompt" 
        placeholder="Describe the image you want..." 
        defaultValue={initialPrompt}
      />
      <Form.Dropdown id="model" title="Model" defaultValue={initialModel}>
        <Form.Dropdown.Item value="cogview-3-flash" title="CogView-3-Flash (Free)" />
        <Form.Dropdown.Item value="cogview-3-plus" title="CogView-3-Plus" />
        <Form.Dropdown.Item value="cogview-3" title="CogView-3" />
      </Form.Dropdown>
      <Form.Dropdown id="size" title="Aspect Ratio" defaultValue="1024x1024">
        <Form.Dropdown.Item value="1024x1024" title="1:1 (Square)" />
        <Form.Dropdown.Item value="1344x768" title="16:9 (Landscape)" />
        <Form.Dropdown.Item value="768x1344" title="9:16 (Portrait)" />
        <Form.Dropdown.Item value="1440x960" title="3:2 (Standard)" />
        <Form.Dropdown.Item value="960x1440" title="2:3 (Standard Vertical)" />
      </Form.Dropdown>
    </Form>
  );
}

function ResultView({ markdown, prompt, model, url }: { markdown: string, prompt: string, model: string, url: string }) {
  const { pop } = useNavigation();

  async function handleCopyImage() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading image..." });
    try {
      const filePath = await downloadToTemp(url);
      await Clipboard.copy({ file: filePath });
      toast.style = Toast.Style.Success;
      toast.title = "Image copied to clipboard!";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to copy";
      toast.message = String(error);
    }
  }

  function handleRegenerate() {
    pop();
  }

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Generated Image"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Quick Actions">
            <Action 
              title="Copy Image" 
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={() => {
                console.log("[CopyImage] ResultView: Action triggered for:", url);
                handleCopyImage();
              }} 
            />
            <Action 
              title="Regenerate" 
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={handleRegenerate} 
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={url} title="Open in Browser" />
            <Action.CopyToClipboard content={url} title="Copy URL" />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Prompt" text={prompt} />
          <Detail.Metadata.Label title="Model" text={model} />
          <Detail.Metadata.Link title="Image URL" target={url} text="Click to open" />
        </Detail.Metadata>
      }
    />
  );
}
