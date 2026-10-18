import assert from "node:assert/strict";
import test from "node:test";
import { DocumentChangedError, planWrite, type WriteTarget } from "../src/write-plan";

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

test("display equations cannot split list, quote, or indented paragraphs", () => {
	for (const snapshot of ["- here", "1. here", "> here", "> [!note]\n> here", "  here"]) {
		const from = snapshot.indexOf("here");
		assert.throws(() => planWrite(snapshot, { snapshot, from, to: from }, "x", true), /行内公式/);
		assert.equal(planWrite(snapshot, { snapshot, from, to: from }, "x", false), "$x$");
	}
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
