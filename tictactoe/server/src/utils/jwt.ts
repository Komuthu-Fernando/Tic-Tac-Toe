import jwt, { SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms"; 

const JWT_SECRET: string = process.env.JWT_SECRET || "supersecret";

export const signToken = (payload: object, expiresIn: StringValue | number = "1h") => {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, options);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET as jwt.Secret);
};
