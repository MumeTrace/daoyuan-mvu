function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, character => `\\${character}`);
}

export function cleanGeneratedMessage(raw: string, characterName: string): string {
  if (!raw.trim()) return "对方似乎没有想好怎么回复...";
  let result = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const tagged = result.match(/\[REPLY\]([\s\S]*?)\[\/REPLY\]/i)
    ?? result.match(/【回复】([\s\S]*?)【\/回复】/);
  if (tagged?.[1]) result = tagged[1].trim();
  else {
    const name = escapeRegExp(characterName);
    result = result
      .replace(new RegExp(`^(?:【?${name}】?\\s*(?:说)?\\s*[:：\\n])`, "i"), "")
      .replace(/^[<q>"'「“]|["<\/q>'」”]$/g, "")
      .trim();
  }
  return result || "对方传来了模糊不清的神念...";
}
