export function encodeCursor(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeCursor(value?: string | null) {
  if (!value) {
    return undefined;
  }

  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}
