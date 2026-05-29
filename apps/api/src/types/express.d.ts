import "express";

export type JwtUserPayload = {
  userId: string;
  email: string;
  username: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export {};
