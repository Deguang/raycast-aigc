import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { downloadToTemp } from "../utils";

interface VideoPreviewProps {
  videoUrl: string;
  coverImageUrl?: string;
  prompt: string;
}

export default function VideoPreview({ videoUrl, coverImageUrl, prompt }: VideoPreviewProps) {
  const [localVideoPath, setLocalVideoPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function preparePreview() {
      setIsLoading(true);
      try {
        const path = await downloadToTemp(videoUrl);
        if (isMounted) {
          setLocalVideoPath(path);
        }
      } catch (e) {
        console.error("Failed to download video for preview", e);
        if (isMounted) {
          showToast({ style: Toast.Style.Failure, title: "Failed to download video" });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    preparePreview();
    return () => { isMounted = false; };
  }, [videoUrl]);

  const markdown = coverImageUrl 
    ? `[![Video Cover](${coverImageUrl})](${videoUrl})`
    : `### Video Generated\n\n[Click here to watch](${videoUrl})`;

  return (
    <List isShowingDetail isLoading={isLoading} navigationTitle="Video Preview">
      <List.Item
        title={prompt}
        icon={localVideoPath ? { fileIcon: localVideoPath } : Icon.Video}
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
