import { Action, ActionPanel, Form, showToast, Toast, Detail, useNavigation, getPreferenceValues, Clipboard, Icon, List } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch from "node-fetch";
import { addToHistory } from "./storage";
import { downloadToTemp } from "./utils";
import VideoPreview from "./components/VideoPreview";

interface Preferences {
  apiKey: string;
}

interface VideoGenerationResponse {
  id: string;
  request_id: string;
  model: string;
  task_status: string;
}

interface AsyncResultResponse {
  id: string;
  model: string;
  task_status: "PROCESSING" | "SUCCESS" | "FAIL";
  video_result?: Array<{
    url: string;
    cover_image_url: string;
    cover_image?: string;
  }>;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const isSubmitting = useRef(false);
  const { push } = useNavigation();

  async function handleSubmit(values: { prompt: string; quality: string; with_audio: boolean }) {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Submitting task..." });

    try {
      const preferences = getPreferenceValues<Preferences>();
      const apiKey = preferences.apiKey;

      if (!apiKey) {
        throw new Error("API Key is missing in Extensions Preferences");
      }

      // 1. Submit Generation Task
      const response = await fetch("https://open.bigmodel.cn/api/paas/v4/videos/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "cogvideox-flash",
          prompt: values.prompt,
          quality: values.quality,
          with_audio: values.with_audio
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as VideoGenerationResponse;
      const taskId = data.id;

      if (!taskId) {
        throw new Error("No Task ID returned");
      }

      toast.title = "Generating video...";
      toast.message = "This may take a while. Please wait.";

      // 2. Poll for Result
      const { url: videoUrl, coverImageUrl } = await pollForResult(taskId, apiKey, toast);

      // Save to history
      await addToHistory({
        id: Date.now().toString(),
        type: "video",
        prompt: values.prompt,
        url: videoUrl,
        coverImageUrl: coverImageUrl,
        timestamp: Date.now(),
        model: "cogvideox-flash"
      });

      toast.style = Toast.Style.Success;
      toast.title = "Generated!";
      
      push(
        <ResultView 
          videoUrl={videoUrl} 
          coverImageUrl={coverImageUrl}
          prompt={values.prompt} 
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

  async function pollForResult(taskId: string, apiKey: string, toast: Toast): Promise<{ url: string, coverImageUrl: string }> {
    const pollInterval = 2000; // 2 seconds
    const maxRetries = 60; // 2 minutes timeout approx

    for (let i = 0; i < maxRetries; i++) {
        const response = await fetch(`https://open.bigmodel.cn/api/paas/v4/async-result/${taskId}`, {
            headers: {
                "Authorization": `Bearer ${apiKey}`
            }
        });

        if (!response.ok) continue;

        const data = await response.json() as AsyncResultResponse;

        if (data.task_status === "SUCCESS" && data.video_result?.[0]?.url) {
            const result = data.video_result[0];
            return {
                url: result.url,
                coverImageUrl: result.cover_image_url || result.cover_image || ""
            };
        } else if (data.task_status === "FAIL") {
            throw new Error("Video generation failed.");
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    throw new Error("Polling timeout");
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Video" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="prompt" title="Prompt" placeholder="Describe the video you want..." />
      <Form.Dropdown id="quality" title="Quality" defaultValue="quality">
          <Form.Dropdown.Item value="quality" title="High Quality" />
          <Form.Dropdown.Item value="speed" title="High Speed" />
      </Form.Dropdown>
      <Form.Checkbox id="with_audio" label="Generate with Audio" defaultValue={false} />
    </Form>
  );
}

function ResultView({ videoUrl, coverImageUrl, prompt }: { videoUrl: string, coverImageUrl: string, prompt: string }) {
  const [localVideoPath, setLocalVideoPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function preparePreview() {
      setIsLoading(true);
      try {
        const path = await downloadToTemp(videoUrl);
        setLocalVideoPath(path);
      } catch (e) {
        console.error("Failed to download video for preview", e);
      } finally {
        setIsLoading(false);
      }
    }
    preparePreview();
  }, [videoUrl]);

  const markdown = coverImageUrl 
    ? `[![Video Cover](${coverImageUrl})](${videoUrl})`
    : `### Video Generated\n\n[Click here to watch](${videoUrl})`;

  return (
    <List isShowingDetail isLoading={isLoading}>
      <List.Item
        title={prompt}
        icon={localVideoPath ? { file: localVideoPath } : Icon.Video}
        quickLook={localVideoPath ? { path: localVideoPath, name: prompt } : undefined}
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Prompt" text={prompt} />
                <List.Item.Detail.Metadata.Link title="Video URL" target={videoUrl} text="Click to open" />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            {localVideoPath && (
              <Action.ToggleQuickLook title="Preview Video" />
            )}
            <Action.OpenInBrowser url={videoUrl} title="Open in Browser" />
            <Action.CopyToClipboard content={videoUrl} title="Copy URL" />
            {localVideoPath && (
               <Action.Open title="Open Video File" target={localVideoPath} icon={Icon.Video} />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
