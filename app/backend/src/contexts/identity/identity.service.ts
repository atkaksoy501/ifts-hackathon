import type { CreateUserRequest, PatchUserRequest, SessionUserDto, UserAccountDto } from "@module1/contracts";
import bcrypt from "bcryptjs";
import { ApiError } from "../../shared/http.js";
import {
  InMemoryUserRepository,
  normalizeUsername,
  type CreateUserRecordInput,
  type UserRecord,
  type UserRepository
} from "./user.repository.js";

type SeedAdmin = {
  username: string;
  password: string;
  displayName: string;
};

export class IdentityService {
  constructor(private readonly users: UserRepository = new InMemoryUserRepository()) {}

  static async create(seedAdmin: SeedAdmin, users: UserRepository = new InMemoryUserRepository()) {
    const service = new IdentityService(users);
    await service.seedAdmin(seedAdmin);
    return service;
  }

  async seedAdmin(seed: SeedAdmin) {
    const existing = await this.users.findByUsername(seed.username);
    if (existing) {
      return toAccountDto(existing);
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
    const username = normalizeInputUsername(input.username);
    await this.ensureUniqueUsername(username);

    const createInput: CreateUserRecordInput = {
      username,
      role: input.role,
      active: input.active ?? true,
      passwordHash: await bcrypt.hash(input.password, 10)
    };

    if (input.displayName) {
      const displayName = normalizeOptionalText(input.displayName);
      if (displayName) {
        createInput.displayName = displayName;
      }
    }

    return toAccountDto(await this.users.create(createInput));
  }

  async patchUser(id: string, input: PatchUserRequest): Promise<UserAccountDto> {
    if (Object.keys(input).length === 0) {
      throw new ApiError(400, "INVALID_REQUEST", "Patch body cannot be empty.");
    }

    const record = await this.users.findById(id);
    if (!record) {
      throw new ApiError(404, "NOT_FOUND", "User was not found.");
    }

    const patch: Parameters<UserRepository["patch"]>[1] = {};

    if (input.username) {
      const username = normalizeInputUsername(input.username);
      if (normalizeUsername(username) !== normalizeUsername(record.username)) {
        await this.ensureUniqueUsername(username);
        patch.username = username;
      }
    }

    if (input.password) {
      patch.passwordHash = await bcrypt.hash(input.password, 10);
    }

    if (input.displayName !== undefined) {
      patch.displayName = normalizeOptionalText(input.displayName);
    }

    if (input.role) {
      patch.role = input.role;
    }

    if (input.active !== undefined) {
      patch.active = input.active;
    }

    const updated = await this.users.patch(id, patch);
    if (!updated) {
      throw new ApiError(404, "NOT_FOUND", "User was not found.");
    }

    return toAccountDto(updated);
  }

  async listUsers(): Promise<UserAccountDto[]> {
    return (await this.users.list()).map(toAccountDto);
  }

  async getSessionUser(id: string): Promise<SessionUserDto> {
    const record = await this.users.findById(id);
    if (!record) {
      throw new ApiError(401, "UNAUTHENTICATED", "Session user was not found.");
    }

    if (!record.active) {
      throw new ApiError(403, "FORBIDDEN", "User is disabled.");
    }

    return toSessionDto(record);
  }

  async login(username: string, password: string): Promise<SessionUserDto> {
    const record = await this.users.findByUsername(username);
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

  private async ensureUniqueUsername(username: string) {
    if (await this.users.findByUsername(username)) {
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

function normalizeInputUsername(username: string): string {
  const normalized = username.trim();
  if (!normalized) {
    throw new ApiError(400, "INVALID_REQUEST", "Username cannot be empty.");
  }

  return normalized;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
