/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** ZhipuAI API Key - API Key from open.bigmodel.cn */
  "apiKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `generate` command */
  export type Generate = ExtensionPreferences & {}
  /** Preferences accessible in the `history` command */
  export type History = ExtensionPreferences & {}
  /** Preferences accessible in the `generate_video` command */
  export type GenerateVideo = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `generate` command */
  export type Generate = {}
  /** Arguments passed to the `history` command */
  export type History = {}
  /** Arguments passed to the `generate_video` command */
  export type GenerateVideo = {}
}

