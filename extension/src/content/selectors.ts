const DATA_ATTRIBUTE_PRIORITY = ["data-testid", "data-test", "data-qa", "data-cy", "data-equalens-id"] as const;

export function createUniqueSelector(element: Element, root: ParentNode = element.ownerDocument): string {
  if (!element.isConnected) throw new Error("Cannot create a selector for a detached element.");

  if (element.id) {
    const idSelector = `#${escapeIdentifier(element.id)}`;
    if (isUniqueMatch(root, idSelector, element)) return idSelector;
  }

  const dataSelector = uniqueDataSelector(element, root);
  if (dataSelector) return dataSelector;

  const segments: string[] = [];
  let current: Element | null = element;
  while (current) {
    if (current.id) {
      const idSelector = `#${escapeIdentifier(current.id)}`;
      if (isUniqueMatch(root, idSelector, current)) {
        segments.unshift(idSelector);
        break;
      }
    }

    const anchor = uniqueDataSelector(current, root);
    if (anchor) {
      segments.unshift(anchor);
      break;
    }

    const parent: Element | null = current.parentElement;
    const tagName = current.tagName.toLowerCase();
    if (!parent) {
      segments.unshift(tagName);
      break;
    }

    const index = Array.prototype.indexOf.call(parent.children, current) + 1;
    segments.unshift(`${tagName}:nth-child(${index})`);
    current = parent;
  }

  const selector = segments.join(" > ");
  if (!isUniqueMatch(root, selector, element)) throw new Error("Unable to create a unique selector for the element.");
  return selector;
}

function uniqueDataSelector(element: Element, root: ParentNode): string | null {
  const attributes = [
    ...DATA_ATTRIBUTE_PRIORITY.map((name) => element.getAttributeNode(name)).filter((item): item is Attr => Boolean(item)),
    ...[...element.attributes]
      .filter(({ name, value }) => name.startsWith("data-") && value.trim().length > 0 && !DATA_ATTRIBUTE_PRIORITY.includes(name as never))
      .sort((left, right) => left.name.localeCompare(right.name)),
  ];

  for (const attribute of attributes) {
    if (!attribute.value.trim()) continue;
    const selector = `[${escapeIdentifier(attribute.name)}="${escapeAttributeValue(attribute.value)}"]`;
    if (isUniqueMatch(root, selector, element)) return selector;
  }
  return null;
}

function isUniqueMatch(root: ParentNode, selector: string, element: Element): boolean {
  try {
    const matches = root.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch {
    return false;
  }
}

function escapeAttributeValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\a ");
}

function escapeIdentifier(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);

  return [...value].map((character, index) => {
    const codePoint = character.codePointAt(0) ?? 0;
    const safe = /[a-zA-Z0-9_-]/.test(character);
    if (safe && !(index === 0 && /[0-9]/.test(character))) return character;
    if (index === 0 && /[0-9]/.test(character)) return `\\${codePoint.toString(16)} `;
    return `\\${character}`;
  }).join("");
}
