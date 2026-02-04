import { Action, ActionPanel, List, useNavigation, showToast, Toast, Clipboard, Icon, Detail, showInFinder } from "@raycast/api";
import { useEffect, useState } from "react";
import { getHistory, clearHistory } from "./storage";
import type { GenerationHistory } from "./types";
import { downloadToTemp } from "./utils";
import GenerateCommand from "./generate";
import VideoPreview from "./components/VideoPreview";

export default function Command() {
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localFilePaths, setLocalFilePaths] = useState<Record<string, string>>({});
  const { push } = useNavigation();

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setIsLoading(true);
    const items = await getHistory();
    setHistory(items);
    setIsLoading(false);
  }

  async function handleSelectionChange(id: string | null) {
    if (!id) return;
    const item = history.find(i => i.id === id);
    if (item && item.type === "video" && !localFilePaths[id]) {
        try {
            const path = await downloadToTemp(item.url);
            setLocalFilePaths(prev => ({ ...prev, [id]: path }));
        } catch (e) {
            console.error("[History] Failed to cache video", e);
        }
    }
  }

  async function handleClearHistory() {
    await clearHistory();
    setHistory([]);
    setIsLoading(false);
  }

  async function handleCopyImage(url: string) {
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

  return (
    <List 
      isLoading={isLoading} 
      isShowingDetail 
      onSelectionChange={handleSelectionChange}
    >
      {history.length === 0 ? (
        <List.EmptyView title="No History" description="Generate some images or videos first!" icon="command-icon.png" />
      ) : (
        history.map((item) => (
          <List.Item
            key={item.id}
            id={item.id}
            icon={item.type === "video" 
              ? (item.coverImageUrl ? { source: item.coverImageUrl } : { source: "command-icon.png" }) 
              : { source: item.url }
            }
            title={item.prompt}
            subtitle={new Date(item.timestamp).toLocaleString()}
            detail={
              <List.Item.Detail
                markdown={
                  item.type === "video" 
                    ? (localFilePaths[item.id]
                        ? `![](${localFilePaths[item.id]})`
                        : (item.coverImageUrl 
                            ? `[![Video Cover](${item.coverImageUrl})](${item.url})` 
                            : `### Video Generated\n\nLoading preview...`))
                    : `![Generated Image](${item.url})`
                }
                metadata={null}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                    title="View Details"
                    icon={Icon.Info}
                    target={<GenerationDetails item={item} />}
                />
                {item.type === "video" && (
                  <Action.Push
                    title="Preview Video"
                    icon={Icon.Eye}
                    target={
                      <VideoPreview 
                        videoUrl={item.url} 
                        coverImageUrl={item.coverImageUrl} 
                        prompt={item.prompt} 
                      />
                    }
                  />
                )}
                {item.type === "image" && (
                  <Action 
                    title="Regenerate" 
                    icon="command-icon.png" 
                    onAction={() => push(<GenerateCommand initialPrompt={item.prompt} initialModel={item.model} autoGenerate={false} />)} 
                  />
                )}
                {item.type === "image" && (
                  <Action 
                    title="Copy Image" 
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => {
                      console.log("[CopyImage] Action triggered for:", item.url);
                      handleCopyImage(item.url);
                    }} 
                  />
                )}
                <Action.OpenInBrowser url={item.url} title="Open in Browser" />
                <Action.CopyToClipboard content={item.url} title="Copy URL" />
                <Action 
                  title="Copy Prompt" 
                  icon={Icon.Clipboard} 
                  onAction={async () => {
                    await Clipboard.copy(item.prompt);
                    await showToast({ style: Toast.Style.Success, title: "Copied to Clipboard!" });
                  }}
                />
                <Action title="Clear History" onAction={handleClearHistory} style={Action.Style.Destructive} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function GenerationDetails({ item }: { item: GenerationHistory }) {
    return (
        <Detail 
            markdown={`## Prompt\n${item.prompt}`}
            metadata={
                <Detail.Metadata>
                    <Detail.Metadata.Label title="Type" text={item.type === "video" ? "Video" : "Image"} />
                    <Detail.Metadata.Label title="Model" text={item.model} />
                    <Detail.Metadata.Label title="Date" text={new Date(item.timestamp).toLocaleString()} />
                    <Detail.Metadata.Link title="Recource URL" target={item.url} text="Open in Browser" />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label title="ID" text={item.id} />
                </Detail.Metadata>
            }
            actions={
                <ActionPanel>
                   <Action title="Copy Prompt" icon={Icon.Clipboard} onAction={async () => {
                       await Clipboard.copy(item.prompt);
                       await showToast({ style: Toast.Style.Success, title: "Copied to Clipboard!" });
                   }} />
                   <Action.OpenInBrowser url={item.url} title="Open Resource" />
                   {item.type === "image" && (
                     <Action 
                       title="Copy Image" 
                       icon={Icon.Clipboard} 
                       shortcut={{ modifiers: ["cmd"], key: "c" }}
                       onAction={async () => {
                         const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading image..." });
                         try {
                           const filePath = await downloadToTemp(item.url);
                           await Clipboard.copy({ file: filePath });
                           toast.style = Toast.Style.Success;
                           toast.title = "Image copied to clipboard!";
                         } catch (error) {
                           toast.style = Toast.Style.Failure;
                           toast.title = "Failed to copy";
                           toast.message = error instanceof Error ? error.message : String(error);
                         }
                       }} 
                     />
                   )}
                   <Action 
                      title="Open Image File Location" 
                      icon={Icon.Finder} 
                      onAction={async () => {
                        const toast = await showToast({ style: Toast.Style.Animated, title: "Locating file..." });
                         try {
                           const filePath = await downloadToTemp(item.url);
                           await showInFinder(filePath);
                           toast.style = Toast.Style.Success;
                           toast.title = "File revealed in Finder";
                         } catch (error) {
                           toast.style = Toast.Style.Failure;
                           toast.title = "Failed to locate";
                           toast.message = error instanceof Error ? error.message : String(error);
                         }
                      }}
                   />
                </ActionPanel>
            }
        />
    );
}
