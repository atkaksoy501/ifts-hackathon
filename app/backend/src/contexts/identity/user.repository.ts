import type { UserAccountDto } from "@module1/contracts";
import { MongoClient, type Collection, type Db } from "mongodb";
import { randomUUID } from "node:crypto";

export type UserRecord = UserAccountDto & {
  passwordHash: string;
};

export type CreateUserRecordInput = Omit<UserRecord, "id" | "createdAt" | "updatedAt">;

export type PatchUserRecordInput = Partial<Omit<UserRecord, "id" | "createdAt" | "updatedAt" | "displayName">> & {
  displayName?: string | undefined;
};

export interface UserRepository {
  ensureReady?(): Promise<void>;
  close?(): Promise<void>;
  create(input: CreateUserRecordInput): Promise<UserRecord>;
  findById(id: string): Promise<UserRecord | undefined>;
  findByUsername(username: string): Promise<UserRecord | undefined>;
  list(): Promise<UserRecord[]>;
  patch(id: string, input: PatchUserRecordInput): Promise<UserRecord | undefined>;
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserRecord>();

  async create(input: CreateUserRecordInput): Promise<UserRecord> {
    const now = new Date().toISOString();
    const record: UserRecord = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };

    this.users.set(record.id, record);
    return cloneUser(record);
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    return cloneOptional(this.users.get(id));
  }

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const normalized = normalizeUsername(username);
    return cloneOptional([...this.users.values()].find((user) => normalizeUsername(user.username) === normalized));
  }

  async list(): Promise<UserRecord[]> {
    return [...this.users.values()].map(cloneUser);
  }

  async patch(id: string, input: PatchUserRecordInput): Promise<UserRecord | undefined> {
    const existing = this.users.get(id);
    if (!existing) {
      return undefined;
    }

    const next: UserRecord = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    this.users.set(id, next);
    return cloneUser(next);
  }
}

export class MongoUserRepository implements UserRepository {
  private readonly client: MongoClient;
  private db: Db | undefined;

  constructor(
    mongoUri: string,
    private readonly dbName: string
  ) {
    this.client = new MongoClient(mongoUri);
  }

  async ensureReady(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    await Promise.all([
      this.users.createIndex({ id: 1 }, { unique: true }),
      this.users.createIndex({ normalizedUsername: 1 }, { unique: true })
    ]);
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  async create(input: CreateUserRecordInput): Promise<UserRecord> {
    const now = new Date().toISOString();
    const record = withNormalizedUsername({
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    });
    await this.users.insertOne(record);
    return toUserRecord(record);
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const record = await this.users.findOne({ id });
    return record ? toUserRecord(record) : undefined;
  }

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const record = await this.users.findOne({ normalizedUsername: normalizeUsername(username) });
    return record ? toUserRecord(record) : undefined;
  }

  async list(): Promise<UserRecord[]> {
    const records = await this.users.find().sort({ username: 1 }).toArray();
    return records.map(toUserRecord);
  }

  async patch(id: string, input: PatchUserRecordInput): Promise<UserRecord | undefined> {
    const patch = withOptionalNormalizedUsername(input);
    const result = await this.users.findOneAndUpdate(
      { id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    return result ? toUserRecord(result) : undefined;
  }

  private get database(): Db {
    if (!this.db) {
      throw new Error("Mongo user repository is not ready.");
    }
    return this.db;
  }

  private get users(): Collection<PersistedUserRecord> {
    return this.database.collection<PersistedUserRecord>("users");
  }
}

export function normalizeUsername(username: string): string {
  return username.trim().toLocaleLowerCase("en-US");
}

type PersistedUserRecord = UserRecord & {
  normalizedUsername: string;
};

function cloneOptional(record: UserRecord | undefined): UserRecord | undefined {
  return record ? cloneUser(record) : undefined;
}

function cloneUser(record: UserRecord): UserRecord {
  return { ...record };
}

function withNormalizedUsername(record: UserRecord): PersistedUserRecord {
  return {
    ...record,
    normalizedUsername: normalizeUsername(record.username)
  };
}

function withOptionalNormalizedUsername(input: PatchUserRecordInput): PatchUserRecordInput & { normalizedUsername?: string } {
  return input.username ? { ...input, normalizedUsername: normalizeUsername(input.username) } : input;
}

function toUserRecord(record: PersistedUserRecord): UserRecord {
  const { normalizedUsername: _normalizedUsername, ...user } = record;
  return user;
}
