import { describe, expect, it } from "vitest";
import { IdentityService } from "./identity.service.js";
import { InMemoryUserRepository } from "./user.repository.js";

const seedAdmin = {
  username: "admin",
  password: "admin12345",
  displayName: "Admin"
};

describe("IdentityService", () => {
  it("seeds admin idempotently and stores only a password hash", async () => {
    const repository = new InMemoryUserRepository();
    const service = await IdentityService.create(seedAdmin, repository);
    await service.seedAdmin(seedAdmin);

    const users = await service.listUsers();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ username: "admin", role: "admin", active: true });

    const stored = await repository.findByUsername("admin");
    expect(stored?.passwordHash).toBeDefined();
    expect(stored?.passwordHash).not.toBe("admin12345");
  });

  it("authenticates with a hashed password and rejects disabled users", async () => {
    const service = await IdentityService.create(seedAdmin);
    const user = await service.createUser({
      username: "dev",
      password: "dev12345",
      displayName: "Developer",
      role: "user",
      active: true
    });

    await expect(service.login("dev", "dev12345")).resolves.toMatchObject({ id: user.id, role: "user" });

    await service.patchUser(user.id, { active: false });
    await expect(service.login("dev", "dev12345")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(service.getSessionUser(user.id)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("rejects duplicate usernames and empty patches", async () => {
    const service = await IdentityService.create(seedAdmin);
    await service.createUser({ username: "dev", password: "dev12345", role: "user" });

    await expect(service.createUser({ username: "dev", password: "other12345", role: "user" })).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT"
    });

    const [user] = (await service.listUsers()).filter((account) => account.username === "dev");
    if (!user) {
      throw new Error("Expected created user in list.");
    }
    await expect(service.patchUser(user.id, {})).rejects.toMatchObject({ status: 400, code: "INVALID_REQUEST" });
  });

  it("does not trust stale role claims for current session authorization", async () => {
    const service = await IdentityService.create(seedAdmin);
    const user = await service.createUser({ username: "lead", password: "lead12345", role: "admin" });

    await service.patchUser(user.id, { role: "user" });

    expect(await service.getSessionUser(user.id)).toMatchObject({ role: "user" });
  });
});
