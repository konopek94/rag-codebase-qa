import ignore, { type Ignore } from "ignore";

export function buildIgnoreMatcher(gitignoreContent: string, userPatterns: string): Ignore {
  const matcher = ignore();
  if (gitignoreContent.trim().length > 0) {
    matcher.add(gitignoreContent);
  }
  if (userPatterns.trim().length > 0) {
    matcher.add(userPatterns);
  }
  return matcher;
}
