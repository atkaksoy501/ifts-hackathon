import type { CreateUserRequest, PatchUserRequest, SessionUserDto, UserAccountDto } from "@module1/contracts";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../shared/http.js";

type UserRecord = UserAccountDto & {
  passwordHash: string;
};

type SeedAdmin = {
  username: string;
  password: string;
  displayName: string;
};

export class IdentityService {
  private readonly users = new Map<string, UserRecord>();

  static async create(seedAdmin: SeedAdmin) {
    const service = new IdentityService();
    await service.seedAdmin(seedAdmin);
    return service;
  }

  async seedAdmin(seed: SeedAdmin) {
    const existing = [...this.users.values()].find((user) => user.username === seed.username);
    if (existing) {
      return existing;
    }

    return this.createUser({
      username: seed.username,
      password: seed.password,
      displayName: seed.displayName,
      role: "admin",
      active: true
    });
  }

  async createUser(input: CreateUserRequest): Promise<UserAccountDto> {
    this.ensureUniqueUsername(input.username);

    const now = new Date().toISOString();
    const record: UserRecord = {
      id: randomUUID(),
      username: input.username,
      role: input.role,
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now,
      passwordHash: await bcrypt.hash(input.password, 10)
    };

    if (input.displayName) {
      record.displayName = input.displayName;
    }

    this.users.set(record.id, record);
    return toAccountDto(record);
  }

  async patchUser(id: string, input: PatchUserRequest): Promise<UserAccountDto> {
    const record = this.users.get(id);
    if (!record) {
      throw new ApiError(404, "NOT_FOUND", "User was not found.");
    }

    if (input.username && input.username !== record.username) {
      this.ensureUniqueUsername(input.username);
      record.username = input.username;
    }

    if (input.password) {
      record.passwordHash = await bcrypt.hash(input.password, 10);
    }

    if (input.displayName !== undefined) {
      record.displayName = input.displayName;
    }

    if (input.role) {
      record.role = input.role;
    }

    if (input.active !== undefined) {
      record.active = input.active;
    }

    record.updatedAt = new Date().toISOString();
    return toAccountDto(record);
  }

  listUsers(): UserAccountDto[] {
    return [...this.users.values()].map(toAccountDto);
  }

  getSessionUser(id: string): SessionUserDto {
    const record = this.users.get(id);
    if (!record) {
      throw new ApiError(401, "UNAUTHENTICATED", "Session user was not found.");
    }

    if (!record.active) {
      throw new ApiError(403, "FORBIDDEN", "User is disabled.");
    }

    return toSessionDto(record);
  }

  async login(username: string, password: string): Promise<SessionUserDto> {
    const record = [...this.users.values()].find((user) => user.username === username);
    if (!record) {
      throw new ApiError(401, "UNAUTHENTICATED", "Invalid username or password.");
    }

    if (!record.active) {
      throw new ApiError(403, "FORBIDDEN", "User is disabled.");
    }

    const passwordOk = await bcrypt.compare(password, record.passwordHash);
    if (!passwordOk) {
      throw new ApiError(401, "UNAUTHENTICATED", "Invalid username or password.");
    }

    return toSessionDto(record);
  }

  private ensureUniqueUsername(username: string) {
    if ([...this.users.values()].some((user) => user.username === username)) {
      throw new ApiError(409, "CONFLICT", "Username already exists.");
    }
  }
}

function toSessionDto(record: UserRecord): SessionUserDto {
  const dto: SessionUserDto = {
    id: record.id,
    username: record.username,
    role: record.role,
    active: record.active
  };

  if (record.displayName) {
    dto.displayName = record.displayName;
  }

  return dto;
}

function toAccountDto(record: UserRecord): UserAccountDto {
  return {
    ...toSessionDto(record),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}
