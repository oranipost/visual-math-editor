import assert from "node:assert/strict";
import test from "node:test";
import { validateLatexSource } from "../src/source-validation";

test("accepts complete formulas, literal symbols, and paired environments", () => {
	for (const source of [
		String.raw`\frac{\sqrt{x_1}}{x^2} + \sum_{n=0}^{\infty} n`,
		String.raw`\left\{x \mid x > 0\right\}`,
		String.raw`\text{Price: \$5; tax: 5\%}`,
		String.raw`\begin{pmatrix}a & b \\ c & d\end{pmatrix}`,
		String.raw`\begin{aligned}x &= \begin{matrix}1&2\end{matrix}\\ y &= 2\end{aligned}`,
		String.raw`\begin{align*} x &= 1 \end{align*}`,
		"  x + y\n  ",
	]) assert.equal(validateLatexSource(source), null, source);
});

test("rejects Markdown and outer TeX math delimiters", () => {
	for (const source of ["$x$", "$$\nx\n$$", String.raw`\(x\)`, String.raw`\[x\]`, String.raw`x \\$ y`]) {
		assert.match(validateLatexSource(source) ?? "", /分隔符/, source);
	}
	assert.equal(validateLatexSource(String.raw`\$x\$`), null);
});

test("handles escaped braces and backslash parity without rejecting literal intervals", () => {
	assert.equal(validateLatexSource(String.raw`\{x\}`), null);
	assert.equal(validateLatexSource("(0,1]"), null);
	for (const source of [String.raw`\frac{x}{y`, "x}", "}{", String.raw`x\\{`]) {
		assert.match(validateLatexSource(source) ?? "", /花括号/, source);
	}
});

test("rejects incomplete or mismatched environment names and scope", () => {
	for (const source of [
		String.raw`\begin{matrix}x`, String.raw`\end{matrix}`, String.raw`\begin{matrix}x\end{aligned}`,
		String.raw`\begin`, String.raw`\begin{`, String.raw`\begin{}x\end{}`, String.raw`\begin{{matrix}}`,
		String.raw`{\begin{matrix}}x\end{matrix}`,
	]) assert.match(validateLatexSource(source) ?? "", /环境/, source);
});

test("rejects a dangling backslash after outer trimming but accepts a complete control symbol", () => {
	assert.match(validateLatexSource("x\\") ?? "", /反斜杠/);
	assert.match(validateLatexSource("x\\  \n") ?? "", /反斜杠/);
	assert.equal(validateLatexSource(String.raw`x\\`), null);
	assert.equal(validateLatexSource(String.raw`x\,`), null);
});

test("rejects comments that would swallow delimiters after inline serialization", () => {
	for (const source of ["x % trailing comment", "x % comment\n + y", String.raw`x\\% comment`]) {
		assert.match(validateLatexSource(source) ?? "", /注释/, source);
	}
	assert.equal(validateLatexSource(String.raw`100\% + \text{\%}`), null);
});
