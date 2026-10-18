/** All offsets are UTF-16 positions, with exclusive `to` endpoints. */
export interface MathRange {
	from: number;
	to: number;
	contentFrom: number;
	contentTo: number;
	latex: string;
	display: boolean;
}

interface Line {
	from: number;
	to: number;
	text: string;
}

function linesOf(text: string): Line[] {
	const lines: Line[] = [];
	let from = 0;
	while (from < text.length) {
		const newline = text.indexOf("\n", from);
		const to = newline === -1 ? text.length : newline + 1;
		lines.push({ from, to, text: text.slice(from, to).replace(/\r?\n$/, "") });
		from = to;
	}
	return lines;
}

function escaped(text: string, at: number): boolean {
	let backslashes = 0;
	for (let i = at - 1; i >= 0 && text[i] === "\\"; i--) backslashes++;
	return backslashes % 2 === 1;
}

function runLength(text: string, at: number, character: string): number {
	let to = at;
	while (to < text.length && text[to] === character) to++;
	return to - at;
}

function withoutQuotePrefixes(line: string): string {
	let value = line;
	while (/^ {0,3}>/.test(value)) value = value.replace(/^ {0,3}>[ \t]?/, "");
	return value;
}

function fenceOpening(line: string): { character: string; length: number; listIndent: number } | null {
	let value = withoutQuotePrefixes(line);
	let listIndent = 0;
	// Fences can start in a list item as well as in the document itself.
	for (;;) {
		const marker = value.match(/^ {0,3}(?:[-+*]|\d{1,9}[.)])[ \t]+/);
		if (!marker) break;
		listIndent += marker[0].length;
		value = value.slice(marker[0].length);
	}
	const opening = value.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
	if (!opening || (opening[1][0] === "`" && opening[2].includes("`"))) return null;
	return { character: opening[1][0], length: opening[1].length, listIndent };
}

function excludeLinksAndHtml(text: string, lines: Line[], blocked: Uint8Array, indented: Uint8Array): void {
	// CommonMark HTML block elements continue until a blank line. Raw HTML elements
	// such as <pre> instead continue through their corresponding closing tag.
	const blockTags = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
	const blockOpening = new RegExp(`^ {0,3}</?(?:${blockTags})(?:\\s|/?>|$)`, "i");
	let htmlBlock: string | null = null;
	for (const line of lines) {
		const value = withoutQuotePrefixes(line.text);
		if (htmlBlock === "blank" && !value.trim()) htmlBlock = null;
		if (!htmlBlock) {
			const openingAt = line.from + line.text.indexOf("<");
			if (openingAt >= line.from && !blocked[openingAt] && !indented[openingAt]) {
				const raw = value.match(/^ {0,3}<(pre|script|style|textarea)(?:\s|>|$)/i);
				if (raw) htmlBlock = raw[1].toLowerCase();
				else if (blockOpening.test(value)) htmlBlock = "blank";
			}
		}
		if (htmlBlock) {
			blocked.fill(1, line.from, line.to);
			if (htmlBlock !== "blank" && new RegExp(`</${htmlBlock}\\s*>`, "i").test(value)) htmlBlock = null;
			if (line.to === text.length && !text.endsWith("\n")) blocked[text.length] = 1;
		}
		// Reference-link definitions are hidden metadata, while footnote bodies can
		// contain rendered math and are intentionally left available.
		if (/^ {0,3}\[(?!\^)[^\]\r\n]+\]:[ \t]*/.test(value)) {
			blocked.fill(1, line.from, line.to);
			if (line.to === text.length && !text.endsWith("\n")) blocked[text.length] = 1;
		}
	}
	if (htmlBlock) blocked[text.length] = 1;

	for (let i = 0; i < text.length; i++) {
		if (blocked[i] || indented[i]) continue;
		// Protect attributes and autolinks; quote-aware scanning avoids an attribute
		// such as title="a > b" ending the exclusion early.
		if (text[i] === "<" && /^(?:\/?[A-Za-z][A-Za-z0-9:-]*(?=[\s/>])|[!?]|(?:https?:\/\/|mailto:))/i.test(text.slice(i + 1))) {
			let quote = "";
			for (let end = i + 1; end < text.length; end++) {
				const character = text[end];
				if (quote) {
					if (character === quote) quote = "";
				} else if (character === '"' || character === "'") quote = character;
				else if (character === ">") {
					blocked.fill(1, i, end + 1);
					i = end;
					break;
				}
			}
		}

		if (text[i] !== "]" || text[i + 1] !== "(" || escaped(text, i)) continue;
		const from = i + 1;
		let depth = 1;
		let end = from + 1;
		while (end < text.length && text[end] !== "\n" && text[end] !== "\r") {
			if (!escaped(text, end)) {
				if (text[end] === "(") depth++;
				if (text[end] === ")" && --depth === 0) break;
			}
			end++;
		}
		const closed = end < text.length && text[end] === ")" && depth === 0;
		blocked.fill(1, from, closed ? end + 1 : end);
		if (!closed) blocked[end] = 1;
		i = closed ? end : end - 1;
	}

	// Raw URLs are also clickable in Obsidian. Include their endpoint because
	// inserting immediately there would extend the URL rather than add an equation.
	const urls = /\b(?:https?:\/\/|ftp:\/\/|mailto:|obsidian:\/\/|www\.)[^\s<>"'`]+/gi;
	for (const match of text.matchAll(urls)) {
		const from = match.index;
		if (!blocked[from] && !indented[from]) blocked.fill(1, from, from + match[0].length + 1);
	}
}

/**
 * Keep Markdown regions that must never be replaced out of math detection.
 * Indentation is separate: indented lines are legal *inside* a display equation.
 */
function excludedRegions(text: string): { blocked: Uint8Array; indented: Uint8Array } {
	// The extra position describes insertion at end-of-document, where a trailing
	// code line or an unterminated region is still unsafe even without a character.
	const blocked = new Uint8Array(text.length + 1);
	const indented = new Uint8Array(text.length + 1);
	const lines = linesOf(text);
	let frontmatter = lines.length > 0 && lines[0].text.replace(/^\uFEFF/, "") === "---";
	let fence: { character: string; length: number; listIndent: number } | null = null;

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		if (frontmatter) {
			blocked.fill(1, line.from, line.to);
			if (line.to === text.length && !text.endsWith("\n")) blocked[text.length] = 1;
			if (index > 0 && /^(?:---|\.\.\.)\s*$/.test(line.text)) frontmatter = false;
			continue;
		}

		if (fence) {
			blocked.fill(1, line.from, line.to);
			if (line.to === text.length && !text.endsWith("\n")) blocked[text.length] = 1;
			const closing = withoutQuotePrefixes(line.text).match(/^( *)(`+|~+)\s*$/);
			if (closing && closing[1].length <= 3 + fence.listIndent &&
				closing[2][0] === fence.character && closing[2].length >= fence.length) {
				fence = null;
			}
			continue;
		}

		const opening = fenceOpening(line.text);
		if (opening) {
			fence = opening;
			blocked.fill(1, line.from, line.to);
			if (line.to === text.length && !text.endsWith("\n")) blocked[text.length] = 1;
			continue;
		}

		// Deliberately conservative: even an indented paragraph is not editable math.
		if (/^(?: {4}|\t| {1,3}\t)/.test(line.text)) {
			indented.fill(1, line.from, line.to);
			if (line.to === text.length && !text.endsWith("\n")) indented[text.length] = 1;
		}
	}
	if (frontmatter || fence) blocked[text.length] = 1;

	// Scan comments and code together so delimiters written inside one region do
	// not accidentally begin the other region outside it.
	for (let i = 0; i < text.length;) {
		if (blocked[i] || indented[i]) {
			i++;
			continue;
		}
		if (text.startsWith("<!--", i)) {
			const close = text.indexOf("-->", i + 4);
			const to = close === -1 ? text.length + 1 : close + 3;
			blocked.fill(1, i, to);
			i = to;
			continue;
		}
		if (text[i] !== "`" || escaped(text, i)) {
			i++;
			continue;
		}
		const width = runLength(text, i, "`");
		let end = i + width;
		let found = false;
		while (end < text.length && !blocked[end]) {
			if (text[end] !== "`") {
				end++;
				continue;
			}
			const closingWidth = runLength(text, end, "`");
			if (closingWidth === width) {
				blocked.fill(1, i, end + width);
				i = end + width;
				found = true;
				break;
			}
			end += closingWidth;
		}
		if (!found) i += width;
	}
	excludeLinksAndHtml(text, lines, blocked, indented);

	return { blocked, indented };
}

function makeRange(text: string, from: number, closing: number, width: number): MathRange {
	return {
		from,
		to: closing + width,
		contentFrom: from + width,
		contentTo: closing,
		latex: text.slice(from + width, closing),
		display: width === 2,
	};
}

/**
 * Find standard $inline$ and $$display$$ equations without touching code or YAML.
 *
 * Inline math follows conservative delimiter rules: no edge whitespace, no line
 * breaks, and no digit immediately after a closing $. This leaves ordinary
 * currency such as "$20 and $30" untouched. Malformed or ambiguous delimiters are
 * left alone. This intentionally does not implement every Markdown extension.
 */
export function findMathRanges(text: string): MathRange[] {
	const { blocked, indented } = excludedRegions(text);
	const ranges: MathRange[] = [];

	for (let i = 0; i < text.length;) {
		if (blocked[i] || indented[i] || text[i] !== "$" || escaped(text, i)) {
			i++;
			continue;
		}
		const width = runLength(text, i, "$");
		if (width > 2 || (width === 1 && (!text[i + 1] || /\s/.test(text[i + 1])))) {
			i += width;
			continue;
		}

		let cursor = i + width;
		let closing = -1;
		while (cursor < text.length && !blocked[cursor]) {
			if (width === 1 && (text[cursor] === "\n" || text[cursor] === "\r")) break;
			if (text[cursor] !== "$" || escaped(text, cursor)) {
				cursor++;
				continue;
			}
			const closingWidth = runLength(text, cursor, "$");
			if (closingWidth === width) {
				if (width === 2 || (!/\s/.test(text[cursor - 1]) && !/\d/.test(text[cursor + 1] ?? ""))) {
					closing = cursor;
				}
				// A dollar run is a boundary, even if it cannot close this equation.
				break;
			}
			if (width === 1) break;
			cursor += closingWidth;
		}

		if (closing !== -1 && text.slice(i + width, closing).trim().length > 0) {
			const range = makeRange(text, i, closing, width);
			ranges.push(range);
			i = range.to;
		} else {
			i += width;
		}
	}
	return ranges;
}

/**
 * A cursor must be inside the formula, including its opening delimiter but not
 * the position immediately after it. A selection must stay within one formula.
 */
export function mathAtSelection(text: string, from: number, to: number): MathRange | null {
	if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to > text.length) {
		return null;
	}
	return findMathRanges(text).find((range) =>
		from === to
			? range.from <= from && from < range.to
			: range.from <= from && to <= range.to,
	) ?? null;
}

/** Whether a new equation can be inserted at this cursor without entering code or metadata. */
export function isMathInsertionAllowed(text: string, offset: number): boolean {
	if (!Number.isInteger(offset) || offset < 0 || offset > text.length) return false;
	const { blocked, indented } = excludedRegions(text);
	return !blocked[offset] && !indented[offset];
}

/** Serialize only math contents; spacing around an insertion belongs to the caller. */
export function formatMath(latex: string, display: boolean): string {
	const value = latex.trim();
	if (!value) throw new Error("An equation cannot be empty.");
	for (let i = 0; i < value.length; i++) {
		if (value[i] === "$" && !escaped(value, i)) {
			throw new Error("Equation contents cannot include unescaped dollar delimiters.");
		}
	}
	return display ? `$$\n${value}\n$$` : `$${value.replace(/[ \t]*\r?\n[ \t]*/g, " ")}$`;
}
