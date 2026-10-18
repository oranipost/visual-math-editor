import assert from "node:assert/strict";
import test from "node:test";
import { findMathRanges, formatMath, isMathInsertionAllowed, mathAtSelection } from "../src/math-ranges";

test("returns exact exclusive offsets for multiple inline and multiline display equations", () => {
	const text = "中文 $x^2$ plus $\\frac{a}{b}$\n$$\n\\sum_{i=1}^{n} i\n$$\n";
	const ranges = findMathRanges(text);
	assert.deepEqual(ranges.map((range) => [range.latex, range.display]), [
		["x^2", false], ["\\frac{a}{b}", false], ["\n\\sum_{i=1}^{n} i\n", true],
	]);
	for (const range of ranges) {
		const delimiter = range.display ? "$$" : "$";
		assert.equal(text.slice(range.from, range.to), delimiter + range.latex + delimiter);
		assert.equal(text.slice(range.contentFrom, range.contentTo), range.latex);
	}
});

test("recognizes escape parity for opening and closing dollar signs", () => {
	assert.deepEqual(findMathRanges(String.raw`\$ignored$ and $x + \$5$`).map((r) => r.latex), [String.raw`x + \$5`]);
	assert.deepEqual(findMathRanges(String.raw`\\$x$`).map((r) => r.latex), ["x"]);
	assert.deepEqual(findMathRanges(String.raw`$x\\$`).map((r) => r.latex), [String.raw`x\\`]);
	assert.deepEqual(findMathRanges(String.raw`\$$not display$$`).map((r) => r.latex), []);
});

test("ignores currency while retaining nearby formulas and explicit numeric equations", () => {
	const text = "Costs $20 and $30, then use $x + y$. Total $50. Numeric $20$.";
	assert.deepEqual(findMathRanges(text).map((r) => r.latex), ["x + y", "20"]);
	assert.deepEqual(findMathRanges("$5, $10, and $15. $20 and$30").map((r) => r.latex), []);
});

test("excludes YAML frontmatter and accepts a BOM, CRLF, and ... terminator", () => {
	const text = "\uFEFF---\r\ntitle: $not$\r\n...\r\n$x$\r\n";
	assert.deepEqual(findMathRanges(text).map((r) => r.latex), ["x"]);
	assert.deepEqual(findMathRanges("---\ntitle: $not$\n").map((r) => r.latex), []);
	assert.deepEqual(findMathRanges("Heading\n---\n$x$").map((r) => r.latex), ["x"]);
});

test("excludes matching backtick and tilde fences, including longer closing fences", () => {
	const text = "```ts\n$not$\n````\n$x$\n  ~~~~ text\n$$not$$\n~~~\n$still not$\n~~~~\n$y$";
	assert.deepEqual(findMathRanges(text).map((r) => r.latex), ["x", "y"]);
	assert.deepEqual(findMathRanges("~~~\n$x$").map((r) => r.latex), []);
});

test("excludes inline code runs, including multiple backticks and multiline spans", () => {
	const text = "`$not$` $x$ `` `$also not$` ``\n`code\n$still not$` and $y$";
	assert.deepEqual(findMathRanges(text).map((r) => r.latex), ["x", "y"]);
	assert.deepEqual(findMathRanges("An unmatched ` and $x$.").map((r) => r.latex), ["x"]);
});

test("excludes fenced examples nested in blockquotes or list items", () => {
	const text = "> ```md\n> $not$\n> ```\n$x$\n- ~~~md\n  $also not$\n  ~~~\n$y$\n> - ```\n>   $still not$\n>   ```\n$z$";
	assert.deepEqual(findMathRanges(text).map((r) => r.latex), ["x", "y", "z"]);
});

test("excludes HTML comments without treating comment text inside code as a real comment", () => {
	const text = "<!-- $not$ `literal`\n$$also not$$ --> $x$ `<!--` $y$ <!-- `unclosed backtick --> $z$";
	assert.deepEqual(findMathRanges(text).map((r) => r.latex), ["x", "y", "z"]);
	assert.deepEqual(findMathRanges("$x$ <!-- $not$\n$also not$").map((r) => r.latex), ["x"]);
});

test("excludes Markdown link and image destinations while retaining formulas in labels", () => {
	const text = "[$x$](https://example.com/$not$) ![alt](../images/$also-not$.svg) [file](../($nested$).md) $y$";
	assert.deepEqual(findMathRanges(text).map((r) => r.latex), ["x", "y"]);
	assert.deepEqual(findMathRanges('[file](../$not$.md "title $also-not$") $x$').map((r) => r.latex), ["x"]);
});

test("excludes raw URLs, autolinks, and reference-link definitions", () => {
	const text = "https://example.com/($not$) www.example.com/$also-not$ <https://example.com/$no$> $x$\n[ref]: ../$not$.md\n[^note]: $footnote$";
	assert.deepEqual(findMathRanges(text).map((r) => r.latex), ["x", "footnote"]);
});

test("excludes HTML attributes and blocks until Markdown resumes", () => {
	const text = '<span title="$not$ > text">Text</span> $x$\n<div>\n$not$\n</div>\n\n$y$\n<pre>\n\n$not$\n</pre>\n$z$';
	assert.deepEqual(findMathRanges(text).map((r) => r.latex), ["x", "y", "z"]);
	assert.deepEqual(findMathRanges("<div>$not$</div>\n$still not$\n\n$x$").map((r) => r.latex), ["x"]);
});

test("rejects new insertion in metadata, code, comments, HTML, and URLs", () => {
	const cases = [
		"---\ntitle: here\n---\n", "```md\nhere\n```\n", "~~~\nhere\n~~~\n", "    here", "`here`",
		"<!-- here -->", "[link](../here.md)", '<span title="here">text</span>', "https://example.com/here",
		"<div>\nhere\n</div>\n\n", "[ref]: ../here.md",
	];
	for (const text of cases) {
		assert.equal(isMathInsertionAllowed(text, text.indexOf("here") + 2), false, text);
	}
	assert.equal(isMathInsertionAllowed("[label](url)", 3), true);
	for (const offset of [-1, 1.5, NaN, 100]) assert.equal(isMathInsertionAllowed("text", offset), false);
});

test("handles insertion at end-of-document and completed exclusion boundaries", () => {
	for (const text of ["", "ordinary text", "ordinary text\n", "`code`", "<!-- done -->", "[label](url)", "```\ncode\n```\n"]) {
		assert.equal(isMathInsertionAllowed(text, text.length), true, text);
	}
	for (const text of ["---\nkey: value", "---\nkey: value\n", "```\ncode\n", "```\ncode\n```", "    code", "<!-- unfinished", "https://example.com", "<div>\ntext\n"]) {
		assert.equal(isMathInsertionAllowed(text, text.length), false, text);
	}
});

test("ignores indented code while allowing indented display equation contents", () => {
	const text = "    $not$\n\t$$not$$\n   \t$not$\n$$\n    \\frac{x}{y}\n$$\n$x$";
	assert.deepEqual(findMathRanges(text).map((r) => r.latex), ["\n    \\frac{x}{y}\n", "x"]);
});

test("does not span code blocks or accept incomplete, empty, or ambiguous delimiters", () => {
	for (const text of ["$unclosed", "$$unclosed", "$ x$", "$x $", "$x\ny$", "$$$$", "$$ \n $$", "$$$x$$$"]) {
		assert.deepEqual(findMathRanges(text), [], text);
	}
	assert.deepEqual(findMathRanges("$$\n```\n$$\n```\n").map((r) => r.latex), []);
	assert.deepEqual(findMathRanges("$a $$b$$ c$").map((r) => r.latex), ["b"]);
});

test("supports single dollar symbols within a display equation", () => {
	assert.deepEqual(findMathRanges("$$\\text{price $5}$$").map((r) => [r.latex, r.display]), [["\\text{price $5}", true]]);
});

test("finds a cursor or selection only inside one math range", () => {
	const text = "A $x + y$ and $z$ end";
	const range = findMathRanges(text)[0];
	assert.deepEqual(mathAtSelection(text, range.from, range.from), range);
	assert.deepEqual(mathAtSelection(text, range.contentFrom + 1, range.contentFrom + 1), range);
	assert.deepEqual(mathAtSelection(text, range.from, range.to), range);
	assert.deepEqual(mathAtSelection(text, range.contentFrom, range.contentTo), range);
	assert.equal(mathAtSelection(text, range.to, range.to), null);
	assert.equal(mathAtSelection(text, range.from - 1, range.contentTo), null);
	assert.equal(mathAtSelection(text, range.from, text.indexOf("$z$") + 3), null);
	for (const [from, to] of [[-1, 0], [0, text.length + 1], [3, 2], [1.5, 2], [NaN, 2]]) {
		assert.equal(mathAtSelection(text, from, to), null);
	}
});

test("serializes native Markdown and round trips visual editor output", () => {
	assert.equal(formatMath("  \\frac{a}{b}  ", false), "$\\frac{a}{b}$");
	assert.equal(formatMath(" x\n + y ", false), "$x + y$");
	assert.equal(formatMath("  \\int_0^1 x\\,dx ", true), "$$\n\\int_0^1 x\\,dx\n$$");
	for (const display of [false, true]) {
		const markdown = formatMath(String.raw`\frac{\sqrt{x_1}}{x^2} + \sum_{n=0}^{\infty} n`, display);
		const ranges = findMathRanges(markdown);
		assert.equal(ranges.length, 1);
		assert.equal(ranges[0].from, 0);
		assert.equal(ranges[0].to, markdown.length);
		assert.equal(ranges[0].display, display);
	}
	assert.throws(() => formatMath(" \n ", false), /empty/);
	assert.throws(() => formatMath("$x$", false), /dollar/);
	assert.equal(formatMath(String.raw`\text{\$5}`, false), String.raw`$\text{\$5}$`);
});
