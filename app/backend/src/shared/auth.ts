import type { SessionUserDto } from "@module1/contracts";
import jwt from "jsonwebtoken";
import type { Response } from "express";
import type { AppConfig } from "./config.js";
import { ApiError } from "./http.js";

type SessionClaims = {
  sub: string;
  role: SessionUserDto["role"];
};

export function signSession(user: SessionUserDto, config: AppConfig): string {
  return jwt.sign({ sub: user.id, role: user.role } satisfies SessionClaims, config.JWT_SECRET, {
    expiresIn: "8h"
  });
}

export function readSession(token: string | undefined, config: AppConfig): SessionClaims {
  if (!token) {
    throw new ApiError(401, "UNAUTHENTICATED", "Session cookie is missing.");
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (typeof decoded === "string" || !isSessionClaims(decoded)) {
      throw new ApiError(401, "UNAUTHENTICATED", "Session cookie is invalid.");
    }

    return {
      sub: decoded.sub,
      role: decoded.role
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, "UNAUTHENTICATED", "Session cookie is invalid.");
  }
}

export function setSessionCookie(response: Response, token: string, config: AppConfig) {
  response.cookie(config.JWT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000
  });
}

function isSessionClaims(value: jwt.JwtPayload): value is jwt.JwtPayload & SessionClaims {
  return typeof value.sub === "string" && (value.role === "admin" || value.role === "user");
}

export function clearSessionCookie(response: Response, config: AppConfig) {
  response.clearCookie(config.JWT_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.NODE_ENV === "production",
    path: "/"
  });
}
