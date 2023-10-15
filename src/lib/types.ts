export type GlobalChannel = {
    id: number;
    name: string;
    public: boolean;
    logs: string;
    mods: string[];
    bans: string[];
    panic: boolean;
    ignoreFilter: boolean;
};

export type GlobalConnection = {
    id: number;
    guild: string;
    channel: string;
    suspended: boolean;
    replyStyle: "text" | "embed";
    showServers: boolean;
    showTag: boolean;
    bans: string[];
};

export type GlobalUser = {
    id: string;
    nickname: string | null;
    messages: Record<number, number>;
    deletedMessages: Record<number, number>;
};

export type GlobalMessage = {
    id: number;
    author: string;
    channel: string;
    message: string;
    instances: { channel: string; message: string }[];
    deleted?: boolean;
};
