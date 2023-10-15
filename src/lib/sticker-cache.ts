import { Client, Sticker, StickerFormatType } from "discord.js";
import { existsSync, mkdirSync } from "fs";
import * as path from "path";
import bot from "./bot.js";

const zx = import("zx");

let $: any;

zx.then(({ $: zx }) => (($ = zx), ($.verbose = false)));

class StickerCache {
    client: Client;
    base: string;

    constructor(client: Client, base: string) {
        this.client = client;
        this.base = base;
    }

    async store(sticker: Sticker): Promise<string> {
        const sticker_path = this.path(sticker);

        switch (sticker.format) {
            case StickerFormatType.PNG:
                await $`ffmpeg -y -i ${sticker.url} -lavfi "format=rgba,scale=160:160:flags=lanczos:force_original_aspect_ratio=decrease" ${sticker_path}`;
                return sticker_path;
            case StickerFormatType.APNG:
                await $`ffmpeg -y -i ${sticker.url} -lavfi "[0:v] scale=160:160:flags=lanczos:force_original_aspect_ratio=decrease,split [a][b]; [a] palettegen [p]; [b][p] paletteuse" ${sticker_path}`;
                return sticker_path;
        }

        throw "?";
    }

    async fetch(sticker: Sticker): Promise<string> {
        const sticker_path = this.path(sticker);
        if (!existsSync(sticker_path)) await this.store(sticker);
        return sticker_path;
    }

    path(sticker: Sticker): string {
        return `${path.resolve(this.base, sticker.id)}.${this.ext(sticker)}`;
    }

    ext(sticker: Sticker): string {
        switch (sticker.format) {
            case StickerFormatType.PNG:
                return "png";
            case StickerFormatType.APNG:
                return "gif";
        }

        throw "?";
    }
}

if (!existsSync("sticker-cache")) mkdirSync("sticker-cache");

export default new StickerCache(bot, "sticker-cache");
