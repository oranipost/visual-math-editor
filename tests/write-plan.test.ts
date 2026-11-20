import assert from "node:assert/strict";
import test from "node:test";
import { findMathRanges } from "../src/math-ranges";
import {
	assertTopLevelBlockContext,
	defaultDisplayForContext,
	DocumentChangedError,
	planWrite,
	type WriteTarget,
} from "../src/write-plan";

function apply(snapshot: string, from: number, to: number, latex: string, display: boolean): string {
	return snapshot.slice(0, from) + planWrite(snapshot, { snapshot, from, to }, latex, display) + snapshot.slice(to);
}

test("inline insertion keeps all surrounding text and UTF-16 positions intact", () => {
	const snapshot = "中文 🧮 before | after 🚀";
	const at = snapshot.indexOf("|");
	assert.equal(apply(snapshot, at, at, String.raw`\frac{1}{2}`, false), "中文 🧮 before $\\frac{1}{2}$| after 🚀");
});

test("editing one formula preserves the rest of the note exactly", () => {
	const snapshot = "Header\n\nFirst $x$ and second $y$.\n\nFooter\n";
	const from = snapshot.indexOf("$y$");
	assert.equal(apply(snapshot, from, from + 3, "z^2", false), "Header\n\nFirst $x$ and second $z^2$.\n\nFooter\n");
});

test("a display equation inserted into prose gets its own paragraph", () => {
	const snapshot = "BeforeAfter";
	assert.equal(apply(snapshot, 6, 6, "x+y", true), "Before\n\n$$\nx+y\n$$\n\nAfter");
});

test("display insertion reuses existing paragraph boundaries without extra blank lines", () => {
	for (const [before, after] of [["Before\n\n", "\n\nAfter"], ["Before\n", "\nAfter"], ["Before\n\n\n", "\n\n\nAfter"]]) {
		const snapshot = before + after;
		const result = apply(snapshot, before.length, before.length, "x", true);
		const expectedBefore = before.endsWith("\n\n") ? before : before + "\n";
		const expectedAfter = after.startsWith("\n\n") ? after : "\n" + after;
		assert.equal(result, expectedBefore + "$$\nx\n$$" + expectedAfter);
	}
});

test("display insertion at document edges adds only the required separator", () => {
	assert.equal(apply("", 0, 0, "x", true), "$$\nx\n$$");
	assert.equal(apply("After", 0, 0, "x", true), "$$\nx\n$$\n\nAfter");
	assert.equal(apply("Before", 6, 6, "x", true), "Before\n\n$$\nx\n$$");
});

test("converting inline math to display preserves adjacent words and spaces", () => {
	const snapshot = "Before $x$ after.";
	const from = snapshot.indexOf("$x$");
	assert.equal(apply(snapshot, from, from + 3, "x^2", true), "Before \n\n$$\nx^2\n$$\n\n after.");
});

test("converting display math to inline preserves the existing surrounding paragraphs", () => {
	const snapshot = "Before\n\n$$\nx\n$$\n\nAfter\n";
	const from = snapshot.indexOf("$$");
	const to = snapshot.indexOf("$$", from + 2) + 2;
	assert.equal(apply(snapshot, from, to, "x+1", false), "Before\n\n$x+1$\n\nAfter\n");
});

test("a changed note always rejects a stale edit, including unrelated edits", () => {
	const snapshot = "Before $x$ after";
	const from = snapshot.indexOf("$x$");
	const target: WriteTarget = { snapshot, from, to: from + 3 };
	for (const current of [snapshot + "!", snapshot.replace("Before", "Updated"), snapshot.replace("$x$", "$y$")]) {
		assert.throws(() => planWrite(current, target, "z", false), DocumentChangedError);
	}
});

test("a changed note rejects a stale insertion as well as a stale replacement", () => {
	const target: WriteTarget = { snapshot: "BeforeAfter", from: 6, to: 6 };
	assert.throws(() => planWrite("Before!After", target, "x", true), DocumentChangedError);
	const error = new DocumentChangedError();
	assert.ok(error instanceof Error);
	assert.match(error.message, /笔记已发生变化/);
});

test("out-of-bounds or reversed source ranges are rejected before creating replacement text", () => {
	const snapshot = "abc";
	for (const [from, to] of [[-1, 0], [2, 1], [0, 4]]) {
		assert.throws(() => planWrite(snapshot, { snapshot, from, to }, "x", false), /公式位置无效/);
	}
});

test("display insertion cannot split a Markdown table cell", () => {
	for (const snapshot of ["| A | B |\n| --- | --- |\n| here | value |", "A | B\n--- | ---\nhere | value"]) {
		const from = snapshot.indexOf("here");
		assert.throws(() => planWrite(snapshot, { snapshot, from, to: from }, "x", true), /行内公式/);
	}
});

test("table context is retained after many body rows without leading pipes", () => {
	const snapshot = "A | B\n--- | ---\n" + "first | second\n".repeat(8) + "here | value";
	const from = snapshot.indexOf("here");
	assert.throws(() => planWrite(snapshot, { snapshot, from, to: from }, "x", true), /行内公式/);
	assert.equal(planWrite(snapshot, { snapshot, from, to: from }, "|x|", false), "$\\vert{}x\\vert{}$");
});

test("inline table formulas serialize pipes without creating extra table cells", () => {
	const snapshot = "| A | B |\n| --- | --- |\n| here | value |";
	const from = snapshot.indexOf("here");
	assert.equal(planWrite(snapshot, { snapshot, from, to: from }, "|x|", false), "$\\vert{}x\\vert{}$");
	assert.equal(planWrite(snapshot, { snapshot, from, to: from }, String.raw`\|x\|`, false), "$\\Vert{}x\\Vert{}$");
	const complex = String.raw`\begin{array}{c|c}x&y\end{array}`;
	assert.throws(() => planWrite(snapshot, { snapshot, from, to: from }, complex, false), /复杂环境/);
});

test("pipes in ordinary prose formulas retain their mathematical source", () => {
	const snapshot = "Before here after";
	const from = snapshot.indexOf("here");
	assert.equal(planWrite(snapshot, { snapshot, from, to: from }, "|x|", false), "$|x|$");
});

test("display equations cannot split list or indented paragraphs, including inside quotes", () => {
	for (const snapshot of ["- here", "1. here", "  here", "> - here", "> 1. here", ">   here"]) {
		const from = snapshot.indexOf("here");
		assert.throws(() => planWrite(snapshot, { snapshot, from, to: from }, "x", true), /行内公式/);
		assert.equal(planWrite(snapshot, { snapshot, from, to: from }, "x", false), "$x$");
	}
});

test("pure blockquotes and Obsidian Callouts support multiline display equations and round-trip cleanly", () => {
	// 1. Blank Callout line (bytes before `target.from` stay untouched; continuation lines carry `> `)
	const callout = "> [!note] Pythagorean Theorem\n> ";
	const afterCallout = apply(callout, callout.length, callout.length, "a^2 + b^2 = c^2", true);
	assert.equal(afterCallout, "> [!note] Pythagorean Theorem\n> \n> $$\n> a^2 + b^2 = c^2\n> $$");
	const calloutRanges = findMathRanges(afterCallout);
	assert.equal(calloutRanges.length, 1);
	assert.equal(calloutRanges[0]!.display, true);
	assert.equal(calloutRanges[0]!.latex.trim(), "a^2 + b^2 = c^2");

	// Re-editing an existing quoted display equation preserves quote prefixes without doubling `>`
	const updatedCallout = apply(afterCallout, calloutRanges[0]!.from, calloutRanges[0]!.to, String.raw`\displaylines{x=1\\ y=2}`, true);
	assert.equal(updatedCallout, "> [!note] Pythagorean Theorem\n> \n> $$\n> \\displaylines{x=1\\\\ y=2}\n> $$");
	const updatedRanges = findMathRanges(updatedCallout);
	assert.equal(updatedRanges.length, 1);
	assert.equal(updatedRanges[0]!.latex.trim(), String.raw`\displaylines{x=1\\ y=2}`);

	// 2. Splitting quoted prose keeps both halves inside the blockquote without modifying bytes before `from`
	const quotedProse = "> BeforeAfter";
	const at = quotedProse.indexOf("After");
	const splitQuoted = apply(quotedProse, at, at, "E = mc^2", true);
	assert.equal(splitQuoted, "> Before\n>\n> $$\n> E = mc^2\n> $$\n>\n> After");
	const splitRanges = findMathRanges(splitQuoted);
	assert.equal(splitRanges.length, 1);
	assert.equal(splitRanges[0]!.latex.trim(), "E = mc^2");

	// 3. Nested blockquote `>> ` and multiline source
	const nestedQuote = ">> ";
	const nestedSaved = apply(nestedQuote, nestedQuote.length, nestedQuote.length, "a = 1 \\\\\nb = 2", true);
	assert.equal(nestedSaved, ">> $$\n>> a = 1 \\\\\n>> b = 2\n>> $$");
	const nestedRanges = findMathRanges(nestedSaved);
	assert.equal(nestedRanges.length, 1);
	assert.equal(nestedRanges[0]!.latex.trim(), "a = 1 \\\\\nb = 2");

	// 4. Quoted tables still forbid display equations while escaping inline pipes
	const quotedTable = "> | A | B |\n> | --- | --- |\n> | here | v |";
	const tablePos = quotedTable.indexOf("here");
	assert.throws(() => planWrite(quotedTable, { snapshot: quotedTable, from: tablePos, to: tablePos }, "x", true), /行内公式/);
	assert.equal(planWrite(quotedTable, { snapshot: quotedTable, from: tablePos, to: tablePos }, "|x|", false), "$\\vert{}x\\vert{}$");

	// 5. Top-level fenced blocks (e.g. vme-plot) still reject blockquotes
	assert.throws(() => assertTopLevelBlockContext(callout, { snapshot: callout, from: callout.length, to: callout.length }), /行内公式/);
});

test("defaultDisplayForContext picks inline on non-empty lines/lists/tables and display on blank or empty quote lines", () => {
	assert.equal(defaultDisplayForContext("", 0), true);
	assert.equal(defaultDisplayForContext("Heading\n\n", 9), true);
	assert.equal(defaultDisplayForContext("> ", 2), true);
	assert.equal(defaultDisplayForContext("> [!note] Title\n> ", 18), true);
	assert.equal(defaultDisplayForContext(">>   ", 5), true);

	assert.equal(defaultDisplayForContext("Given ", 6), false);
	assert.equal(defaultDisplayForContext("Before  after", 7), false);
	assert.equal(defaultDisplayForContext("> Given ", 8), false);
	assert.equal(defaultDisplayForContext("> [!note] Title", 15), false);
	assert.equal(defaultDisplayForContext("- ", 2), false);
	assert.equal(defaultDisplayForContext("1. ", 3), false);
	assert.equal(defaultDisplayForContext("> - ", 4), false);
	assert.equal(defaultDisplayForContext("  ", 2), false);
	const table = "|  | B |\n| --- | --- |";
	assert.equal(defaultDisplayForContext(table, 2), false);
});

test("display insertion preserves lazy continuation list and quote paragraphs", () => {
	for (const snapshot of ["- A paragraph\nhere", "> A quotation\nhere"]) {
		const from = snapshot.indexOf("here");
		assert.throws(() => planWrite(snapshot, { snapshot, from, to: from }, "x", true), /行内公式/);
	}
});

test("a blank paragraph after a list or quote permits a new display equation", () => {
	for (const before of ["- List item\n\n", "> Quote\n\n"]) {
		const snapshot = before + "here";
		assert.equal(planWrite(snapshot, { snapshot, from: before.length, to: before.length }, "x", true), "$$\nx\n$$\n\n");
	}
});

test("in-box multiline displaylines round-trips through planWrite and findMathRanges in both display and inline notes", () => {
	const initialNote = "# Multiline Note\n\nDerivation:\n\n";
	const twoLineLatex = String.raw`\displaylines{x+1=2\\ y=\frac{x+1}{\sqrt{x^2+1}}}`;
	const afterSave1 = apply(initialNote, initialNote.length, initialNote.length, twoLineLatex, true);
	const ranges1 = findMathRanges(afterSave1);
	assert.equal(ranges1.length, 1);
	assert.equal(ranges1[0]!.display, true);
	assert.equal(ranges1[0]!.latex.trim(), twoLineLatex);

	const threeLineLatex = String.raw`\displaylines{x+1=2\\ y=\frac{x+1}{\sqrt{x^2+1}}\\ z=3}`;
	const afterSave2 = apply(afterSave1, ranges1[0]!.from, ranges1[0]!.to, threeLineLatex, true);
	const ranges2 = findMathRanges(afterSave2);
	assert.equal(ranges2.length, 1);
	assert.equal(ranges2[0]!.latex.trim(), threeLineLatex);

	const inlineNote = "Inline derivation:  end.";
	const insertAt = inlineNote.indexOf("  ") + 1;
	const afterInlineSave = apply(inlineNote, insertAt, insertAt, "\\displaylines{a=1\\\\\nb=2}", false);
	const inlineRanges = findMathRanges(afterInlineSave);
	assert.equal(inlineRanges.length, 1);
	assert.equal(inlineRanges[0]!.display, false);
	assert.equal(inlineRanges[0]!.latex, String.raw`\displaylines{a=1\\ b=2}`);
});
