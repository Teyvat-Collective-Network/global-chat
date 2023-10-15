import { Db, MongoClient } from "mongodb";
import { GlobalChannel, GlobalConnection, GlobalMessage, GlobalUser } from "./types.js";

let _db: Db;
let client: MongoClient;

export async function connect() {
    client = new MongoClient(Bun.env.DB_URI!);
    await client.connect();
    _db = client.db(Bun.env.DB_NAME);
}

class Collections {
    public get counters() {
        return _db.collection<{ sequence: string; value: number }>("counters");
    }

    public get channels() {
        return _db.collection<GlobalChannel>("global_channels");
    }

    public get connections() {
        return _db.collection<GlobalConnection>("global_connections");
    }

    public get users() {
        return _db.collection<GlobalUser>("global_users");
    }

    public get messages() {
        return _db.collection<GlobalMessage>("global_messages");
    }

    public get webhooks() {
        return _db.collection<{ id: string }>("global_webhooks");
    }
}

const db = new Collections();

export default db;

export async function autoinc(sequence: string): Promise<number> {
    const doc = await db.counters.findOneAndUpdate({ sequence }, { $inc: { value: 1 } }, { upsert: true });
    return (doc?.value ?? 0) + 1;
}
