/**
 * Checks TeX structure and Markdown boundaries before source is wrapped in $/$$.
 * MathLive remains responsible for supported commands and mathematical parsing.
 */
export function validateLatexSource(latex: string): string | null {
	// Serialization trims outer whitespace. Validate that same representation so
	// an ending control-space cannot become a dangling backslash after trimming.
	const source = latex.trim();
	let braces = 0;
	const environments: { name: string; braces: number }[] = [];
	for (let index = 0; index < source.length;) {
		const character = source[index];
		if (character === "$" ) {
			return "这里只填写公式内容，请移除 $ 或 $$ 分隔符；美元符号请写成 \\$。";
		}
		if (character === "%") {
			// Inline serialization collapses newlines. Keeping comments could make
			// the closing Markdown delimiter, or the rest of the formula, invisible.
			return "源码暂不支持 % 注释，请先移除注释；百分号请写成 \\%。";
		}
		if (character === "{") braces++;
		if (character === "}" && --braces < 0) return "右花括号多于左花括号，请检查后保存。";
		if (character !== "\\") {
			index++;
			continue;
		}

		let end = index + 1;
		if (end === source.length) return "公式末尾的反斜杠尚未填写完整，请补全命令或删除后保存。";
		if (/[A-Za-z]/.test(source[end])) {
			while (/[A-Za-z]/.test(source[end] ?? "")) end++;
		} else end++;
		const command = source.slice(index + 1, end);
		index = end;
		if (["(", ")", "[", "]"].includes(command)) {
			return "这里只填写公式内容，请移除外层 \\(…\\) 或 \\[…\\] 数学分隔符。";
		}
		if (command !== "begin" && command !== "end") continue;

		while (/\s/.test(source[index] ?? "") && index < source.length) index++;
		if (source[index] !== "{") return "环境名称尚未填写完整，请使用 \\begin{名称} 和 \\end{名称}。";
		const closing = source.indexOf("}", index + 1);
		if (closing === -1) return "环境名称尚未填写完整，请补全后保存。";
		const name = source.slice(index + 1, closing).trim();
		if (!/^[A-Za-z][A-Za-z0-9*_-]*$/.test(name)) return "环境名称为空或格式无效，请检查后保存。";
		index = closing + 1;
		if (command === "begin") environments.push({ name, braces });
		else {
			const opening = environments.pop();
			if (opening?.name !== name) return "公式环境的开始与结束不匹配。";
			if (opening.braces !== braces) return "公式环境两端的花括号层级不一致，请检查后保存。";
		}
	}
	if (braces > 0) return "花括号尚未配对，请补全后保存。";
	if (environments.length > 0) return "公式环境尚未结束，请补全后保存。";
	return null;
}
