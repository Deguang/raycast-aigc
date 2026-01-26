#!/Users/gztd-03-01449/Documents/mySpace/glm_raycast/.venv/bin/python3

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Generate Image (CogView-3)
# @raycast.mode compact
# @raycast.packageName ZhipuAI
#
# Optional parameters:
# @raycast.icon 🎨
# @raycast.argument1 { "type": "text", "placeholder": "Describe the image..." }
# @raycast.argument2 { "type": "password", "placeholder": "API Key (optional if stored)", "optional": true }
#
# Documentation:
# @raycast.description Generate images using CogView-3-Flash from ZhipuAI
# @raycast.author Antigravity

import sys
import os
import time
import requests
import webbrowser
from zhipuai import ZhipuAI

# --- Configuration ---
# You can hardcode your API Key here if you don't want to paste it every time
DEFAULT_API_KEY = "" 

def main():
    if len(sys.argv) < 2:
        print("Error: Missing arguments")
        sys.exit(1)

    prompt = sys.argv[1]
    
    # Try to get API key from argument, then default, then env var
    api_key = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else DEFAULT_API_KEY
    if not api_key:
        api_key = os.environ.get("ZHIPUAI_API_KEY")
    
    if not api_key:
        print("Error: API Key is required. Provide it as an argument or set ZHIPUAI_API_KEY env var.")
        sys.exit(1)

    print(f"Generating: {prompt}...")

    try:
        client = ZhipuAI(api_key=api_key)

        response = client.images.generations(
            model="cogview-3-flash",
            prompt=prompt
        )

        if response and response.data:
            image_url = response.data[0].url
            
            # Download the image to a temporary file to keep it
            # Using a descriptive name in Downloads or /tmp is better than purely temp
            # taking a slight liberty to save to standard temp for now as per plan
            
            import tempfile
            
            # Create a temp file with .png extension
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png", prefix="cogview_") as tmp_file:
                img_data = requests.get(image_url).content
                tmp_file.write(img_data)
                tmp_path = tmp_file.name
            
            print(f"Image saved to {tmp_path}")
            
            # Open the image in default viewer (Preview on macOS)
            subprocess_cmd = ["open", tmp_path]
            import subprocess
            subprocess.run(subprocess_cmd)
            
        else:
            print("Error: No image data returned.")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
